// AI Output Validation & Normalization Module
// Client-side and testable utility enforcing strict JSON schema and medical safety invariants.

export interface ValidatedConsultOutput {
  reply: string;
  risk_level: "Low" | "Medium" | "High" | null;
  emergency: boolean;
  suggested_replies: string[];
  extracted: {
    symptoms?: string[];
    duration?: string;
    intensity?: string;
    lifestyle?: string;
  };
}

export const SAFE_FALLBACK_OUTPUT: ValidatedConsultOutput = {
  reply:
    "Thank you for sharing your symptoms. To help provide you with the most relevant wellness guidance, could you tell me how long you've noticed this and whether it feels mild or more intense?",
  risk_level: "Low",
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
 * Validates and normalizes raw JSON output from any LLM provider.
 */
export function validateAndNormalizeOutput(rawJson: unknown): ValidatedConsultOutput | null {
  if (!rawJson || typeof rawJson !== "object") return null;

  const data = rawJson as Record<string, unknown>;

  if (typeof data.reply !== "string" || !data.reply.trim()) {
    return null;
  }

  let risk_level: "Low" | "Medium" | "High" | null = null;
  if (data.risk_level === "Low" || data.risk_level === "Medium" || data.risk_level === "High") {
    risk_level = data.risk_level;
  }

  const emergency = Boolean(data.emergency);

  let suggested_replies: string[] = [];
  if (Array.isArray(data.suggested_replies)) {
    suggested_replies = data.suggested_replies
      .filter((item): item is string => typeof item === "string")
      .slice(0, 4);
  }

  const rawExtracted =
    typeof data.extracted === "object" && data.extracted !== null
      ? (data.extracted as Record<string, unknown>)
      : {};

  const symptoms = Array.isArray(rawExtracted.symptoms)
    ? rawExtracted.symptoms.filter((s): s is string => typeof s === "string")
    : [];

  return {
    reply: data.reply.trim(),
    risk_level,
    emergency,
    suggested_replies,
    extracted: {
      symptoms,
      duration: typeof rawExtracted.duration === "string" ? rawExtracted.duration : "",
      intensity: typeof rawExtracted.intensity === "string" ? rawExtracted.intensity : "",
      lifestyle: typeof rawExtracted.lifestyle === "string" ? rawExtracted.lifestyle : "",
    },
  };
}
