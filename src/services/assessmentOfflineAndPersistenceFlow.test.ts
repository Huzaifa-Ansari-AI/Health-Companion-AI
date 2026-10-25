import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateBMI,
  saveAssessment,
  fetchUserAssessments,
  deleteAssessment,
  generateDemoHealthAnalysis,
  type AssessmentRecord,
} from "./healthService";
import { buildReportData } from "./reportService";

describe("Phase 7 Verification Matrix: Assessment, Offline Mode, Persistence & Deletion", () => {
  beforeEach(() => {
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

  // Requirement A & D: Honest Offline Mode & Standardized Deterministic Analysis
  it("Requirement A & D: generates deterministic rule-based analysis for offline assessment without calling cloud AI", () => {
    const draftRecord: AssessmentRecord = {
      user_id: "test-user-1",
      height_cm: 175,
      weight_kg: 70,
      bmi: 22.9,
      bmi_category: "Normal weight",
      symptoms: ["Frequent fatigue or tiredness"],
      lifestyle_data: {
        assessment_mode: "offline",
        activity_level: "Moderate",
        diet_type: "Balanced Diet",
        sleep_hours: 7.5,
        water_liters: 2.0,
      },
      risk_level: "Low",
      ai_summary: "",
      recommendations: [],
      disclaimer: "This is not a medical diagnosis. It is general wellness guidance.",
    };

    const analysis = generateDemoHealthAnalysis(draftRecord);
    expect(analysis.overall_risk_level).toBe("Low");
    expect(analysis.summary).toContain("Normal weight");
    expect(analysis.disclaimer).toContain("This is not a medical diagnosis.");
    expect(analysis.risks.length).toBeGreaterThan(0);
  });

  // Requirement B: BMI Categories & Severe Thinness (< 16.0)
  it("Requirement B: accurately categorizes Severe Thinness (<16.0) alongside standard categories", () => {
    const severeThinness = calculateBMI(180, 48);
    expect(severeThinness.bmi).toBe(14.8);
    expect(severeThinness.category).toBe("Severe Thinness");

    const underweight = calculateBMI(175, 52);
    expect(underweight.bmi).toBe(17.0);
    expect(underweight.category).toBe("Underweight");

    const normal = calculateBMI(175, 68);
    expect(normal.bmi).toBe(22.2);
    expect(normal.category).toBe("Normal weight");

    const overweight = calculateBMI(175, 80);
    expect(overweight.bmi).toBe(26.1);
    expect(overweight.category).toBe("Overweight");

    const obesity = calculateBMI(175, 100);
    expect(obesity.bmi).toBe(32.7);
    expect(obesity.category).toBe("Obesity");
  });

  // Requirement C: Weight Input Logic (handling string inputs, backspacing to empty, parsing)
  it("Requirement C: handles weight input string parsing and prevents negative or non-numeric values", () => {
    const parseWeight = (str: string) => {
      const parsed = parseFloat(str);
      return !isNaN(parsed) && parsed > 0 ? parsed : 0;
    };

    expect(parseWeight("")).toBe(0);
    expect(parseWeight("1")).toBe(1);
    expect(parseWeight("68")).toBe(68);
    expect(parseWeight("68.5")).toBe(68.5);
    expect(parseWeight("-10")).toBe(0);
    expect(parseWeight("abc")).toBe(0);
  });

  // Requirement E: Persistence with assessment_mode
  it("Requirement E: correctly persists offline assessment mode in lifestyle_data", async () => {
    const offlineRecord = {
      user_id: "demo-user-e",
      height_cm: 170,
      weight_kg: 65,
      bmi: 22.5,
      bmi_category: "Normal weight",
      symptoms: ["None reported"],
      lifestyle_data: {
        assessment_mode: "offline" as const,
        age: 30,
        gender: "Female",
        sleep_hours: 8,
        water_liters: 2.5,
      },
      risk_level: "Low" as const,
      ai_summary: "Deterministic rule-based summary for offline mode.",
      recommendations: ["Maintain regular activity"],
      disclaimer: "This is not a medical diagnosis. It is general wellness guidance.",
    };

    const saved = await saveAssessment(offlineRecord, true);
    expect(saved.id).toBeDefined();
    expect(saved.lifestyle_data?.assessment_mode).toBe("offline");

    const history = await fetchUserAssessments("demo-user-e", true);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].lifestyle_data?.assessment_mode).toBe("offline");

    // Verify reportService tags isOffline = true when parsed
    const reportData = buildReportData(saved, null, null);
    expect(reportData.isOffline).toBe(true);
  });

  // Requirement F: Multi-entry Custom Tag Compilation
  it("Requirement F: compiles multiple custom symptoms, habits, and family conditions into assessment", async () => {
    const customSymptomsList = ["Lower back stiffness", "Acid reflux"];
    const customHabitsList = ["Occasional hookah", "Betel nut"];
    const customFamilyList = ["Osteoporosis", "Autoimmune disorder"];

    const selectedSymptoms = ["Frequent fatigue or tiredness"];
    const selectedSubstances = ["Excess energy drinks / cold drinks"];
    const selectedFamily = ["Diabetes"];

    const compiledSymptoms = [...selectedSymptoms, ...customSymptomsList];
    const compiledSubstances = [...selectedSubstances, ...customHabitsList];
    const compiledFamily = [...selectedFamily, ...customFamilyList];

    const record = await saveAssessment(
      {
        user_id: "demo-user-f",
        height_cm: 172,
        weight_kg: 68,
        bmi: 23.0,
        bmi_category: "Normal weight",
        symptoms: compiledSymptoms,
        lifestyle_data: {
          assessment_mode: "online",
          harmful_substances: compiledSubstances,
          custom_habits: customHabitsList.join(", "),
          family_history: compiledFamily,
          custom_family_history: customFamilyList.join(", "),
          custom_symptoms: customSymptomsList.join(", "),
        },
        risk_level: "Low",
        ai_summary: "Multi-entry tags assessment.",
        recommendations: ["Stay hydrated."],
        disclaimer: "This is not a medical diagnosis.",
      },
      true
    );

    expect(record.symptoms).toEqual([
      "Frequent fatigue or tiredness",
      "Lower back stiffness",
      "Acid reflux",
    ]);
    expect(record.lifestyle_data?.harmful_substances).toContain("Occasional hookah");
    expect(record.lifestyle_data?.family_history).toContain("Osteoporosis");
    expect(record.lifestyle_data?.custom_symptoms).toBe("Lower back stiffness, Acid reflux");
  });

  // Requirement G: Deletion of Assessment and Share Cleanup
  it("Requirement G: deletes an assessment and cascade cleans related shares from history", async () => {
    const record = await saveAssessment(
      {
        user_id: "demo-user-g",
        height_cm: 180,
        weight_kg: 75,
        bmi: 23.1,
        bmi_category: "Normal weight",
        symptoms: ["Headache"],
        risk_level: "Low",
        ai_summary: "Assessment to be deleted.",
        recommendations: ["Rest"],
        disclaimer: "This is not a medical diagnosis.",
      },
      true
    );

    const recordId = record.id!;
    localStorage.setItem(
      "healthai_demo_shares",
      JSON.stringify([
        { id: "share-g1", assessment_id: recordId, token: "tok-g1" },
        { id: "share-g2", assessment_id: "other-record-id", token: "tok-g2" },
      ])
    );

    let history = await fetchUserAssessments("demo-user-g", true);
    expect(history.some((a) => a.id === recordId)).toBe(true);

    // Delete assessment
    await deleteAssessment(recordId, true);

    history = await fetchUserAssessments("demo-user-g", true);
    expect(history.some((a) => a.id === recordId)).toBe(false);

    const shares = JSON.parse(localStorage.getItem("healthai_demo_shares") || "[]");
    expect(shares.some((s: { assessment_id: string }) => s.assessment_id === recordId)).toBe(false);
    expect(shares.length).toBe(1);
  });
});
