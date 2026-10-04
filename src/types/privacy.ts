// Milestone 4: Privacy & Consent Types & Schemas
// Granular opt-in consents, append-only audit trail, and data portability models.

import { z } from "zod";

export const CONSENT_TYPES = [
  "ai_chat_processing",
  "ai_profile_context",
  "ai_report_generation",
  "share_links",
  "analytics",
] as const;

export type ConsentType = (typeof CONSENT_TYPES)[number];

export interface PrivacyConsentRecord {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  granted: boolean;
  policy_version: string;
  created_at: string;
}

export interface ActiveConsentState {
  granted: boolean;
  updatedAt: string | null;
  policyVersion: string;
}

export type UserConsentsMap = Record<ConsentType, ActiveConsentState>;

// Detailed metadata for each consent item
export interface ConsentMetadata {
  type: ConsentType;
  title: string;
  shortDescription: string;
  fullExplanation: string;
  whyNeeded: string;
  revocationImpact: string;
  defaultState: boolean;
}

export const CONSENT_DEFINITIONS: Record<ConsentType, ConsentMetadata> = {
  ai_chat_processing: {
    type: "ai_chat_processing",
    title: "AI Symptom Chat Processing",
    shortDescription: "Allow AI to process symptoms you type in chat conversations.",
    fullExplanation:
      "When you send a message in consultation chat, your text is sent to our serverless edge function and processed by an AI model to identify symptoms, evaluate potential risk categories, and provide non-diagnostic guidance.",
    whyNeeded: "Required to receive interactive conversational guidance and follow-up questions.",
    revocationImpact:
      "If turned off, interactive AI consultation will be paused. Past chats remain saved until you delete them.",
    defaultState: false, // Strict opt-in
  },
  ai_profile_context: {
    type: "ai_profile_context",
    title: "Personalized AI Profile Context",
    shortDescription: "Allow AI to consider your allergies and conditions as background context.",
    fullExplanation:
      "Shares sanitized health history (such as known allergies, active conditions, and general age range) with the AI during chat so suggestions account for your personal context.",
    whyNeeded: "Enables more relevant, context-aware suggestions without repeating your background each time.",
    revocationImpact:
      "If turned off, the AI operates in generic mode without accessing your profile background.",
    defaultState: false, // Strict opt-in
  },
  ai_report_generation: {
    type: "ai_report_generation",
    title: "AI Report Synthesis & Summaries",
    shortDescription: "Allow AI to synthesize your biometrics into structured wellness reports.",
    fullExplanation:
      "Processes your assessment responses into 8-section wellness summaries, non-prescriptive lifestyle tips, and doctor discussion points.",
    whyNeeded: "Required to auto-generate doctor discussion points and structured lifestyle summaries.",
    revocationImpact:
      "If turned off, you can still view raw vitals, but AI-synthesized summaries will not be generated.",
    defaultState: false, // Strict opt-in
  },
  share_links: {
    type: "share_links",
    title: "Expiring Doctor Share Links",
    shortDescription: "Allow creating temporary, read-only links to share reports with your physician.",
    fullExplanation:
      "Enables generation of time-limited (max 7-day) read-only snapshot links protected by SHA-256 tokens and anti-indexing headers.",
    whyNeeded: "Required to share your wellness reports with your healthcare provider.",
    revocationImpact:
      "If turned off, creating new share links will be blocked. Active links can still be revoked individually.",
    defaultState: false, // Strict opt-in
  },
  analytics: {
    type: "analytics",
    title: "Anonymous Usage Analytics",
    shortDescription: "Help improve app performance with completely anonymized usage metrics.",
    fullExplanation:
      "Collects non-identifying telemetry (e.g. page load speeds, error rates) to maintain reliability and performance.",
    whyNeeded: "Helps us find and fix bugs and improve performance across devices.",
    revocationImpact:
      "If turned off, no performance telemetry is transmitted from your browser session.",
    defaultState: false, // Strict opt-in
  },
};

// ==============================================================================
// ZOD VALIDATION SCHEMAS
// ==============================================================================

export const updateConsentInputSchema = z.object({
  consent_type: z.enum(CONSENT_TYPES),
  granted: z.boolean(),
  policy_version: z.string().max(20).default("1.0"),
});

export type UpdateConsentInput = z.infer<typeof updateConsentInputSchema>;

export const CURRENT_POLICY_VERSION = "1.0";

// Export & Deletion Request Types
export interface DataExportRequest {
  id: string;
  user_id: string;
  format: "json" | "pdf";
  status: "pending" | "completed" | "failed";
  created_at: string;
}

export interface AccountDeletionRequest {
  id: string;
  user_id: string;
  status: "pending" | "completed" | "failed";
  confirmed_at: string;
  created_at: string;
}
