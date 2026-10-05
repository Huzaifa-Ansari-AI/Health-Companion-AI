import { describe, it, expect } from "vitest";
import { validateAndNormalizeOutput, SAFE_FALLBACK_OUTPUT } from "./aiValidation";

describe("aiValidation - Strict LLM Output Schema Enforcement", () => {
  it("accepts a perfectly formatted LLM JSON response", () => {
    const raw = {
      reply: "It sounds like you may be experiencing tension headaches from screen time.",
      risk_level: "Medium",
      emergency: false,
      suggested_replies: ["Take a screen break", "Check hydration", "Speak with a doctor"],
      extracted: {
        symptoms: ["headache", "eye strain"],
        duration: "3 days",
        intensity: "mild to moderate",
        lifestyle: "8 hours daily screen time",
      },
    };

    const validated = validateAndNormalizeOutput(raw);
    expect(validated).not.toBeNull();
    expect(validated?.reply).toBe(raw.reply);
    expect(validated?.risk_level).toBe("Medium");
    expect(validated?.suggested_replies.length).toBe(3);
    expect(validated?.extracted.symptoms).toEqual(["headache", "eye strain"]);
  });

  it("limits suggested_replies to a maximum of 4", () => {
    const raw = {
      reply: "Here are some options.",
      risk_level: "Low",
      emergency: false,
      suggested_replies: ["Option 1", "Option 2", "Option 3", "Option 4", "Option 5", "Option 6"],
    };

    const validated = validateAndNormalizeOutput(raw);
    expect(validated?.suggested_replies.length).toBe(4);
  });

  it("rejects invalid risk levels like numeric probabilities or invented labels", () => {
    const rawWithNumericRisk = {
      reply: "Your symptoms look manageable.",
      risk_level: "75%", // Invalid!
      emergency: false,
      suggested_replies: [],
    };

    const validated = validateAndNormalizeOutput(rawWithNumericRisk);
    expect(validated?.risk_level).toBeNull();
  });

  it("returns null if reply is missing or empty", () => {
    expect(validateAndNormalizeOutput({})).toBeNull();
    expect(validateAndNormalizeOutput({ reply: "" })).toBeNull();
    expect(validateAndNormalizeOutput({ reply: "   " })).toBeNull();
    expect(validateAndNormalizeOutput(null)).toBeNull();
    expect(validateAndNormalizeOutput("a string")).toBeNull();
  });

  it("provides safe fallback constants with disclaimers", () => {
    expect(SAFE_FALLBACK_OUTPUT.risk_level).toBe("Low");
    expect(SAFE_FALLBACK_OUTPUT.emergency).toBe(false);
    expect(SAFE_FALLBACK_OUTPUT.reply).toContain("Thank you for sharing your symptoms");
  });
});
