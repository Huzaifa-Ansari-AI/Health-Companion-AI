import { describe, it, expect, beforeEach } from "vitest";
import { calculateBMI, fetchUserAssessments, saveAssessment } from "./healthService";

describe("healthService - calculateBMI", () => {
  it("calculates normal weight BMI correctly", () => {
    const { bmi, category } = calculateBMI(175, 70);
    expect(bmi).toBe(22.9);
    expect(category).toBe("Normal weight");
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

  it("saves and prepends a new assessment record in demo mode", async () => {
    const newRecord = {
      user_id: "demo-user",
      height_cm: 180,
      weight_kg: 75,
      bmi: 23.1,
      bmi_category: "Normal weight",
      symptoms: ["Occasional headache"],
      lifestyle_data: { sleep_hours: 8, activity_level: "Active", water_liters: 2.5 },
      risk_level: "Low" as const,
      ai_summary: "Healthy profile.",
      recommendations: ["Stay active."],
      disclaimer: "This is not a medical diagnosis.",
    };

    const saved = await saveAssessment(newRecord, true);
    expect(saved.id).toBeDefined();
    expect(saved.bmi).toBe(23.1);

    const history = await fetchUserAssessments("demo-user", true);
    expect(history[0].bmi).toBe(23.1);
  });
});
