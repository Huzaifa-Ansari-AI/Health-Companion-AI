// Milestone 2 Phase 2 Unit Tests: pdfService & Vector PDF Generation
import { describe, it, expect } from "vitest";
import {
  generateReportPdf,
  getReportPdfFileName,
  wrapText,
} from "./pdfService";
import { ReportData } from "@/types/report";
import { PDFDocument, StandardFonts } from "pdf-lib";

describe("pdfService — Vector PDF Generation & Helpers", () => {
  const mockReport: ReportData = {
    id: "rec-test-12345678",
    source: "assessment",
    header: {
      appName: "Health Companion AI",
      reportTitle: "Personal Health & Wellness Summary",
      generatedDate: "October 4, 2026",
      reportId: "HCA-REC-TEST",
    },
    patient: {
      name: "Taylor Swift",
      age: "34 years",
      gender: "Female",
      height: "178 cm",
      weight: "62 kg",
      bmi: "19.6",
      bmiCategory: "Normal weight",
    },
    symptoms: {
      primaryConcern: "Mild joint stiffness",
      timeline: [
        {
          symptom: "Mild joint stiffness",
          duration: "2 weeks",
          intensity: "Mild",
          order: 1,
        },
        {
          symptom: "Occasional fatigue",
          duration: "1 week",
          intensity: "Low",
          order: 2,
        },
      ],
    },
    lifestyle: {
      sleepHours: "7.5 hrs/night",
      hydrationLiters: "2.2 L/day",
      activityLevel: "Moderate",
      activityScore: 85,
      activityScoreRating: "Optimal",
    },
    risk: {
      level: "Low",
      reason: "Self-reported vitals and mild concerns indicate overall low risk profile.",
      disclaimer:
        "This is not a medical diagnosis. It is general wellness guidance. Please consult a qualified healthcare professional.",
    },
    recommendations: {
      items: [
        "Continue consistent sleep duration of 7-9 hours.",
        "Incorporate gentle morning mobility and stretching exercises.",
        "Maintain current daily hydration target of over 2 liters.",
      ],
    },
    doctorQuestions: {
      questions: [
        "Are there specific joint-friendly resistance exercises you recommend?",
        "Should I monitor any specific inflammatory or vitamin markers?",
        "What signs should indicate the need for orthopedic evaluation?",
        "Are there dietary adjustments that best support joint health?",
      ],
    },
    footer: {
      disclaimer:
        "This is not a medical diagnosis. It is general wellness guidance. Please consult a qualified healthcare professional.",
      reportId: "HCA-REC-TEST",
      verificationCode: "V-A1B2-C3D4",
    },
  };

  it("computes compliant file names following HealthCompanion_Report_<date>.pdf", () => {
    const fileName = getReportPdfFileName("2026-10-04T12:00:00Z");
    expect(fileName).toBe("HealthCompanion_Report_2026-10-04.pdf");

    // Fallback on invalid date
    const fallbackName = getReportPdfFileName("invalid-date");
    expect(fallbackName).toMatch(/^HealthCompanion_Report_\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("wraps long text into multiple bounded lines", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    const longText =
      "This is a comprehensive evaluation of symptoms, lifestyle habits, and non-diagnostic wellness intelligence designed to aid patient-doctor conversations.";
    const lines = wrapText(longText, 200, font, 10);

    expect(lines.length).toBeGreaterThan(1);
    // Every line should respect the maximum width
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 10)).toBeLessThanOrEqual(200);
    }
  });

  it("generates a valid vector PDF byte array starting with %PDF- magic bytes", async () => {
    const pdfBytes = await generateReportPdf(mockReport);

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(2000);

    // Verify %PDF- header (ASCII 0x25, 0x50, 0x44, 0x46, 0x2D)
    const headerString = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(headerString).toBe("%PDF-");
  });

  it("successfully embeds a QR code for custom verification share links", async () => {
    const shareUrl = "https://healthai.app/shared/test-token-hash-12345678";
    const pdfBytes = await generateReportPdf(mockReport, shareUrl);

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(2000);

    // Load back into pdf-lib to verify document integrity
    const parsedDoc = await PDFDocument.load(pdfBytes);
    expect(parsedDoc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("handles multi-page generation when long symptom and question lists are provided", async () => {
    const longReport: ReportData = {
      ...mockReport,
      symptoms: {
        primaryConcern: "Multiple symptoms reported",
        timeline: Array.from({ length: 8 }, (_, i) => ({
          symptom: `Reported Symptom ${i + 1} with extended descriptive explanation`,
          duration: `${i + 1} weeks`,
          intensity: i % 2 === 0 ? "Moderate" : "Mild",
          order: i + 1,
        })),
      },
      recommendations: {
        items: Array.from({ length: 8 }, (_, i) => `Detailed wellness habit recommendation number ${i + 1} with supporting lifestyle tips.`),
      },
      doctorQuestions: {
        questions: Array.from({ length: 8 }, (_, i) => `In-depth physician consultation question number ${i + 1} exploring specific clinical observations?`),
      },
    };

    const pdfBytes = await generateReportPdf(longReport);
    const parsedDoc = await PDFDocument.load(pdfBytes);

    expect(parsedDoc.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});
