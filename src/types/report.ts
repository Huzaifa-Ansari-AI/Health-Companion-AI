// Milestone 2: Report Data Types & Zod Validation Schemas
// Defines strict data models for dynamic, non-diagnostic health reports.

import { z } from "zod";

export const RiskLevelSchema = z.enum(["Low", "Medium", "High"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const MANDATORY_REPORT_DISCLAIMER =
  "This is not a medical diagnosis. It is general wellness guidance. Please consult a qualified healthcare professional.";

// 1. Header Section
export const ReportHeaderSchema = z.object({
  appName: z.string().default("Health Companion AI"),
  reportTitle: z.string().default("Personal Health & Wellness Summary"),
  generatedDate: z.string(),
  reportId: z.string(),
});
export type ReportHeader = z.infer<typeof ReportHeaderSchema>;

// 2. Patient Details Section
export const PatientDetailsSchema = z.object({
  name: z.string().default("Not provided"),
  age: z.string().default("Not provided"),
  gender: z.string().default("Not provided"),
  height: z.string().default("Not provided"),
  weight: z.string().default("Not provided"),
  bmi: z.string().default("Not provided"),
  bmiCategory: z.string().default("Not provided"),
});
export type PatientDetails = z.infer<typeof PatientDetailsSchema>;

// 3. Chief Complaints & Symptoms Timeline
export const SymptomTimelineItemSchema = z.object({
  symptom: z.string(),
  duration: z.string().default("Not specified"),
  intensity: z.string().default("Not specified"),
  order: z.number().int().positive(),
});
export type SymptomTimelineItem = z.infer<typeof SymptomTimelineItemSchema>;

export const SymptomsSectionSchema = z.object({
  primaryConcern: z.string().default("General wellness consultation"),
  timeline: z.array(SymptomTimelineItemSchema).default([]),
});
export type SymptomsSection = z.infer<typeof SymptomsSectionSchema>;

// 4. Lifestyle Factors Section
export const LifestyleSectionSchema = z.object({
  sleepHours: z.string().default("Not provided"),
  hydrationLiters: z.string().default("Not provided"),
  activityLevel: z.string().default("Not provided"),
  activityScore: z.number().min(0).max(100),
  activityScoreRating: z.enum(["Low", "Moderate", "Optimal", "Not evaluated"]),
});
export type LifestyleSection = z.infer<typeof LifestyleSectionSchema>;

// 5. Risk Assessment Section
export const RiskSectionSchema = z.object({
  level: RiskLevelSchema,
  reason: z.string(),
  disclaimer: z.string().default(MANDATORY_REPORT_DISCLAIMER),
});
export type RiskSection = z.infer<typeof RiskSectionSchema>;

// 6. Lifestyle Recommendations Section
export const RecommendationsSectionSchema = z.object({
  items: z.array(z.string()).min(1),
});
export type RecommendationsSection = z.infer<typeof RecommendationsSectionSchema>;

// 7. Doctor Discussion Points Section
export const DoctorDiscussionSectionSchema = z.object({
  questions: z.array(z.string()).min(2).max(8),
});
export type DoctorDiscussionSection = z.infer<typeof DoctorDiscussionSectionSchema>;

// 8. Footer Section
export const ReportFooterSchema = z.object({
  disclaimer: z.string().default(MANDATORY_REPORT_DISCLAIMER),
  reportId: z.string(),
  verificationCode: z.string(),
});
export type ReportFooter = z.infer<typeof ReportFooterSchema>;

// Complete Unified Report Data Model
export const ReportDataSchema = z.object({
  id: z.string(),
  source: z.enum(["assessment", "chat"]),
  header: ReportHeaderSchema,
  patient: PatientDetailsSchema,
  symptoms: SymptomsSectionSchema,
  lifestyle: LifestyleSectionSchema,
  risk: RiskSectionSchema,
  recommendations: RecommendationsSectionSchema,
  doctorQuestions: DoctorDiscussionSectionSchema,
  footer: ReportFooterSchema,
});
export type ReportData = z.infer<typeof ReportDataSchema>;

// Profile details form data interface
export interface ProfileDemographics {
  age?: number | null;
  gender?: string | null;
  date_of_birth?: string | null;
  full_name?: string | null;
}
