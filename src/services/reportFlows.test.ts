// Milestone 2 Phase 4: End-to-End Workflow & Flow Tests
// Validates end-to-end report lifecycle: view report, missing details, PDF download, create share link, open shared page, expired link, and revocation.

import { describe, it, expect, beforeEach } from "vitest";
import { buildReportData, updateProfileDemographics, fetchReportData } from "./reportService";
import { generateReportPdf, getReportPdfFileName } from "./pdfService";
import {
  createShareLink,
  getSharedReport,
  revokeShareLink,
  fetchAssessmentShares,
} from "./shareService";
import { saveAssessment, AssessmentRecord } from "./healthService";
import { ReportData, ProfileDemographics, MANDATORY_REPORT_DISCLAIMER } from "@/types/report";

describe("Milestone 2: Key User Flows Integration", () => {
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

  const sampleAssessment: Omit<AssessmentRecord, "id" | "created_at"> = {
    user_id: "demo-user-1",
    height_cm: 172,
    weight_kg: 68,
    bmi: 23.0,
    bmi_category: "Normal weight",
    symptoms: ["Mild tension headache", "Screen fatigue"],
    lifestyle_data: {
      sleep_hours: 7.5,
      water_liters: 2.0,
      activity_level: "Moderate",
    },
    risk_level: "Low",
    ai_summary: "Vitals within optimal range. Minor headache correlates with reported screen fatigue.",
    recommendations: ["Follow 20-20-20 screen rule.", "Maintain 2L daily hydration."],
    disclaimer: MANDATORY_REPORT_DISCLAIMER,
    source: "assessment",
  };

  it("Flow 1: View Report — compiles complete 8-section report from saved assessment", async () => {
    const saved = await saveAssessment(sampleAssessment, true);
    expect(saved.id).toBeDefined();

    const report = await fetchReportData(saved.id!, "demo-user-1", true);

    // Verify all 8 core sections exist and are populated
    expect(report.header.appName).toBe("Health Companion AI");
    expect(report.header.reportTitle).toBe("Personal Health & Wellness Summary");
    expect(report.patient.height).toBe("172 cm");
    expect(report.patient.weight).toBe("68 kg");
    expect(report.patient.bmi).toBe("23");
    expect(report.symptoms.timeline.length).toBe(2);
    expect(report.lifestyle.activityScore).toBeGreaterThanOrEqual(80);
    expect(report.risk.level).toBe("Low");
    expect(report.risk.disclaimer).toBe(MANDATORY_REPORT_DISCLAIMER);
    expect(report.recommendations.items.length).toBeGreaterThanOrEqual(1);
    expect(report.doctorQuestions.questions.length).toBeGreaterThanOrEqual(4);
    expect(report.footer.disclaimer).toBe(MANDATORY_REPORT_DISCLAIMER);
  });

  it("Flow 2: Missing Details Form — captures demographics and updates report", async () => {
    const saved = await saveAssessment(sampleAssessment, true);

    // Initial report has default demo or 'Not provided'
    const initialReport = await fetchReportData(saved.id!, "demo-user-1", true);
    expect(initialReport.patient.gender).toBeDefined();

    // User fills out 'Complete Your Details' form
    const newDemographics: ProfileDemographics = {
      full_name: "Dr. Alexander Fleming",
      age: 45,
      gender: "Male",
      date_of_birth: "1981-08-06",
    };
    await updateProfileDemographics("demo-user-1", newDemographics, true);

    // Re-fetch report to verify demographic update
    const updatedReport = await fetchReportData(saved.id!, "demo-user-1", true);
    expect(updatedReport.patient.name).toBe("Dr. Alexander Fleming");
    expect(updatedReport.patient.age).toBe("45 years");
    expect(updatedReport.patient.gender).toBe("Male");
  });

  it("Flow 3: Download Vector PDF — generates valid PDF bytes with custom share link QR", async () => {
    const saved = await saveAssessment(sampleAssessment, true);
    const report = await fetchReportData(saved.id!, "demo-user-1", true);

    const shareUrl = "https://healthai.app/shared/test-token-flow";
    const pdfBytes = await generateReportPdf(report, shareUrl);

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1500);

    const fileName = getReportPdfFileName(report.header.generatedDate);
    expect(fileName).toMatch(/^HealthCompanion_Report_.*\.pdf$/);
  });

  it("Flow 4, 5, 6, 7 & 8: Full Share Lifecycle (Create, Open, Expire, Revoke)", async () => {
    const saved = await saveAssessment(sampleAssessment, true);
    const report = await fetchReportData(saved.id!, "demo-user-1", true);

    // 1. Create Share Link with Anonymization
    const { shareItem, token, shareUrl } = await createShareLink(
      saved.id!,
      report,
      { expiryHours: 72, hideName: true, hideChatExcerpts: true },
      "demo-user-1",
      true
    );

    expect(shareItem.status).toBe("active");
    expect(shareUrl).toContain(token);

    // 2. Open Shared Page via Public Token
    const sharedData = await getSharedReport(token, true);
    expect(sharedData.snapshot.patient.name).toBe("Anonymous Patient (Hidden for privacy)");
    expect(sharedData.snapshot.symptoms.primaryConcern).toBe("Mild tension headache");

    // Verify view count was incremented
    const sharesList = await fetchAssessmentShares(saved.id!, "demo-user-1", true);
    expect(sharesList[0].view_count).toBe(1);

    // 3. Revoke Link Flow
    await revokeShareLink(shareItem.id, true);

    // 4. Access Revoked Link — throws generic error (masking details)
    await expect(getSharedReport(token, true)).rejects.toThrow(
      "This health report link is invalid, expired, or has been revoked."
    );

    // 5. Expired Link Flow
    const expiredToken = "demo_token_expired_123456789";
    const pastExpiry = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    const rawDemoShares = JSON.parse(localStorage.getItem("healthai_demo_shares") || "[]");
    rawDemoShares.push({
      id: "demo-expired-share",
      user_id: "demo-user-1",
      assessment_id: saved.id!,
      token: expiredToken,
      token_hash: "hash_expired",
      snapshot: report,
      expires_at: pastExpiry,
      revoked_at: null,
      view_count: 0,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem("healthai_demo_shares", JSON.stringify(rawDemoShares));

    // Accessing expired link throws the exact same generic error
    await expect(getSharedReport(expiredToken, true)).rejects.toThrow(
      "This health report link is invalid, expired, or has been revoked."
    );
  });
});
