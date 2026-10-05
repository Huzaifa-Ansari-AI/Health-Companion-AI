// Milestone 2 Phase 3 Unit Tests: shareService & Secure Shareable Links
import { describe, it, expect, beforeEach } from "vitest";
import {
  hashToken,
  determineShareStatus,
  createShareLink,
  getSharedReport,
  revokeShareLink,
  fetchAssessmentShares,
} from "./shareService";
import { ReportData } from "@/types/report";

describe("shareService — Cryptographic Tokens & Expiring Share Links", () => {
  const baseReport: ReportData = {
    id: "rec-share-test",
    source: "assessment",
    header: {
      appName: "Health Companion AI",
      reportTitle: "Personal Health & Wellness Summary",
      generatedDate: "October 4, 2026",
      reportId: "HCA-REC-SHAR",
    },
    patient: {
      name: "Elizabeth Bennet",
      age: "28 years",
      gender: "Female",
      height: "165 cm",
      weight: "58 kg",
      bmi: "21.3",
      bmiCategory: "Normal weight",
    },
    symptoms: {
      primaryConcern: "Seasonal allergies",
      timeline: [
        {
          symptom: "Sneezing and itchy eyes",
          duration: "3 days",
          intensity: "Mild",
          order: 1,
        },
      ],
    },
    lifestyle: {
      sleepHours: "8 hrs/night",
      hydrationLiters: "2 L/day",
      activityLevel: "Moderate",
      activityScore: 85,
      activityScoreRating: "Optimal",
    },
    risk: {
      level: "Low",
      reason: "Mild seasonal allergic symptoms with normal vitals.",
      disclaimer: "This is not a medical diagnosis.",
    },
    recommendations: {
      items: ["Rinse eyes with saline solution.", "Stay hydrated."],
    },
    doctorQuestions: {
      questions: ["Are non-drowsy antihistamines appropriate for seasonal symptoms?"],
    },
    footer: {
      disclaimer: "This is not a medical diagnosis.",
      reportId: "HCA-REC-SHAR",
      verificationCode: "V-9876-5432",
    },
  };

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

  it("computes deterministic SHA-256 64-char hex hashes", async () => {
    const token = "super_secret_token_1234567890abcdef1234567890abcdef";
    const hash1 = await hashToken(token);
    const hash2 = await hashToken(token);
    const hash3 = await hashToken("different_token");

    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it("correctly evaluates active, expired, and revoked share statuses", () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const now = new Date().toISOString();

    expect(determineShareStatus(futureDate, null)).toBe("active");
    expect(determineShareStatus(pastDate, null)).toBe("expired");
    expect(determineShareStatus(futureDate, now)).toBe("revoked");
    expect(determineShareStatus(pastDate, now)).toBe("revoked");
  });

  it("creates share link with immutable snapshot and respects privacy toggles", async () => {
    const { shareItem, token, shareUrl } = await createShareLink(
      "assessment-123",
      baseReport,
      { expiryHours: 72, hideName: true, hideChatExcerpts: true },
      "user-456",
      true // demo mode
    );

    expect(shareItem.status).toBe("active");
    expect(token).toBeDefined();
    expect(shareUrl).toContain(token);

    // Retrieve shared report by token
    const shared = await getSharedReport(token, true);

    // Verify patient name was anonymized
    expect(shared.snapshot.patient.name).toBe("Anonymous Patient (Hidden for privacy)");

    // Verify snapshot immutability: mutating baseReport does not affect shared snapshot
    baseReport.patient.name = "Tampered Name";
    const reFetched = await getSharedReport(token, true);
    expect(reFetched.snapshot.patient.name).toBe("Anonymous Patient (Hidden for privacy)");
  });

  it("masks all failures (not found, expired, revoked) with the identical generic error message", async () => {
    const GENERIC_ERROR = "This health report link is invalid, expired, or has been revoked.";

    // 1. Nonexistent token
    await expect(getSharedReport("nonexistent_random_token", true)).rejects.toThrow(GENERIC_ERROR);

    // 2. Created then revoked token
    const { token, shareItem } = await createShareLink(
      "assessment-123",
      baseReport,
      { expiryHours: 24, hideName: false, hideChatExcerpts: false },
      "user-456",
      true
    );

    // Initially accessible
    const activeResult = await getSharedReport(token, true);
    expect(activeResult.snapshot.id).toBe("rec-share-test");

    // Revoke link
    await revokeShareLink(shareItem.id, true);

    // Accessing revoked link throws generic error
    await expect(getSharedReport(token, true)).rejects.toThrow(GENERIC_ERROR);
  });

  it("lists existing shares and accurately tracks view count", async () => {
    const { shareItem, token } = await createShareLink(
      "assessment-abc",
      baseReport,
      { expiryHours: 24, hideName: false, hideChatExcerpts: false },
      "user-789",
      true
    );

    let list = await fetchAssessmentShares("assessment-abc", "user-789", true);
    expect(list.length).toBe(1);
    expect(list[0].view_count).toBe(0);

    // Access report twice
    await getSharedReport(token, true);
    await getSharedReport(token, true);

    list = await fetchAssessmentShares("assessment-abc", "user-789", true);
    expect(list[0].view_count).toBe(2);
  });
});
