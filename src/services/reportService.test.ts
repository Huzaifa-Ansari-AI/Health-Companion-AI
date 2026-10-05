// Milestone 2 Phase 1 Unit Tests: reportService & buildReportData
import { describe, it, expect } from "vitest";
import {
  buildReportData,
  calculateActivityScore,
  getFallbackDoctorQuestions,
  generateVerificationCode,
} from "./reportService";
import { AssessmentRecord } from "./healthService";
import { ProfileDemographics, MANDATORY_REPORT_DISCLAIMER } from "@/types/report";

describe("reportService — buildReportData & Utilities", () => {
  const fullFormAssessment: AssessmentRecord = {
    id: "rec-form-12345",
    user_id: "user-abc-1",
    height_cm: 180,
    weight_kg: 75,
    bmi: 23.1,
    bmi_category: "Normal weight",
    symptoms: ["Mild afternoon fatigue", "Occasional headache"],
    lifestyle_data: {
      sleep_hours: 8,
      activity_level: "Moderate",
      water_liters: 2.5,
    },
    risk_level: "Low",
    ai_summary: "Your vitals indicate a healthy weight profile. Maintain consistent hydration and sleep habits.",
    recommendations: [
      "Target 7.5 to 8 hours of sleep consistently.",
      "Drink at least 2 liters of water daily.",
    ],
    disclaimer: MANDATORY_REPORT_DISCLAIMER,
    source: "assessment",
    created_at: "2026-09-30T10:00:00.000Z",
  };

  const fullProfile: ProfileDemographics = {
    full_name: "Jane Doe",
    age: 34,
    gender: "Female",
    date_of_birth: "1992-05-15",
  };

  it("builds a complete, validated report with full form-based assessment and profile", () => {
    const report = buildReportData(fullFormAssessment, fullProfile);

    // 1. Header
    expect(report.header.appName).toBe("Health Companion AI");
    expect(report.header.reportTitle).toBe("Personal Health & Wellness Summary");
    expect(report.header.reportId).toBe("HCA-REC-FORM");

    // 2. Patient details
    expect(report.patient.name).toBe("Jane Doe");
    expect(report.patient.age).toBe("34 years");
    expect(report.patient.gender).toBe("Female");
    expect(report.patient.height).toBe("180 cm");
    expect(report.patient.weight).toBe("75 kg");
    expect(report.patient.bmi).toBe("23.1");
    expect(report.patient.bmiCategory).toBe("Normal weight");

    // 3. Symptoms timeline
    expect(report.symptoms.primaryConcern).toBe("Mild afternoon fatigue");
    expect(report.symptoms.timeline.length).toBe(2);
    expect(report.symptoms.timeline[0].order).toBe(1);

    // 4. Lifestyle & Activity Score
    expect(report.lifestyle.sleepHours).toBe("8 hrs/night");
    expect(report.lifestyle.hydrationLiters).toBe("2.5 L/day");
    expect(report.lifestyle.activityScore).toBeGreaterThanOrEqual(80);
    expect(report.lifestyle.activityScoreRating).toBe("Optimal");

    // 5. Risk Assessment
    expect(report.risk.level).toBe("Low");
    expect(report.risk.disclaimer).toBe(MANDATORY_REPORT_DISCLAIMER);

    // 6. Doctor questions
    expect(report.doctorQuestions.questions.length).toBeGreaterThanOrEqual(4);

    // 7. Footer
    expect(report.footer.disclaimer).toBe(MANDATORY_REPORT_DISCLAIMER);
    expect(report.footer.verificationCode).toMatch(/^V-[A-F0-9]{4}-[A-F0-9]{4}$/);
  });

  it("safely handles missing profile demographics and nullable assessment fields with 'Not provided'", () => {
    const minimalAssessment: AssessmentRecord = {
      id: "rec-min-999",
      risk_level: "Medium",
      ai_summary: "Assessment completed without full demographic records.",
      symptoms: [],
      recommendations: ["Stay hydrated."],
      disclaimer: MANDATORY_REPORT_DISCLAIMER,
    };

    const report = buildReportData(minimalAssessment, null);

    expect(report.patient.name).toBe("Not provided");
    expect(report.patient.age).toBe("Not provided");
    expect(report.patient.gender).toBe("Not provided");
    expect(report.patient.height).toBe("Not provided");
    expect(report.patient.weight).toBe("Not provided");
    expect(report.patient.bmi).toBe("Not provided");
    expect(report.patient.bmiCategory).toBe("Not provided");

    // Defaults when symptoms are empty
    expect(report.symptoms.primaryConcern).toBe("General wellness consultation");
    expect(report.symptoms.timeline.length).toBe(1);
    expect(report.symptoms.timeline[0].symptom).toBe("No acute symptoms reported");

    // Lifestyle defaults
    expect(report.lifestyle.sleepHours).toBe("Not provided");
    expect(report.lifestyle.hydrationLiters).toBe("Not provided");
    expect(report.lifestyle.activityScoreRating).toBe("Not evaluated");

    // Disclaimer presence
    expect(report.risk.disclaimer).toBe(MANDATORY_REPORT_DISCLAIMER);
    expect(report.footer.disclaimer).toBe(MANDATORY_REPORT_DISCLAIMER);
  });

  it("builds a validated report from AI chat-consultation source with chat_summary_data", () => {
    const chatAssessment: AssessmentRecord = {
      id: "rec-chat-789",
      source: "chat",
      session_id: "session-abc-456",
      symptoms: ["Persistent dry cough", "Chest congestion"],
      risk_level: "High",
      ai_summary: "Patient reported recurring chest congestion and cough lasting over a week.",
      recommendations: [
        "Consult your physician for a respiratory evaluation.",
        "Avoid intense aerobic exertion until evaluated.",
      ],
      disclaimer: MANDATORY_REPORT_DISCLAIMER,
      chat_summary_data: {
        duration: "Over 10 days",
        intensity: "Moderate to high",
        lifestyle_factors: ["Desk worker", "Poor sleep"],
        doctor_questions: [
          "Should a chest X-ray or spirometry test be scheduled?",
          "Are these symptoms consistent with seasonal bronchitis?",
          "What symptoms should trigger immediate urgent care attendance?",
        ],
      },
    };

    const report = buildReportData(chatAssessment, { full_name: "Robert Smith" });

    expect(report.source).toBe("chat");
    expect(report.patient.name).toBe("Robert Smith");
    expect(report.symptoms.timeline[0].duration).toBe("Over 10 days");
    expect(report.symptoms.timeline[0].intensity).toBe("Moderate to high");
    expect(report.risk.level).toBe("High");
    expect(report.doctorQuestions.questions).toEqual([
      "Should a chest X-ray or spirometry test be scheduled?",
      "Are these symptoms consistent with seasonal bronchitis?",
      "What symptoms should trigger immediate urgent care attendance?",
    ]);
  });

  it("accurately computes activity scores across diverse lifestyle combinations", () => {
    // Optimal habits
    const optimal = calculateActivityScore({ sleep_hours: 8, water_liters: 2.5, activity_level: "High" });
    expect(optimal.score).toBe(100);
    expect(optimal.rating).toBe("Optimal");

    // Moderate habits
    const moderate = calculateActivityScore({ sleep_hours: 6.5, water_liters: 1.6, activity_level: "Moderate" });
    expect(moderate.score).toBeGreaterThanOrEqual(60);
    expect(moderate.rating).toBe("Moderate");

    // Low habits
    const low = calculateActivityScore({ sleep_hours: 4, water_liters: 0.8, activity_level: "Sedentary" });
    expect(low.score).toBeLessThan(60);
    expect(low.rating).toBe("Low");

    // Empty lifestyle
    const empty = calculateActivityScore({});
    expect(empty.rating).toBe("Not evaluated");
  });

  it("generates deterministic verification codes formatted as V-XXXX-XXXX", () => {
    const code1 = generateVerificationCode("rec-123", "2026-09-30T10:00:00Z");
    const code2 = generateVerificationCode("rec-123", "2026-09-30T10:00:00Z");
    const code3 = generateVerificationCode("rec-999", "2026-09-30T10:00:00Z");

    expect(code1).toMatch(/^V-[A-F0-9]{4}-[A-F0-9]{4}$/);
    expect(code1).toBe(code2); // deterministic
    expect(code1).not.toBe(code3); // unique per id
  });

  it("provides tailored doctor discussion points for Low risk vs High risk", () => {
    const lowQuestions = getFallbackDoctorQuestions("Low", ["General stiffness"]);
    expect(lowQuestions.some((q) => q.toLowerCase().includes("preventive"))).toBe(true);

    const highQuestions = getFallbackDoctorQuestions("High", ["Chest discomfort"], "Obesity");
    expect(highQuestions.some((q) => q.toLowerCase().includes("diagnostic tests") || q.toLowerCase().includes("warning signs"))).toBe(true);
    expect(highQuestions.some((q) => q.toLowerCase().includes("bmi category (obesity)"))).toBe(true);
  });
});
