// Milestone 4: Patient Health Profile Types & Schemas
// Enforces data minimization, length constraints, and Zod validation.

import { z } from "zod";

// 1. Core Health Profile Record
export interface HealthProfile {
  user_id: string;
  date_of_birth: string | null;
  age: number | null;
  gender: string | null;
  time_zone: string | null;
  created_at: string;
  updated_at: string;
}

// 2. Profile Allergy
export type AllergySeverity = "mild" | "moderate" | "severe";

export interface ProfileAllergy {
  id: string;
  user_id: string;
  name: string;
  reaction: string | null;
  severity: AllergySeverity | null;
  created_at: string;
}

// 3. Profile Condition
export type ConditionStatus = "active" | "managed" | "past";

export interface ProfileCondition {
  id: string;
  user_id: string;
  name: string;
  status: ConditionStatus;
  since_year: number | null;
  created_at: string;
}

// 4. Profile Family History
export interface ProfileFamilyHistory {
  id: string;
  user_id: string;
  condition_name: string;
  relation: string;
  created_at: string;
}

// 5. Profile Medication (Context Only - Non-Prescriptive)
export interface ProfileMedication {
  id: string;
  user_id: string;
  name: string;
  dose_text: string | null;
  frequency_text: string | null;
  is_current: boolean;
  created_at: string;
}

// 6. Comprehensive Aggregated Health Profile
export interface ComprehensiveHealthProfile {
  profile: HealthProfile | null;
  allergies: ProfileAllergy[];
  conditions: ProfileCondition[];
  familyHistory: ProfileFamilyHistory[];
  medications: ProfileMedication[];
}

// ==============================================================================
// ZOD VALIDATION SCHEMAS
// ==============================================================================

export const healthProfileInputSchema = z.object({
  date_of_birth: z.string().nullable().optional(),
  age: z
    .number()
    .int()
    .min(18, "Must be at least 18 years of age.")
    .max(120, "Please enter a valid age.")
    .nullable()
    .optional(),
  gender: z
    .string()
    .max(50, "Gender text cannot exceed 50 characters.")
    .nullable()
    .optional(),
  time_zone: z
    .string()
    .max(50, "Timezone text cannot exceed 50 characters.")
    .nullable()
    .optional(),
});

export type HealthProfileInput = z.infer<typeof healthProfileInputSchema>;

export const allergyInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Allergy name is required.")
    .max(100, "Allergy name cannot exceed 100 characters."),
  reaction: z
    .string()
    .trim()
    .max(200, "Reaction description cannot exceed 200 characters.")
    .nullable()
    .optional(),
  severity: z.enum(["mild", "moderate", "severe"]).nullable().optional(),
});

export type AllergyInput = z.infer<typeof allergyInputSchema>;

export const conditionInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Condition name is required.")
    .max(100, "Condition name cannot exceed 100 characters."),
  status: z.enum(["active", "managed", "past"]).default("active"),
  since_year: z
    .number()
    .int()
    .min(1900, "Year must be 1900 or later.")
    .max(new Date().getFullYear(), "Year cannot be in the future.")
    .nullable()
    .optional(),
});

export type ConditionInput = z.infer<typeof conditionInputSchema>;

export const familyHistoryInputSchema = z.object({
  condition_name: z
    .string()
    .trim()
    .min(1, "Condition name is required.")
    .max(100, "Condition name cannot exceed 100 characters."),
  relation: z
    .string()
    .trim()
    .min(1, "Relation is required (e.g. Mother, Father, Grandparent).")
    .max(60, "Relation cannot exceed 60 characters."),
});

export type FamilyHistoryInput = z.infer<typeof familyHistoryInputSchema>;

export const medicationInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Medication name is required.")
    .max(100, "Medication name cannot exceed 100 characters."),
  dose_text: z
    .string()
    .trim()
    .max(80, "Dose note cannot exceed 80 characters.")
    .nullable()
    .optional(),
  frequency_text: z
    .string()
    .trim()
    .max(80, "Frequency note cannot exceed 80 characters.")
    .nullable()
    .optional(),
  is_current: z.boolean().default(true),
});

export type MedicationInput = z.infer<typeof medicationInputSchema>;
