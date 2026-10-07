import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createChatSession,
  listChatSessions,
  getChatSession,
  updateChatSession,
  deleteChatSession,
  loadChatMessages,
  saveChatMessage,
  sendChatMessage,
  generateHealthSummary,
} from "./chatService";
import { supabase } from "@/lib/supabase";

describe("chatService - Demo Mode", () => {
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

  it("lists initial default demo sessions when storage is empty", async () => {
    const sessions = await listChatSessions("demo-user-id", true);
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0].title).toBe("General Wellness Check-in");
  });

  it("creates a new chat session in demo mode", async () => {
    const newSession = await createChatSession("demo-user-id", "Headache Inquiry", true);
    expect(newSession.id).toContain("demo-session-");
    expect(newSession.title).toBe("Headache Inquiry");
    expect(newSession.status).toBe("active");

    const allSessions = await listChatSessions("demo-user-id", true);
    expect(allSessions.some((s) => s.id === newSession.id)).toBe(true);
  });

  it("retrieves a session by id", async () => {
    const session = await getChatSession("demo-session-default", "demo-user-id", true);
    expect(session).not.toBeNull();
    expect(session?.id).toBe("demo-session-default");
  });

  it("updates session title and risk_level", async () => {
    const updated = await updateChatSession(
      "demo-session-default",
      { title: "Updated Consultation", risk_level: "Medium" },
      true
    );
    expect(updated.title).toBe("Updated Consultation");
    expect(updated.risk_level).toBe("Medium");
  });

  it("loads chat messages for a session", async () => {
    const messages = await loadChatMessages("demo-session-default", true);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].role).toBe("assistant");
  });

  it("saves a new user message and preserves metadata", async () => {
    const saved = await saveChatMessage(
      {
        session_id: "demo-session-default",
        user_id: "demo-user-id",
        role: "user",
        content: "I have had a throbbing headache for two days.",
        metadata: {
          extracted: { symptoms: ["throbbing headache"], duration: "2 days" },
        },
      },
      true
    );

    expect(saved.id).toContain("demo-msg-");
    expect(saved.content).toBe("I have had a throbbing headache for two days.");
    expect(saved.metadata?.extracted?.symptoms).toContain("throbbing headache");

    const messages = await loadChatMessages("demo-session-default", true);
    expect(messages.some((m) => m.id === saved.id)).toBe(true);
  });

  it("deletes a session and removes its messages in demo mode", async () => {
    const session = await createChatSession("demo-user-id", "To be deleted", true);
    await saveChatMessage(
      {
        session_id: session.id,
        user_id: "demo-user-id",
        role: "user",
        content: "Temporary message",
      },
      true
    );

    await deleteChatSession(session.id, true);

    const sessionsAfter = await listChatSessions("demo-user-id", true);
    expect(sessionsAfter.some((s) => s.id === session.id)).toBe(false);

    const messagesAfter = await loadChatMessages(session.id, true);
    expect(messagesAfter.length).toBe(0);
  });
});

describe("chatService - Supabase Integration (Mocked)", () => {
  it("calls supabase.from('chat_sessions').insert on createChatSession", async () => {
    const mockSession = {
      id: "supabase-session-123",
      user_id: "user-123",
      title: "Supabase Consultation",
      status: "active",
      risk_level: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const singleMock = vi.fn().mockResolvedValue({ data: mockSession, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    const fromSpy = vi.spyOn(supabase, "from").mockReturnValue({
      insert: insertMock,
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await createChatSession("user-123", "Supabase Consultation", false);
    expect(fromSpy).toHaveBeenCalledWith("chat_sessions");
    expect(result.id).toBe("supabase-session-123");

    fromSpy.mockRestore();
  });
});

describe("chatService - sendChatMessage Flow", () => {
  it("immediately intercepts chest pain emergency without calling AI", async () => {
    const response = await sendChatMessage(
      "demo-session-default",
      "demo-user-id",
      "I am having severe chest pain and cannot breathe.",
      true
    );

    expect(response.emergency).toBe(true);
    expect(response.risk_level).toBe("High");
    expect(response.reply).toContain("EMERGENCY WARNING");

    const messages = await loadChatMessages("demo-session-default", true);
    const lastMsg = messages[messages.length - 1];
    expect(lastMsg.role).toBe("assistant");
    expect(lastMsg.metadata?.emergency).toBe(true);
  });

  it("processes normal non-emergency symptom in demo mode with structured guidance", async () => {
    const response = await sendChatMessage(
      "demo-session-default",
      "demo-user-id",
      "I have noticed mild stiffness in my neck after working at my desk.",
      true
    );

    expect(response.emergency).toBe(false);
    expect(response.risk_level).toBe("Low");
    expect(response.reply).toContain("[Demo AI]");
    expect(response.suggested_replies.length).toBeGreaterThan(0);
  });

  it("rejects empty message with an error", async () => {
    await expect(
      sendChatMessage("demo-session-default", "demo-user-id", "   ", true)
    ).rejects.toThrow("Message cannot be empty");
  });

  it("sets personalized flag based on ai_profile_context consent", async () => {
    // 1. Without consent granted
    const unconsented = await sendChatMessage(
      "demo-session-default",
      "demo-user-id",
      "I have mild fatigue today.",
      true
    );
    expect(unconsented.personalized).toBe(false);

    // 2. Grant consent
    const { updateConsent } = await import("./privacyService");
    await updateConsent("demo-user-id", { consent_type: "ai_profile_context", granted: true }, true);

    const consented = await sendChatMessage(
      "demo-session-default",
      "demo-user-id",
      "I have mild fatigue today.",
      true
    );
    expect(consented.personalized).toBe(true);
    expect(consented.reply).toContain("Personalized with your health profile");
  });

  it("throws an explicit error when production chat-consult fails without falling back to fake text", async () => {
    const invokeSpy = vi.spyOn(supabase.functions, "invoke").mockResolvedValue({
      data: { error: "AI_UNAVAILABLE", message: "GEMINI_API_KEY secret is not set in Supabase." },
      error: new Error("503 Service Unavailable"),
    });

    await expect(
      sendChatMessage("test-session-id", "test-user-id", "I have persistent dizziness", false)
    ).rejects.toThrow("AI is temporarily unavailable");

    invokeSpy.mockRestore();
  });

  it("runs checkAiHealth diagnostics in demo mode", async () => {
    const { checkAiHealth } = await import("./chatService");
    const result = await checkAiHealth(true);
    expect(result.ok).toBe(true);
    expect(result.provider).toBe("demo-simulator");
    expect(result.message).toContain("Demo Mode");
  });

  it("runs checkAiHealth diagnostics in production mode via Edge Function invoke", async () => {
    const { checkAiHealth } = await import("./chatService");
    const invokeSpy = vi.spyOn(supabase.functions, "invoke").mockResolvedValue({
      data: {
        ok: true,
        provider: "gemini",
        model: "gemini-1.5-flash",
        latencyMs: 145,
        message: "Gemini connection verified successfully (145ms).",
      },
      error: null,
    });

    const result = await checkAiHealth(false);
    expect(invokeSpy).toHaveBeenCalledWith("chat-consult", {
      body: { action: "diagnose" },
    });
    expect(result.ok).toBe(true);
    expect(result.model).toBe("gemini-1.5-flash");

    invokeSpy.mockRestore();
  });
});

describe("chatService - generateHealthSummary", () => {
  it("synthesizes symptoms, lifestyle recommendations, doctor questions, and disclaimers", async () => {
    const testSession = await createChatSession("demo-user-id", "Summary Test Session", true);

    // Add assistant message with extracted symptoms to the test session
    await saveChatMessage(
      {
        session_id: testSession.id,
        user_id: "demo-user-id",
        role: "assistant",
        content: "I have recorded your symptoms.",
        metadata: {
          extracted: {
            symptoms: ["frequent migraines", "light sensitivity"],
            duration: "5 days",
            intensity: "moderate",
            lifestyle: "irregular sleep",
          },
        },
      },
      true
    );

    const summary = await generateHealthSummary(testSession.id, "demo-user-id", true);
    expect(summary.symptoms).toContain("frequent migraines");
    expect(summary.symptoms).toContain("light sensitivity");
    expect(summary.duration).toBe("5 days");
    expect(summary.intensity).toBe("moderate");
    expect(summary.lifestyle_factors).toContain("irregular sleep");
    expect(summary.recommendations.length).toBeGreaterThan(0);
    expect(summary.doctor_questions.length).toBeGreaterThan(0);
    expect(summary.disclaimer).toContain("This is not a medical diagnosis");
  });

  it("strictly filters greetings, courtesies, and intros from being saved as symptoms", async () => {
    const session = await createChatSession("demo-user-id", "Greeting Test Session", true);

    // User only sent greetings and intros
    await saveChatMessage(
      {
        session_id: session.id,
        user_id: "demo-user-id",
        role: "user",
        content: "Assalamualaikum. My name is Huzaifa Ansari.",
      },
      true
    );

    await saveChatMessage(
      {
        session_id: session.id,
        user_id: "demo-user-id",
        role: "assistant",
        content: "Walaikum Assalam! How can I help you today?",
        metadata: {
          extracted: {
            // Accidental greeting extraction from flawed AI/input
            symptoms: ["assalamualaikum", "my name is Huzaifa"],
          },
        },
      },
      true
    );

    const summary = await generateHealthSummary(session.id, "demo-user-id", true);
    expect(summary.symptoms).not.toContain("assalamualaikum");
    expect(summary.symptoms).not.toContain("my name is Huzaifa");
    expect(summary.symptoms).toContain("General wellness inquiry");
  });

  it("handles last stage of cancer empathetically with null risk level (no Low Risk badge)", async () => {
    const session = await createChatSession("demo-user-id", "New Health Consultation", true);

    const response = await sendChatMessage(
      session.id,
      "demo-user-id",
      "My relative has the last stage of cancer. What comfort care is recommended?",
      true
    );

    expect(response.emergency).toBe(true);
    expect(response.risk_level).toBeNull(); // Must NOT show Low Risk!
    expect(response.reply).toContain("palliative");
    expect(response.reply).toContain("oncology");

    const updatedSession = await getChatSession(session.id, "demo-user-id", true);
    expect(updatedSession?.title).toBe("Oncology & Palliative Care");
  });

  it("auto-updates default session title on first message in demo mode", async () => {
    const session = await createChatSession("demo-user-id", "New Health Consultation", true);

    await sendChatMessage(
      session.id,
      "demo-user-id",
      "Severe knee joint stiffness and pain",
      true
    );

    const updatedSession = await getChatSession(session.id, "demo-user-id", true);
    expect(updatedSession?.title).not.toBe("New Health Consultation");
    expect(updatedSession?.title).toContain("Consultation");
  });
});


