// Milestone 4: AI Profile Context & Data Minimization Utility
// Generates sanitized, boundary-protected background context for AI consultations.
// Strictly enforces opt-in consent: returns empty string if consent is not granted.

import { ComprehensiveHealthProfile } from "@/types/profile";

/**
 * Calculates a generalized age bracket to avoid exposing exact birthdates or precise age to AI.
 */
export function getAgeBracket(age?: number | null, dob?: string | null): string | null {
  let evaluatedAge = age;

  if ((evaluatedAge === null || evaluatedAge === undefined) && dob) {
    const birthDate = new Date(dob);
    if (!isNaN(birthDate.getTime())) {
      const today = new Date();
      let diff = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        diff--;
      }
      evaluatedAge = diff;
    }
  }

  if (evaluatedAge === null || evaluatedAge === undefined || isNaN(evaluatedAge)) {
    return null;
  }

  if (evaluatedAge < 18) return "Under 18";
  if (evaluatedAge <= 24) return "18-24";
  if (evaluatedAge <= 34) return "25-34";
  if (evaluatedAge <= 49) return "35-49";
  if (evaluatedAge <= 64) return "50-64";
  return "65+";
}

/**
 * Strips potentially disruptive characters and prompt injection keywords from profile fields.
 */
export function sanitizeContextField(input: string | null | undefined, maxLength = 60): string {
  if (!input) return "";
  return input
    .replace(/[<>{}[\]\\]/g, "") // remove xml/json/bracket characters
    .replace(/\s+/g, " ") // normalize whitespace
    .replace(/(system prompt|ignore previous instructions|act as a doctor|prescribe)/gi, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Builds a minimized, boundary-protected background prompt context string from a user's health profile.
 * 
 * Rules:
 * 1. Returns empty string if consentGranted is false.
 * 2. Returns empty string if profile is null or has no substantive data.
 * 3. Never includes exact date of birth, user IDs, or full names.
 * 4. Wraps context in strict non-diagnostic boundary instructions.
 */
export function buildAiProfileContext(
  profile: ComprehensiveHealthProfile | null,
  consentGranted: boolean
): string {
  if (!consentGranted || !profile) {
    return "";
  }

  const sections: string[] = [];

  // 1. Age bracket and gender
  const ageBracket = getAgeBracket(profile.profile?.age, profile.profile?.date_of_birth);
  if (ageBracket) {
    sections.push(`- Age Group: ${ageBracket}`);
  }

  const gender = sanitizeContextField(profile.profile?.gender, 30);
  if (gender) {
    sections.push(`- Gender: ${gender}`);
  }

  // 2. Known Allergies (name + severity)
  if (profile.allergies && profile.allergies.length > 0) {
    const allergyStrings = profile.allergies
      .map((a) => {
        const name = sanitizeContextField(a.name, 40);
        if (!name) return null;
        return a.severity ? `${name} (${a.severity})` : name;
      })
      .filter((s): s is string => Boolean(s));

    if (allergyStrings.length > 0) {
      sections.push(`- Known Allergies: ${allergyStrings.join(", ")}`);
    }
  }

  // 3. Health Conditions (active/managed only, ignoring past)
  if (profile.conditions && profile.conditions.length > 0) {
    const conditionStrings = profile.conditions
      .filter((c) => c.status !== "past")
      .map((c) => {
        const name = sanitizeContextField(c.name, 40);
        if (!name) return null;
        return `${name} (${c.status})`;
      })
      .filter((s): s is string => Boolean(s));

    if (conditionStrings.length > 0) {
      sections.push(`- Active Health Conditions: ${conditionStrings.join(", ")}`);
    }
  }

  // 4. Family History
  if (profile.familyHistory && profile.familyHistory.length > 0) {
    const historyStrings = profile.familyHistory
      .map((f) => {
        const cond = sanitizeContextField(f.condition_name, 40);
        const rel = sanitizeContextField(f.relation, 30);
        if (!cond) return null;
        return rel ? `${cond} (${rel})` : cond;
      })
      .filter((s): s is string => Boolean(s));

    if (historyStrings.length > 0) {
      sections.push(`- Family Health History: ${historyStrings.join(", ")}`);
    }
  }

  // 5. Current Medications (Context only - strictly non-prescriptive)
  if (profile.medications && profile.medications.length > 0) {
    const currentMeds = profile.medications
      .filter((m) => m.is_current !== false)
      .map((m) => sanitizeContextField(m.name, 40))
      .filter((name) => Boolean(name));

    if (currentMeds.length > 0) {
      sections.push(`- Reported Medications (Background context only): ${currentMeds.join(", ")}`);
    }
  }

  // If no sections were populated, return empty string
  if (sections.length === 0) {
    return "";
  }

  return [
    "<user_background_context>",
    "USER WELLNESS BACKGROUND CONTEXT (STRICT NON-DIAGNOSTIC & NON-PRESCRIPTIVE BOUNDARY):",
    ...sections,
    "SAFETY INSTRUCTION: Use this context solely to ensure general wellness lifestyle guidance does not conflict with stated allergies or conditions. NEVER diagnose, prescribe medications, or advise stopping or altering any treatments.",
    "</user_background_context>",
  ].join("\n");
}
