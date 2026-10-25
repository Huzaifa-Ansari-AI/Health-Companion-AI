import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseEdgeFunctionError,
  classifyErrorText,
  getCategoryDetails,
  AiErrorCategory,
} from "./aiErrorHelper";
import {
  isGreetingOrCourtesy,
  isSuggestionChipOrMetaQuery,
  isNonSymptomMessage,
  generateHealthSummary,
  createChatSession,
  sendChatMessage,
  checkAiHealth,
} from "./chatService";

beforeEach(() => {
  const storage: Record<string, string> = {};
  global.localStorage = {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      Object.keys(storage).forEach((k) => delete storage[k]);
    },
    length: 0,
    key: () => null,
  };
});

describe("AI Reliability & Error Categorization", () => {
  it("classifies error text and HTTP status codes into structured categories", () => {
    expect(classifyErrorText("models/gemini-1.5-flash is not found", 404)).toBe("model_not_found");
    expect(classifyErrorText("Resource has been exhausted (e.g. check quota)", 429)).toBe("rate_limited");
    expect(classifyErrorText("API_KEY_INVALID", 400)).toBe("auth_invalid");
    expect(classifyErrorText("Unauthorized", 401)).toBe("auth_invalid");
    expect(classifyErrorText("Signal timed out", 504)).toBe("timeout");
    expect(classifyErrorText("AbortError: operation timed out")).toBe("timeout");
    expect(classifyErrorText("GEMINI_API_KEY is not configured in Supabase Edge Function secrets")).toBe("key_missing");
    expect(classifyErrorText("The model is overloaded. Please try again later.", 503)).toBe("upstream_unavailable");
    expect(classifyErrorText("invalid argument passed", 400)).toBe("bad_request");
    expect(classifyErrorText("Unknown unexpected panic", 500)).toBe("upstream_unavailable");
  });

  it("returns appropriate user-facing messages and specific resolutions per category", () => {
    const keyMissing = getCategoryDetails("key_missing");
    expect(keyMissing.resolution).toContain("add secret GEMINI_API_KEY");

    const modelNotFound = getCategoryDetails("model_not_found", "gemini-1.5-flash");
    expect(modelNotFound.userMessage).toContain("gemini-1.5-flash");
    expect(modelNotFound.resolution).toContain("update GEMINI_MODEL");

    const rateLimited = getCategoryDetails("rate_limited", undefined, 30);
    expect(rateLimited.userMessage).toContain("30 seconds");
    expect(rateLimited.resolution).toContain("quota");

    const timeout = getCategoryDetails("timeout");
    expect(timeout.userMessage).toContain("timed out");
    expect(timeout.resolution).toContain("GEMINI_FALLBACK_MODEL");

    const upstream = getCategoryDetails("upstream_unavailable");
    expect(upstream.userMessage).toContain("overloaded or unavailable");
  });

  it("unpacks FunctionsHttpError response body from error.context", async () => {
    const mockResponsePayload = {
      category: "model_not_found" as AiErrorCategory,
      message: "Model gemini-2.0-flash is retired",
      details: "404 Not Found",
      model: "gemini-2.0-flash",
    };

    const mockResponse = new Response(JSON.stringify(mockResponsePayload), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });

    const mockFunctionsError = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: mockResponse,
    };

    const parsed = await parseEdgeFunctionError(mockFunctionsError);
    expect(parsed.category).toBe("model_not_found");
    expect(parsed.model).toBe("gemini-2.0-flash");
    expect(parsed.userMessage).toContain("gemini-2.0-flash");
    expect(parsed.resolution).toContain("GEMINI_MODEL");
    // Ensure the generic "non-2xx" message was replaced
    expect(parsed.userMessage).not.toContain("non-2xx");
  });

  it("unpacks rate-limited error with retry_after from error.context", async () => {
    const mockPayload = {
      category: "rate_limited" as AiErrorCategory,
      message: "Resource exhausted",
      retry_after: 25,
    };

    const mockResponse = new Response(JSON.stringify(mockPayload), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });

    const mockError = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: mockResponse,
    };

    const parsed = await parseEdgeFunctionError(mockError);
    expect(parsed.category).toBe("rate_limited");
    expect(parsed.retry_after).toBe(25);
    expect(parsed.userMessage).toContain("25 seconds");
  });
});

describe("Symptom & Suggestion Chip Filtering", () => {
  it("strictly filters greetings, courtesies, and intros", () => {
    expect(isGreetingOrCourtesy("hi")).toBe(true);
    expect(isGreetingOrCourtesy("hello")).toBe(true);
    expect(isGreetingOrCourtesy("assalam o alaikum")).toBe(true);
    expect(isGreetingOrCourtesy("my name is Huzaifa")).toBe(true);
    expect(isGreetingOrCourtesy("thank you very much")).toBe(true);
    expect(isGreetingOrCourtesy("how are you")).toBe(true);
  });

  it("strictly identifies suggestion chips and meta queries as non-symptoms", () => {
    expect(isSuggestionChipOrMetaQuery("Check a symptom")).toBe(true);
    expect(isSuggestionChipOrMetaQuery("Advice on sleep")).toBe(true);
    expect(isSuggestionChipOrMetaQuery("Help with stress")).toBe(true);
    expect(isSuggestionChipOrMetaQuery("A bit of both")).toBe(true);
    expect(isSuggestionChipOrMetaQuery("I want advice on sleep or stress")).toBe(true);
    expect(isSuggestionChipOrMetaQuery("Frequent headaches")).toBe(true);
    expect(isSuggestionChipOrMetaQuery("Sleep issues")).toBe(true);
    expect(isSuggestionChipOrMetaQuery("Digestive problems")).toBe(true);
    expect(isSuggestionChipOrMetaQuery("who are you")).toBe(true);
    expect(isSuggestionChipOrMetaQuery("what is my name")).toBe(true);
    expect(isSuggestionChipOrMetaQuery("tell me about yourself and your features")).toBe(true);

    expect(isNonSymptomMessage("I want advice on sleep or stress")).toBe(true);
    expect(isNonSymptomMessage("who are you")).toBe(true);
    expect(isNonSymptomMessage("hi")).toBe(true);
  });

  it("recognizes genuine physical health complaints as symptoms", () => {
    expect(isNonSymptomMessage("I have had a throbbing migraine for 3 days")).toBe(false);
    expect(isNonSymptomMessage("Persistent dry cough with mild fever")).toBe(false);
    expect(isNonSymptomMessage("Sharp lower back pain after lifting weights")).toBe(false);
  });
});

describe("Health Assessment Summary - Not Enough Information State", () => {
  it("returns has_sufficient_info: false and null risk_level when only chips or greetings were sent", async () => {
    const session = await createChatSession("demo-user", "Greeting Consultation", true);
    await sendChatMessage(session.id, "demo-user", "assalam o alaikum", true);
    await sendChatMessage(session.id, "demo-user", "who are you", true);
    await sendChatMessage(session.id, "demo-user", "I want advice on sleep or stress", true);

    const summary = await generateHealthSummary(session.id, "demo-user", true);

    expect(summary.has_sufficient_info).toBe(false);
    expect(summary.symptoms).toEqual([]);
    expect(summary.risk_level).toBeNull();
    expect(summary.summary).toContain("Tell the AI more about your symptoms to generate a summary");
  });

  it("extracts genuine symptoms and sets has_sufficient_info: true when real symptoms are discussed", async () => {
    const session = await createChatSession("demo-user", "Headache Session", true);
    await sendChatMessage(
      session.id,
      "demo-user",
      "I have had a severe throbbing headache with sensitivity to light for 2 days",
      true
    );

    const summary = await generateHealthSummary(session.id, "demo-user", true);

    expect(summary.has_sufficient_info).toBe(true);
    expect(summary.symptoms.length).toBeGreaterThan(0);
    expect(summary.risk_level).not.toBeNull();
    expect(summary.disclaimer).toContain("This is not a medical diagnosis");
  });
});
