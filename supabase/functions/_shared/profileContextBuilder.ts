// Milestone 4: Edge Function AI Profile Context Formatter
// Enforces data minimization, age bracketing, and non-diagnostic boundaries.

export interface RawProfileData {
  age?: number | null;
  gender?: string | null;
  date_of_birth?: string | null;
  allergies?: Array<{ name: string; severity?: string | null }>;
  conditions?: Array<{ name: string; status: string }>;
  medications?: Array<{ name: string }>;
  familyHistory?: Array<{ condition_name: string; relation: string }>;
}

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

export function sanitizeContextField(input: string | null | undefined, maxLength = 60): string {
  if (!input) return "";
  return input
    .replace(/[<>{}[\]\\]/g, "")
    .replace(/\s+/g, " ")
    .replace(/(system prompt|ignore previous instructions|act as a doctor|prescribe)/gi, "")
    .trim()
    .slice(0, maxLength);
}

export function formatProfileContext(data: RawProfileData): string {
  const sections: string[] = [];

  const ageBracket = getAgeBracket(data.age, data.date_of_birth);
  if (ageBracket) {
    sections.push(`- Age Group: ${ageBracket}`);
  }

  const gender = sanitizeContextField(data.gender, 30);
  if (gender) {
    sections.push(`- Gender: ${gender}`);
  }

  if (data.allergies && data.allergies.length > 0) {
    const allergyStrings = data.allergies
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

  if (data.conditions && data.conditions.length > 0) {
    const conditionStrings = data.conditions
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

  if (data.familyHistory && data.familyHistory.length > 0) {
    const historyStrings = data.familyHistory
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

  if (data.medications && data.medications.length > 0) {
    const currentMeds = data.medications
      .map((m) => sanitizeContextField(m.name, 40))
      .filter((name) => Boolean(name));

    if (currentMeds.length > 0) {
      sections.push(`- Reported Medications (Background context only): ${currentMeds.join(", ")}`);
    }
  }

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
