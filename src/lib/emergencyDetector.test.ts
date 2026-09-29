import { describe, it, expect } from "vitest";
import { detectEmergency, EMERGENCY_DISCLAIMER_MESSAGE } from "./emergencyDetector";

describe("emergencyDetector - Medical Safety Guardrails", () => {
  it("detects acute chest pain as an emergency", () => {
    const result = detectEmergency("I have been having sharp chest pain since morning.");
    expect(result.isEmergency).toBe(true);
    expect(result.matchedCategory).toBe("Chest Pain / Cardiac Crisis");
    expect(result.emergencyAdvice).toBe(EMERGENCY_DISCLAIMER_MESSAGE);
  });

  it("detects elephant on chest phrasing", () => {
    const result = detectEmergency("It feels like an elephant is sitting on my chest.");
    expect(result.isEmergency).toBe(true);
    expect(result.matchedCategory).toBe("Chest Pain / Cardiac Crisis");
  });

  it("detects severe respiratory distress", () => {
    const result = detectEmergency("Help, I can't breathe and I am gasping for air.");
    expect(result.isEmergency).toBe(true);
    expect(result.matchedCategory).toBe("Severe Respiratory Distress");
  });

  it("detects stroke warning signs (facial droop / slurred speech)", () => {
    const result = detectEmergency("My mom suddenly has facial drooping and slurred speech.");
    expect(result.isEmergency).toBe(true);
    expect(result.matchedCategory).toBe("Stroke Symptoms (F.A.S.T.)");
  });

  it("detects severe bleeding and vomiting blood", () => {
    const result = detectEmergency("The patient is coughing up blood and the bleeding won't stop.");
    expect(result.isEmergency).toBe(true);
    expect(result.matchedCategory).toBe("Severe Bleeding / Hemorrhage");
  });

  it("detects syncope / blacking out", () => {
    const result = detectEmergency("I passed out for a few minutes while walking downstairs.");
    expect(result.isEmergency).toBe(true);
    expect(result.matchedCategory).toBe("Loss of Consciousness / Syncope");
  });

  it("detects sudden thunderclap headache", () => {
    const result = detectEmergency("This is the worst headache of my life, it came on instantly.");
    expect(result.isEmergency).toBe(true);
    expect(result.matchedCategory).toBe("Sudden Thunderclap Headache");
  });

  it("detects crisis, self-harm, and suicidal thoughts", () => {
    const result = detectEmergency("I want to end my life, I cannot take this anymore.");
    expect(result.isEmergency).toBe(true);
    expect(result.matchedCategory).toBe("Crisis / Self-Harm / Overdose");
  });

  it("detects overdose emergencies", () => {
    const result = detectEmergency("I took an overdose of sleeping pills.");
    expect(result.isEmergency).toBe(true);
    expect(result.matchedCategory).toBe("Crisis / Self-Harm / Overdose");
  });

  it("detects anaphylaxis and throat swelling", () => {
    const result = detectEmergency("My throat is closing and my lips are swelling after eating peanuts.");
    expect(result.isEmergency).toBe(true);
    expect(result.matchedCategory).toBe("Severe Allergic Reaction (Anaphylaxis)");
  });

  it("properly respects direct negation like 'no chest pain'", () => {
    const result = detectEmergency("I have a mild fever and cough, but no chest pain.");
    expect(result.isEmergency).toBe(false);
  });

  it("properly respects negation like 'without chest pressure'", () => {
    const result = detectEmergency("Experiencing fatigue without chest tightness or shortness of breath.");
    expect(result.isEmergency).toBe(false);
  });

  it("does not let a previous negation cancel an emergency in a subsequent clause", () => {
    const result = detectEmergency("I have no nausea, but severe chest pain.");
    expect(result.isEmergency).toBe(true);
    expect(result.matchedCategory).toBe("Chest Pain / Cardiac Crisis");
  });

  it("returns isEmergency: false for typical non-emergency symptoms", () => {
    const result1 = detectEmergency("I feel tired after working late.");
    expect(result1.isEmergency).toBe(false);

    const result2 = detectEmergency("I have had a mild runny nose and sneezing for two days.");
    expect(result2.isEmergency).toBe(false);

    const result3 = detectEmergency("My digestion feels a bit off after dinner.");
    expect(result3.isEmergency).toBe(false);
  });

  it("handles empty or whitespace inputs gracefully", () => {
    expect(detectEmergency("").isEmergency).toBe(false);
    expect(detectEmergency("   ").isEmergency).toBe(false);
  });
});
