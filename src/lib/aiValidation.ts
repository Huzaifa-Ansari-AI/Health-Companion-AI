// AI Output Validation & Normalization Module
// Client-side and testable utility enforcing strict JSON schema and medical safety invariants.

import { z } from "zod";

export const ConsultOutputSchema = z.object({
  reply: z.string().trim().min(1, "Reply cannot be empty"),
  suggested_title: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val ?? null),
  risk_level: z
    .enum(["Low", "Medium", "High"])
    .nullable()
    .optional()
    .transform((val) => val ?? null),
  emergency: z.boolean().default(false),
  suggested_replies: z
    .array(z.string())
    .default([])
    .transform((arr) => arr.slice(0, 4)),
  extracted: z
    .object({
      symptoms: z.array(z.string()).default([]),
      duration: z.string().default(""),
      intensity: z.string().default(""),
      lifestyle: z.string().default(""),
    })
    .default({
      symptoms: [],
      duration: "",
      intensity: "",
      lifestyle: "",
    }),
});

export type ValidatedConsultOutput = {
  reply: string;
  suggested_title?: string | null;
  risk_level: "Low" | "Medium" | "High" | null;
  emergency: boolean;
  suggested_replies: string[];
  extracted: {
    symptoms: string[];
    duration: string;
    intensity: string;
    lifestyle: string;
  };
};

export const SAFE_FALLBACK_OUTPUT: ValidatedConsultOutput = {
  reply:
    "Thank you for sharing your symptoms. To help provide you with the most relevant wellness guidance, could you tell me how long you've noticed this and whether it feels mild or more intense?",
  suggested_title: null,
  risk_level: null,
  emergency: false,
  suggested_replies: ["Started today", "A few days", "Over a week", "Mild intensity"],
  extracted: {
    symptoms: [],
    duration: "",
    intensity: "",
    lifestyle: "",
  },
};

/**
 * Validates and normalizes raw JSON output from any LLM provider using Zod.
 */
export function validateAndNormalizeOutput(rawJson: unknown): ValidatedConsultOutput | null {
  if (!rawJson || typeof rawJson !== "object") return null;

  // Handle case where raw risk_level is invalid string like "75%"
  const rawObj = rawJson as Record<string, unknown>;
  const sanitizedRisk =
    rawObj.risk_level === "Low" || rawObj.risk_level === "Medium" || rawObj.risk_level === "High"
      ? rawObj.risk_level
      : null;

  const candidate = {
    ...rawObj,
    risk_level: sanitizedRisk,
  };

  const parsed = ConsultOutputSchema.safeParse(candidate);
  if (!parsed.success) {
    return null;
  }

  const { data } = parsed;
  return {
    reply: data.reply.trim(),
    suggested_title: data.suggested_title,
    risk_level: data.risk_level,
    emergency: data.emergency,
    suggested_replies: data.suggested_replies.slice(0, 4),
    extracted: {
      symptoms: data.extracted.symptoms.map((s) => s.trim()).filter(Boolean),
      duration: data.extracted.duration.trim(),
      intensity: data.extracted.intensity.trim(),
      lifestyle: data.extracted.lifestyle.trim(),
    },
  };
}

export interface DynamicRiskIndicator {
  condition: string;
  risk_level: "Low" | "Medium" | "High";
  rationale: string;
  icon_name?: string;
}

export interface HealthAnalysisResult {
  overall_risk_level: "Low" | "Medium" | "High";
  summary: string;
  risks: DynamicRiskIndicator[];
  recommendations: string[];
  disclaimer: string;
}

export const HealthAnalysisSchema = z.object({
  overall_risk_level: z.enum(["Low", "Medium", "High"]).default("Low"),
  summary: z.string().trim().min(1, "Summary cannot be empty"),
  risks: z
    .array(
      z.object({
        condition: z.string().trim().min(1),
        risk_level: z.enum(["Low", "Medium", "High"]),
        rationale: z.string().trim().min(1),
        icon_name: z.string().optional().default("Activity"),
      })
    )
    .default([]),
  recommendations: z.array(z.string()).default([]),
  disclaimer: z
    .string()
    .default(
      "This is not a medical diagnosis. Please consult a qualified healthcare professional."
    ),
});

export function validateHealthAnalysisOutput(rawJson: unknown): HealthAnalysisResult | null {
  if (!rawJson || typeof rawJson !== "object") return null;
  const parsed = HealthAnalysisSchema.safeParse(rawJson);
  if (!parsed.success) return null;
  return parsed.data;
}


