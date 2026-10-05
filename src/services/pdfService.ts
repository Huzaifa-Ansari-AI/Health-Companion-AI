// Milestone 2: Vector PDF Generator Service
// Generates clean, accessible, multi-page vector PDFs with selectable text, QR verification, and branded styling.

import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { ReportData } from "@/types/report";

export const PDF_PAGE_WIDTH = 595.28; // A4 standard width (pt)
export const PDF_PAGE_HEIGHT = 841.89; // A4 standard height (pt)
export const PDF_MARGIN = 40;
export const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN * 2; // 515.28 pt

// Branded Color Palette
export const COLORS = {
  primary: rgb(13 / 255, 148 / 255, 136 / 255), // Teal #0d9488
  primaryLight: rgb(204 / 255, 251 / 255, 241 / 255), // Mint #ccfbf1
  primaryBorder: rgb(153 / 255, 246 / 255, 228 / 255),
  textDark: rgb(15 / 255, 23 / 255, 42 / 255), // Slate-900 #0f172a
  textMuted: rgb(100 / 255, 116 / 255, 139 / 255), // Slate-500 #64748b
  textLight: rgb(148 / 255, 163 / 255, 184 / 255),
  cardBg: rgb(248 / 255, 250 / 255, 252 / 255), // Slate-50
  cardBorder: rgb(226 / 255, 232 / 255, 240 / 255), // Slate-200
  white: rgb(1, 1, 1),
  // Risk colors
  riskLow: rgb(16 / 255, 185 / 255, 129 / 255), // Emerald
  riskLowBg: rgb(209 / 255, 250 / 255, 229 / 255),
  riskMed: rgb(245 / 255, 158 / 255, 11 / 255), // Amber
  riskMedBg: rgb(254 / 255, 243 / 255, 199 / 255),
  riskHigh: rgb(244 / 255, 63 / 255, 94 / 255), // Rose
  riskHighBg: rgb(255 / 255, 228 / 255, 230 / 255),
};

/**
 * Splits text into wrapped lines that fit within maxWidth using the given font.
 */
export function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Computes standard report PDF file name.
 */
export function getReportPdfFileName(dateStr?: string): string {
  let dateFormatted: string;
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    dateFormatted = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
  } catch {
    dateFormatted = new Date().toISOString().split("T")[0];
  }
  return `HealthCompanion_Report_${dateFormatted}.pdf`;
}

/**
 * Generates vector PDF document bytes for a given ReportData.
 */
export async function generateReportPdf(
  report: ReportData,
  verificationUrl?: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Generate QR code PNG bytes
  const qrPayload = verificationUrl || `https://healthai.app/verify/${report.footer.verificationCode}`;
  let qrPngBytes: Uint8Array | null = null;
  try {
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 140,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    qrPngBytes = bytes;
  } catch (err) {
    console.error("QR Code generation error:", err);
  }

  const qrImage = qrPngBytes ? await pdfDoc.embedPng(qrPngBytes) : null;

  const pages: PDFPage[] = [];
  let currentPage = pdfDoc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
  pages.push(currentPage);

  let y = PDF_PAGE_HEIGHT - PDF_MARGIN;

  const checkPageBreak = (neededHeight: number) => {
    // Leave at least 65pt at the bottom for footer
    if (y - neededHeight < 65) {
      currentPage = pdfDoc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
      pages.push(currentPage);
      y = PDF_PAGE_HEIGHT - PDF_MARGIN;

      // Small running top header on subsequent pages
      currentPage.drawText(`${report.header.appName} — ${report.header.reportId}`, {
        x: PDF_MARGIN,
        y: y,
        size: 8,
        font: fontOblique,
        color: COLORS.textMuted,
      });
      currentPage.drawLine({
        start: { x: PDF_MARGIN, y: y - 5 },
        end: { x: PDF_PAGE_WIDTH - PDF_MARGIN, y: y - 5 },
        thickness: 0.5,
        color: COLORS.cardBorder,
      });
      y -= 25;
    }
  };

  // ==========================================
  // SECTION 1: HEADER
  // ==========================================
  // Draw primary accent bar at top
  currentPage.drawRectangle({
    x: PDF_MARGIN,
    y: y - 4,
    width: PDF_CONTENT_WIDTH,
    height: 4,
    color: COLORS.primary,
  });
  y -= 20;

  // Header Title & App Name
  currentPage.drawText(report.header.appName.toUpperCase(), {
    x: PDF_MARGIN,
    y,
    size: 9,
    font: fontBold,
    color: COLORS.primary,
  });

  const sourceBadge = report.source === "chat" ? "AI CONSULTATION" : "VITALS CHECK";
  currentPage.drawText(sourceBadge, {
    x: PDF_MARGIN + 130,
    y,
    size: 8,
    font: fontBold,
    color: COLORS.textMuted,
  });

  // Date and Report ID on top-right
  const idText = `Report ID: ${report.header.reportId}`;
  const idWidth = fontBold.widthOfTextAtSize(idText, 9);
  currentPage.drawText(idText, {
    x: PDF_PAGE_WIDTH - PDF_MARGIN - idWidth,
    y,
    size: 9,
    font: fontBold,
    color: COLORS.textDark,
  });

  y -= 16;
  currentPage.drawText(report.header.reportTitle, {
    x: PDF_MARGIN,
    y,
    size: 16,
    font: fontBold,
    color: COLORS.textDark,
  });

  const dateText = `Date: ${report.header.generatedDate}`;
  const dateWidth = fontRegular.widthOfTextAtSize(dateText, 9);
  currentPage.drawText(dateText, {
    x: PDF_PAGE_WIDTH - PDF_MARGIN - dateWidth,
    y: y + 2,
    size: 9,
    font: fontRegular,
    color: COLORS.textMuted,
  });

  y -= 12;
  currentPage.drawText("Non-diagnostic health & lifestyle wellness summary.", {
    x: PDF_MARGIN,
    y,
    size: 8.5,
    font: fontOblique,
    color: COLORS.textMuted,
  });

  y -= 16;
  currentPage.drawLine({
    start: { x: PDF_MARGIN, y },
    end: { x: PDF_PAGE_WIDTH - PDF_MARGIN, y },
    thickness: 1,
    color: COLORS.cardBorder,
  });
  y -= 18;

  // ==========================================
  // SECTION 2: PATIENT & DEMOGRAPHIC DETAILS
  // ==========================================
  checkPageBreak(85);
  currentPage.drawText("1. PATIENT & DEMOGRAPHIC DETAILS", {
    x: PDF_MARGIN,
    y,
    size: 9.5,
    font: fontBold,
    color: COLORS.primary,
  });
  y -= 14;

  const patientBoxHeight = 55;
  currentPage.drawRectangle({
    x: PDF_MARGIN,
    y: y - patientBoxHeight,
    width: PDF_CONTENT_WIDTH,
    height: patientBoxHeight,
    color: COLORS.cardBg,
    borderColor: COLORS.cardBorder,
    borderWidth: 0.5,
  });

  const colWidth = PDF_CONTENT_WIDTH / 4;
  const drawField = (label: string, val: string, colIdx: number, rowIdx: number) => {
    const fx = PDF_MARGIN + colIdx * colWidth + 10;
    const fy = y - 16 - rowIdx * 22;
    currentPage.drawText(label.toUpperCase(), {
      x: fx,
      y: fy,
      size: 6.5,
      font: fontBold,
      color: COLORS.textMuted,
    });
    currentPage.drawText(val, {
      x: fx,
      y: fy - 10,
      size: 8.5,
      font: fontRegular,
      color: COLORS.textDark,
    });
  };

  drawField("Full Name", report.patient.name, 0, 0);
  drawField("Age", report.patient.age, 1, 0);
  drawField("Gender", report.patient.gender, 2, 0);
  drawField(
    "BMI",
    report.patient.bmi !== "Not provided"
      ? `${report.patient.bmi} (${report.patient.bmiCategory})`
      : "Not provided",
    3,
    0
  );

  drawField("Height", report.patient.height, 0, 1);
  drawField("Weight", report.patient.weight, 1, 1);
  drawField("Source", report.source === "chat" ? "AI Consultation" : "Form Questionnaire", 2, 1);
  drawField("Verification", report.footer.verificationCode, 3, 1);

  y -= patientBoxHeight + 16;

  // ==========================================
  // SECTION 3: CHIEF COMPLAINTS & TIMELINE
  // ==========================================
  checkPageBreak(75);
  currentPage.drawText("2. CHIEF COMPLAINTS & SYMPTOMS TIMELINE", {
    x: PDF_MARGIN,
    y,
    size: 9.5,
    font: fontBold,
    color: COLORS.primary,
  });
  y -= 14;

  // Table Header
  const tableHeaderHeight = 16;
  currentPage.drawRectangle({
    x: PDF_MARGIN,
    y: y - tableHeaderHeight,
    width: PDF_CONTENT_WIDTH,
    height: tableHeaderHeight,
    color: rgb(235 / 255, 240 / 255, 245 / 255),
  });

  currentPage.drawText("#", { x: PDF_MARGIN + 8, y: y - 11, size: 7.5, font: fontBold, color: COLORS.textMuted });
  currentPage.drawText("Reported Symptom", { x: PDF_MARGIN + 30, y: y - 11, size: 7.5, font: fontBold, color: COLORS.textMuted });
  currentPage.drawText("Duration / Onset", { x: PDF_MARGIN + 260, y: y - 11, size: 7.5, font: fontBold, color: COLORS.textMuted });
  currentPage.drawText("Intensity", { x: PDF_MARGIN + 410, y: y - 11, size: 7.5, font: fontBold, color: COLORS.textMuted });
  y -= tableHeaderHeight;

  // Table Rows
  for (const item of report.symptoms.timeline) {
    checkPageBreak(22);
    const rowHeight = 18;
    currentPage.drawRectangle({
      x: PDF_MARGIN,
      y: y - rowHeight,
      width: PDF_CONTENT_WIDTH,
      height: rowHeight,
      color: COLORS.white,
      borderColor: COLORS.cardBorder,
      borderWidth: 0.5,
    });

    currentPage.drawText(String(item.order), {
      x: PDF_MARGIN + 8,
      y: y - 12,
      size: 8,
      font: fontRegular,
      color: COLORS.textMuted,
    });
    currentPage.drawText(item.symptom.slice(0, 48), {
      x: PDF_MARGIN + 30,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: COLORS.textDark,
    });
    currentPage.drawText(item.duration.slice(0, 28), {
      x: PDF_MARGIN + 260,
      y: y - 12,
      size: 8,
      font: fontRegular,
      color: COLORS.textDark,
    });
    currentPage.drawText(item.intensity.slice(0, 20), {
      x: PDF_MARGIN + 410,
      y: y - 12,
      size: 8,
      font: fontRegular,
      color: COLORS.textDark,
    });

    y -= rowHeight;
  }
  y -= 14;

  // ==========================================
  // SECTION 4: LIFESTYLE & HABITS
  // ==========================================
  checkPageBreak(65);
  currentPage.drawText("3. LIFESTYLE & WELLNESS HABITS", {
    x: PDF_MARGIN,
    y,
    size: 9.5,
    font: fontBold,
    color: COLORS.primary,
  });
  y -= 14;

  const lifestyleBoxHeight = 38;
  currentPage.drawRectangle({
    x: PDF_MARGIN,
    y: y - lifestyleBoxHeight,
    width: PDF_CONTENT_WIDTH,
    height: lifestyleBoxHeight,
    color: COLORS.cardBg,
    borderColor: COLORS.cardBorder,
    borderWidth: 0.5,
  });

  const drawLifestyleCol = (lbl: string, val: string, col: number) => {
    const lx = PDF_MARGIN + col * colWidth + 10;
    currentPage.drawText(lbl.toUpperCase(), {
      x: lx,
      y: y - 14,
      size: 6.5,
      font: fontBold,
      color: COLORS.textMuted,
    });
    currentPage.drawText(val, {
      x: lx,
      y: y - 26,
      size: 8.5,
      font: fontBold,
      color: COLORS.textDark,
    });
  };

  drawLifestyleCol("Sleep Duration", report.lifestyle.sleepHours, 0);
  drawLifestyleCol("Daily Hydration", report.lifestyle.hydrationLiters, 1);
  drawLifestyleCol("Activity Level", report.lifestyle.activityLevel, 2);
  drawLifestyleCol(
    "Activity Score",
    `${report.lifestyle.activityScore}/100 (${report.lifestyle.activityScoreRating})`,
    3
  );

  y -= lifestyleBoxHeight + 16;

  // ==========================================
  // SECTION 5: CATEGORICAL RISK ASSESSMENT
  // ==========================================
  checkPageBreak(75);
  currentPage.drawText("4. CATEGORICAL RISK ASSESSMENT", {
    x: PDF_MARGIN,
    y,
    size: 9.5,
    font: fontBold,
    color: COLORS.primary,
  });

  // Risk Badge (Text + Color)
  let riskColor = COLORS.riskLow;
  let riskBg = COLORS.riskLowBg;
  if (report.risk.level === "Medium") {
    riskColor = COLORS.riskMed;
    riskBg = COLORS.riskMedBg;
  } else if (report.risk.level === "High") {
    riskColor = COLORS.riskHigh;
    riskBg = COLORS.riskHighBg;
  }

  const badgeText = `${report.risk.level.toUpperCase()} RISK`;
  const badgeWidth = fontBold.widthOfTextAtSize(badgeText, 8) + 14;
  currentPage.drawRectangle({
    x: PDF_PAGE_WIDTH - PDF_MARGIN - badgeWidth,
    y: y - 4,
    width: badgeWidth,
    height: 16,
    color: riskBg,
    borderColor: riskColor,
    borderWidth: 1,
  });
  currentPage.drawText(badgeText, {
    x: PDF_PAGE_WIDTH - PDF_MARGIN - badgeWidth + 7,
    y: y,
    size: 8,
    font: fontBold,
    color: riskColor,
  });
  y -= 16;

  // Risk Explanation Box
  const reasonLines = wrapText(report.risk.reason, PDF_CONTENT_WIDTH - 20, fontRegular, 8);
  const riskBoxHeight = 16 + reasonLines.length * 11 + 18;

  currentPage.drawRectangle({
    x: PDF_MARGIN,
    y: y - riskBoxHeight,
    width: PDF_CONTENT_WIDTH,
    height: riskBoxHeight,
    color: COLORS.cardBg,
    borderColor: COLORS.cardBorder,
    borderWidth: 0.5,
  });

  let ry = y - 14;
  for (const line of reasonLines) {
    currentPage.drawText(line, {
      x: PDF_MARGIN + 10,
      y: ry,
      size: 8,
      font: fontRegular,
      color: COLORS.textDark,
    });
    ry -= 11;
  }

  currentPage.drawText(`Notice: ${report.risk.disclaimer}`, {
    x: PDF_MARGIN + 10,
    y: ry - 4,
    size: 7,
    font: fontOblique,
    color: COLORS.textMuted,
  });

  y -= riskBoxHeight + 16;

  // ==========================================
  // SECTION 6: LIFESTYLE RECOMMENDATIONS
  // ==========================================
  checkPageBreak(65);
  currentPage.drawText("5. NON-PRESCRIPTIVE LIFESTYLE GUIDANCE", {
    x: PDF_MARGIN,
    y,
    size: 9.5,
    font: fontBold,
    color: COLORS.primary,
  });
  y -= 14;

  for (let i = 0; i < report.recommendations.items.length; i++) {
    const rec = report.recommendations.items[i];
    const lines = wrapText(`${i + 1}.  ${rec}`, PDF_CONTENT_WIDTH - 15, fontRegular, 8);
    checkPageBreak(lines.length * 11 + 4);

    for (let li = 0; li < lines.length; li++) {
      currentPage.drawText(lines[li], {
        x: PDF_MARGIN + (li === 0 ? 5 : 18),
        y,
        size: 8,
        font: fontRegular,
        color: COLORS.textDark,
      });
      y -= 11;
    }
    y -= 3;
  }
  y -= 12;

  // ==========================================
  // SECTION 7: DOCTOR DISCUSSION POINTS
  // ==========================================
  checkPageBreak(80);
  currentPage.drawText("6. SUGGESTED DOCTOR DISCUSSION POINTS", {
    x: PDF_MARGIN,
    y,
    size: 9.5,
    font: fontBold,
    color: COLORS.primary,
  });
  y -= 12;

  currentPage.drawText(
    "Suggested questions to facilitate an informed, productive conversation with your licensed physician:",
    {
      x: PDF_MARGIN,
      y,
      size: 7.5,
      font: fontOblique,
      color: COLORS.textMuted,
    }
  );
  y -= 12;

  for (let i = 0; i < report.doctorQuestions.questions.length; i++) {
    const q = report.doctorQuestions.questions[i];
    const lines = wrapText(`${i + 1}.  ${q}`, PDF_CONTENT_WIDTH - 20, fontRegular, 8);
    checkPageBreak(lines.length * 11 + 6);

    for (let li = 0; li < lines.length; li++) {
      currentPage.drawText(lines[li], {
        x: PDF_MARGIN + (li === 0 ? 5 : 18),
        y,
        size: 8,
        font: fontRegular,
        color: COLORS.textDark,
      });
      y -= 11;
    }
    y -= 3;
  }
  y -= 14;

  // ==========================================
  // FOOTER & VERIFICATION QR ON ALL PAGES
  // ==========================================
  const totalPages = pages.length;

  for (let idx = 0; idx < totalPages; idx++) {
    const page = pages[idx];
    const footerY = 48;

    // Top line above footer
    page.drawLine({
      start: { x: PDF_MARGIN, y: footerY + 12 },
      end: { x: PDF_PAGE_WIDTH - PDF_MARGIN, y: footerY + 12 },
      thickness: 0.5,
      color: COLORS.cardBorder,
    });

    // Medical Disclaimer
    page.drawText(
      "DISCLAIMER: This is not a medical diagnosis. It is general wellness guidance. Consult a qualified physician.",
      {
        x: PDF_MARGIN,
        y: footerY,
        size: 6.5,
        font: fontOblique,
        color: COLORS.textMuted,
      }
    );

    // Report ID, Verification Hash, and Page Number
    const pageInfo = `Page ${idx + 1} of ${totalPages}`;
    const metaInfo = `Ref: ${report.footer.reportId}  |  Hash: ${report.footer.verificationCode}`;

    page.drawText(metaInfo, {
      x: PDF_MARGIN,
      y: footerY - 10,
      size: 6.5,
      font: fontRegular,
      color: COLORS.textMuted,
    });

    const pageInfoWidth = fontRegular.widthOfTextAtSize(pageInfo, 7);
    page.drawText(pageInfo, {
      x: PDF_PAGE_WIDTH - PDF_MARGIN - pageInfoWidth,
      y: footerY - 10,
      size: 7,
      font: fontRegular,
      color: COLORS.textDark,
    });

    // Embed QR code on the first page footer (or all pages if preferred)
    if (idx === 0 && qrImage) {
      const qrSize = 36;
      page.drawImage(qrImage, {
        x: PDF_PAGE_WIDTH - PDF_MARGIN - qrSize,
        y: footerY - 8,
        width: qrSize,
        height: qrSize,
      });
    }
  }

  return pdfDoc.save();
}

/**
 * Triggers in-browser vector PDF file download.
 */
export async function downloadReportPdf(
  report: ReportData,
  verificationUrl?: string
): Promise<void> {
  const pdfBytes = await generateReportPdf(report, verificationUrl);
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getReportPdfFileName(report.header.generatedDate);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
