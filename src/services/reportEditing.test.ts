import { describe, it, expect, beforeEach } from "vitest";
import {
  buildReportData,
  saveReportEdits,
  resetReportEdits,
  fetchReportData,
} from "./reportService";
import { generateReportPdf } from "./pdfService";
import { createShareLink } from "./shareService";
import type { AssessmentRecord } from "./healthService";
import type { ReportEditPayload } from "@/types/report";

describe("Phase 5: Doctor-Ready Editable Health Reports", () => {
  const baseAssessment: AssessmentRecord = {
    id: "test-assessment-123",
    user_id: "test-user-123",
    height_cm: 175,
    weight_kg: 70,
    bmi: 22.9,
    bmi_category: "Normal weight",
    symptoms: ["Intermittent headache", "Neck tension"],
    risk_level: "Medium",
    ai_summary: "Headaches likely related to postural tension and hydration.",
    recommendations: [
      "Take hourly ergonomics breaks.",
      "Increase water intake.",
    ],
    disclaimer: "This is not a medical diagnosis.",
    chat_summary_data: {
      duration: "3 weeks",
      intensity: "Mild to Moderate",
      doctor_questions: [
        "Could cervical spine posture contribute to tension headaches?",
        "Are routine imaging tests recommended?",
      ],
    },
    lifestyle_data: {
      sleep_hours: 6.5,
      water_liters: 1.8,
      activity_level: "Light",
    },
  };

  beforeEach(() => {
    const storage: Record<string, string> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = {
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

  describe("buildReportData with and without user edits", () => {
    it("builds an unedited report with isEdited false by default", () => {
      const report = buildReportData(baseAssessment);
      expect(report.isEdited).toBe(false);
      expect(report.symptoms.primaryConcern).toBe("Intermittent headache");
      expect(report.symptoms.timeline).toHaveLength(2);
      expect(report.recommendations.items).toHaveLength(2);
      expect(report.doctorQuestions.questions).toHaveLength(2);
    });

    it("merges custom edits and sets isEdited to true when edited_report exists", () => {
      const editedRecord: AssessmentRecord = {
        ...baseAssessment,
        chat_summary_data: {
          ...baseAssessment.chat_summary_data,
          edited_report: {
            primaryConcern: "Severe Cervical Migraine (Doctor Review)",
            timeline: [
              {
                symptom: "Severe Occipital Headache",
                duration: "6 weeks worsening",
                intensity: "7/10 throbbing",
                order: 1,
              },
            ],
            sleepHours: "5 hrs/night (disrupted)",
            hydrationLiters: "1.2 L/day",
            activityLevel: "Sedentary due to pain",
            riskReason: "Symptoms worsen specifically after 4 hours of screen work. Requesting cervical spine assessment.",
            recommendations: [
              "Physical therapy evaluation for neck posture.",
              "Track morning vs evening blood pressure.",
            ],
            doctorQuestions: [
              "Is an occipital nerve block or physical therapy indicated?",
              "Should we schedule cervical spine imaging?",
              "Could tension headaches indicate underlying dental bruxism?",
            ],
            lastEditedAt: "2026-10-07T12:00:00Z",
          } satisfies ReportEditPayload,
        },
      };

      const report = buildReportData(editedRecord);
      expect(report.isEdited).toBe(true);
      expect(report.lastEditedAt).toBe("2026-10-07T12:00:00Z");
      expect(report.symptoms.primaryConcern).toBe("Severe Cervical Migraine (Doctor Review)");
      expect(report.symptoms.timeline[0].symptom).toBe("Severe Occipital Headache");
      expect(report.lifestyle.sleepHours).toBe("5 hrs/night (disrupted)");
      expect(report.risk.reason).toContain("Requesting cervical spine assessment");
      expect(report.recommendations.items[0]).toContain("Physical therapy evaluation");
      expect(report.doctorQuestions.questions).toHaveLength(3);
    });
  });

  describe("saveReportEdits and resetReportEdits workflow", () => {
    it("saves edits to demo storage and loads updated report", async () => {
      // Seed demo storage
      localStorage.setItem("healthai_demo_assessments", JSON.stringify([baseAssessment]));

      const edits: ReportEditPayload = {
        primaryConcern: "Patient-refined concern: Bilateral tension",
        timeline: [
          {
            symptom: "Bilateral tension headache",
            duration: "1 month",
            intensity: "Moderate",
            order: 1,
          },
        ],
        sleepHours: "7.0 hrs/night",
        hydrationLiters: "2.5 L/day",
        activityLevel: "Moderate",
        riskReason: "Patient observed tension occurs primarily on weekdays.",
        recommendations: ["Maintain ergonomic workstation."],
        doctorQuestions: [
          "Could daily screen glare trigger bilateral tension?",
          "Would magnesium supplementation be appropriate?",
        ],
      };

      const updatedReport = await saveReportEdits(
        baseAssessment.id!,
        edits,
        baseAssessment.user_id!,
        true
      );

      expect(updatedReport.isEdited).toBe(true);
      expect(updatedReport.symptoms.primaryConcern).toBe("Patient-refined concern: Bilateral tension");
      expect(updatedReport.recommendations.items).toEqual(["Maintain ergonomic workstation."]);

      // Verify fetchReportData also returns the edited data
      const fetched = await fetchReportData(baseAssessment.id!, baseAssessment.user_id!, true);
      expect(fetched.isEdited).toBe(true);
      expect(fetched.symptoms.primaryConcern).toBe("Patient-refined concern: Bilateral tension");
    });

    it("resets report back to original AI assessment when requested", async () => {
      // Seed demo storage with an edited record
      const editedRecord: AssessmentRecord = {
        ...baseAssessment,
        chat_summary_data: {
          ...baseAssessment.chat_summary_data,
          edited_report: {
            primaryConcern: "Custom Edit",
            recommendations: ["Custom Rec"],
            doctorQuestions: ["Q1?", "Q2?"],
          },
        },
      };
      localStorage.setItem("healthai_demo_assessments", JSON.stringify([editedRecord]));

      const restored = await resetReportEdits(
        baseAssessment.id!,
        baseAssessment.user_id!,
        true
      );

      expect(restored.isEdited).toBe(false);
      expect(restored.symptoms.primaryConcern).toBe("Intermittent headache");
      expect(restored.recommendations.items).toEqual([
        "Take hourly ergonomics breaks.",
        "Increase water intake.",
      ]);
    });
  });

  describe("Propagation to Vector PDF and Doctor Share Links", () => {
    it("generates vector PDF bytes for edited report without throwing", async () => {
      const editedReport = buildReportData({
        ...baseAssessment,
        chat_summary_data: {
          ...baseAssessment.chat_summary_data,
          edited_report: {
            primaryConcern: "Patient-Edited Report Summary",
            riskReason: "Clarified context: Headaches started after switching monitors.",
            doctorQuestions: ["Should I see an optometrist?", "Could this be digital eye strain?"],
          },
        },
      });

      const pdfBytes = await generateReportPdf(editedReport);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(1000);
      // Valid PDF magic header
      const header = String.fromCharCode(...pdfBytes.slice(0, 5));
      expect(header).toBe("%PDF-");
    });

    it("captures the user-edited content in doctor share link snapshot", async () => {
      const editedReport = buildReportData({
        ...baseAssessment,
        chat_summary_data: {
          ...baseAssessment.chat_summary_data,
          edited_report: {
            primaryConcern: "Doctor-ready summarized complaint",
            doctorQuestions: [
              "Are prescription muscle relaxants safe for short-term use?",
              "What ergonomic chair features should I look for?",
            ],
          },
        },
      });

      const { shareItem, token } = await createShareLink(
        baseAssessment.id!,
        editedReport,
        { expiryHours: 72, hideName: false, hideChatExcerpts: false },
        baseAssessment.user_id!,
        true
      );

      expect(shareItem).toBeDefined();
      expect(token).toBeDefined();
      // Inspect saved demo snapshot
      const rawShares = localStorage.getItem("healthai_demo_shares");
      expect(rawShares).not.toBeNull();
      const shares = JSON.parse(rawShares!);
      expect(shares[0].snapshot.isEdited).toBe(true);
      expect(shares[0].snapshot.symptoms.primaryConcern).toBe("Doctor-ready summarized complaint");
      expect(shares[0].snapshot.doctorQuestions.questions[0]).toContain("muscle relaxants");
    });
  });
});
