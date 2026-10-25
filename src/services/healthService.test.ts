import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateBMI,
  fetchUserAssessments,
  saveAssessment,
  saveChatAssessment,
  deleteAssessment,
  feetInchesToCm,
  cmToFeetInches,
  lbsToKg,
  kgToLbs,
} from "./healthService";

describe("healthService - converters", () => {
  it("converts feet and inches to cm accurately", () => {
    expect(feetInchesToCm(5, 7)).toBe(170.2);
    expect(feetInchesToCm(6, 0)).toBe(182.9);
    expect(feetInchesToCm(5, 0)).toBe(152.4);
    expect(feetInchesToCm(0, 0)).toBe(0);
  });

  it("converts cm to approximate feet and inches", () => {
    const res1 = cmToFeetInches(170.2);
    expect(res1.feet).toBe(5);
    expect(res1.inches).toBe(7);

    const res2 = cmToFeetInches(183);
    expect(res2.feet).toBe(6);
    expect(res2.inches).toBe(0);
  });

  it("converts lbs to kg and kg to lbs accurately", () => {
    expect(lbsToKg(150)).toBe(68.0);
    expect(lbsToKg(0)).toBe(0);
    expect(kgToLbs(68)).toBe(149.9);
    expect(kgToLbs(0)).toBe(0);
  });
});

describe("healthService - calculateBMI", () => {
  it("calculates normal weight BMI correctly", () => {
    const { bmi, category } = calculateBMI(175, 70);
    expect(bmi).toBe(22.9);
    expect(category).toBe("Normal weight");
  });

  it("calculates severe thinness BMI (< 16.0) correctly", () => {
    const { bmi, category } = calculateBMI(180, 48);
    expect(bmi).toBe(14.8);
    expect(category).toBe("Severe Thinness");
  });

  it("handles boundary between severe thinness (< 16.0) and underweight (16.0 - 18.4)", () => {
    // 48.7 kg at 175 cm gives bmi 15.9 -> Severe Thinness
    const severe = calculateBMI(175, 48.7);
    expect(severe.bmi).toBe(15.9);
    expect(severe.category).toBe("Severe Thinness");

    // 49.0 kg at 175 cm gives bmi 16.0 -> Underweight
    const underweight = calculateBMI(175, 49.0);
    expect(underweight.bmi).toBe(16.0);
    expect(underweight.category).toBe("Underweight");
  });

  it("calculates underweight BMI correctly", () => {
    const { bmi, category } = calculateBMI(180, 55);
    expect(bmi).toBe(17.0);
    expect(category).toBe("Underweight");
  });

  it("calculates overweight BMI correctly", () => {
    const { bmi, category } = calculateBMI(170, 80);
    expect(bmi).toBe(27.7);
    expect(category).toBe("Overweight");
  });

  it("calculates obesity BMI correctly", () => {
    const { bmi, category } = calculateBMI(170, 95);
    expect(bmi).toBe(32.9);
    expect(category).toBe("Obesity");
  });

  it("handles invalid or zero inputs gracefully", () => {
    const invalidZero = calculateBMI(0, 70);
    expect(invalidZero.bmi).toBe(0);
    expect(invalidZero.category).toBe("Unknown");

    const invalidNegative = calculateBMI(175, -5);
    expect(invalidNegative.bmi).toBe(0);
    expect(invalidNegative.category).toBe("Unknown");
  });
});

describe("healthService - Demo Assessments Persistence", () => {
  beforeEach(() => {
    // Clear demo storage before tests
    const storage: Record<string, string> = {};
    global.localStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => { storage[key] = value; },
      removeItem: (key: string) => { delete storage[key]; },
      clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
      length: 0,
      key: () => null,
    };
  });

  it("returns default initial records when storage is empty", async () => {
    const records = await fetchUserAssessments("demo-user", true);
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
    expect(records[0].bmi).toBe(22.9);
  });

  it("saves and prepends a new assessment record in demo mode with expanded lifestyle data", async () => {
    const newRecord = {
      user_id: "demo-user",
      height_cm: 170.2,
      weight_kg: 68,
      bmi: 23.5,
      bmi_category: "Normal weight",
      symptoms: ["Recurring headaches", "Sleep problems / insomnia"],
      lifestyle_data: {
        age: 28,
        gender: "Female",
        height_feet: 5,
        height_inches: 7,
        weight_unit: "kg" as const,
        input_weight: 68,
        sleep_hours: 6.5,
        activity_level: "Moderate",
        water_liters: 2.0,
        diet_type: "Balanced Diet",
        smoking: false,
        harmful_substances: ["Excess energy drinks / cold drinks"],
        alcohol: false,
        family_history: ["Diabetes", "Hypertension (High BP)"],
      },
      risk_level: "Low" as const,
      ai_summary: "Healthy profile with mild sleep and caffeine flags.",
      recommendations: ["Maintain regular sleep habits."],
      disclaimer: "This is not a medical diagnosis.",
    };

    const saved = await saveAssessment(newRecord, true);
    expect(saved.id).toBeDefined();
    expect(saved.bmi).toBe(23.5);
    expect(saved.lifestyle_data?.height_feet).toBe(5);
    expect(saved.lifestyle_data?.family_history).toContain("Diabetes");

    const history = await fetchUserAssessments("demo-user", true);
    expect(history[0].bmi).toBe(23.5);
    expect(history[0].lifestyle_data?.harmful_substances).toContain("Excess energy drinks / cold drinks");
  });

  it("saves an offline assessment with assessment_mode: 'offline' in lifestyle_data", async () => {
    const offlineRecord = {
      user_id: "demo-user",
      height_cm: 175,
      weight_kg: 70,
      bmi: 22.9,
      bmi_category: "Normal weight",
      symptoms: ["Occasional fatigue"],
      lifestyle_data: {
        assessment_mode: "offline" as const,
        sleep_hours: 7,
        water_liters: 2,
      },
      risk_level: "Low" as const,
      ai_summary: "Deterministic rule-based summary.",
      recommendations: ["Maintain hydration."],
      disclaimer: "This is not a medical diagnosis.",
    };

    const saved = await saveAssessment(offlineRecord, true);
    expect(saved.lifestyle_data?.assessment_mode).toBe("offline");
  });

  it("saves a chat-based consultation summary with source: 'chat'", async () => {
    const summary = {
      symptoms: ["Tension headache", "Eye strain"],
      duration: "3 days",
      intensity: "Moderate",
      lifestyle_factors: ["High screen time"],
      risk_level: "Medium" as const,
      summary: "Tension headache potentially related to screen exposure.",
      recommendations: ["Take hourly breaks", "Consult your physician if symptoms worsen"],
      doctor_questions: ["Could this be migraine-related?"],
      disclaimer: "This is not a medical diagnosis.",
    };

    const saved = await saveChatAssessment(summary, "test-session-999", "demo-user", true);
    expect(saved.source).toBe("chat");
    expect(saved.session_id).toBe("test-session-999");
    expect(saved.risk_level).toBe("Medium");
    expect(saved.symptoms).toContain("Tension headache");

    // Attempt saving duplicate session - should return the already saved record without adding another
    const duplicate = await saveChatAssessment(summary, "test-session-999", "demo-user", true);
    expect(duplicate.id).toBe(saved.id);

    const history = await fetchUserAssessments("demo-user", true);
    const sessionRecords = history.filter((h) => h.session_id === "test-session-999");
    expect(sessionRecords.length).toBe(1); // Exactly 1 record
  });

  it("deletes an assessment by ID and cascades cleanup to demo shares", async () => {
    // 1. Create and save an assessment in demo mode
    const record = await saveAssessment(
      {
        user_id: "demo-user",
        height_cm: 180,
        weight_kg: 75,
        bmi: 23.1,
        bmi_category: "Normal weight",
        symptoms: ["Fatigue"],
        risk_level: "Low",
        ai_summary: "Test summary",
        recommendations: ["Rest"],
        disclaimer: "This is not a medical diagnosis.",
      },
      true
    );

    expect(record.id).toBeDefined();
    const id = record.id!;

    // 2. Set mock demo share records
    localStorage.setItem(
      "healthai_demo_shares",
      JSON.stringify([
        { id: "share-1", assessment_id: id, token: "tok1" },
        { id: "share-2", assessment_id: "other-id", token: "tok2" },
      ])
    );

    // Verify it exists in history
    let history = await fetchUserAssessments("demo-user", true);
    expect(history.some((h) => h.id === id)).toBe(true);

    // 3. Delete the assessment
    await deleteAssessment(id, true);

    // 4. Verify assessment is removed from history
    history = await fetchUserAssessments("demo-user", true);
    expect(history.some((h) => h.id === id)).toBe(false);

    // 5. Verify demo shares associated with the assessment are cleaned up
    const shares = JSON.parse(localStorage.getItem("healthai_demo_shares") || "[]");
    expect(shares.length).toBe(1);
    expect(shares[0].assessment_id).toBe("other-id");
  });

  it("throws error if deleteAssessment is called with empty ID", async () => {
    await expect(deleteAssessment("", true)).rejects.toThrow("Assessment ID is required for deletion.");
  });
});
