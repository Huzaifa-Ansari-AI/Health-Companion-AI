import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { HealthAssessmentSummary } from "@/types/chat";
import { parseEdgeFunctionError } from "./aiErrorHelper";
import {
  DynamicRiskIndicator,
  HealthAnalysisResult,
  validateHealthAnalysisOutput,
} from "@/lib/aiValidation";

export interface AssessmentLifestyleData {
  age?: number;
  gender?: string;
  height_feet?: number;
  height_inches?: number;
  weight_unit?: "kg" | "lbs";
  input_weight?: number;
  sleep_hours?: number;
  activity_level?: string;
  water_liters?: number;
  diet_type?: string;
  smoking?: boolean;
  harmful_substances?: string[];
  alcohol?: boolean;
  family_history?: string[];
  custom_symptoms?: string;
  custom_habits?: string;
  custom_family_history?: string;
  assessment_mode?: "offline" | "online";
  [key: string]: unknown;
}

export interface AssessmentRecord {
  id?: string;
  user_id?: string;
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  bmi_category?: string;
  symptoms: string[];
  lifestyle_data?: AssessmentLifestyleData;
  risk_level: "Low" | "Medium" | "High";
  ai_summary: string;
  recommendations: string[];
  disclaimer: string;
  source?: "assessment" | "chat";
  session_id?: string;
  chat_summary_data?: Record<string, unknown>;
  created_at?: string;
}

/**
 * Converts height in feet and inches to centimeters.
 * Example: 5 ft 7 in -> 170.2 cm
 */
export function feetInchesToCm(feet: number, inches: number): number {
  const safeFeet = Math.max(0, Math.floor(feet || 0));
  const safeInches = Math.max(0, Math.min(11, inches || 0));
  const totalInches = safeFeet * 12 + safeInches;
  return Number((totalInches * 2.54).toFixed(1));
}

/**
 * Converts centimeters to approximate feet and remaining inches.
 */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  if (!cm || cm <= 0) return { feet: 5, inches: 7 };
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return { feet, inches };
}

/**
 * Converts pounds (lbs) to kilograms (kg).
 */
export function lbsToKg(lbs: number): number {
  if (!lbs || lbs <= 0) return 0;
  return Number((lbs / 2.20462).toFixed(1));
}

/**
 * Converts kilograms (kg) to pounds (lbs).
 */
export function kgToLbs(kg: number): number {
  if (!kg || kg <= 0) return 0;
  return Number((kg * 2.20462).toFixed(1));
}

export function calculateBMI(heightCm: number, weightKg: number): { bmi: number; category: string } {
  if (heightCm <= 0 || weightKg <= 0) return { bmi: 0, category: "Unknown" };
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

  let category = "Normal weight";
  if (bmi < 16.0) category = "Severe Thinness";
  else if (bmi < 18.5) category = "Underweight";
  else if (bmi < 25.0) category = "Normal weight";
  else if (bmi < 30.0) category = "Overweight";
  else category = "Obesity";

  return { bmi, category };
}

// Local mock storage key for Demo mode
const DEMO_ASSESSMENTS_KEY = "healthai_demo_assessments";

const INITIAL_DEMO_RECORDS: AssessmentRecord[] = [
  {
    id: "demo-rec-1",
    height_cm: 175,
    weight_kg: 70,
    bmi: 22.9,
    bmi_category: "Normal weight",
    symptoms: ["Occasional fatigue"],
    lifestyle_data: { sleep_hours: 7, activity_level: "Moderate", water_liters: 2 },
    risk_level: "Low",
    ai_summary: "Your BMI is 22.9, falling in the healthy normal range. Occasional fatigue may be related to sleep patterns or hydration.",
    recommendations: [
      "Maintain your current balanced diet and active routine.",
      "Target 7.5 to 8 hours of uninterrupted sleep.",
      "Stay hydrated throughout the workday."
    ],
    disclaimer: "This is not a medical diagnosis.",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  }
];

export async function fetchUserAssessments(userId: string, isDemo = false): Promise<AssessmentRecord[]> {
  if (isDemo || !isSupabaseConfigured) {
    const raw = localStorage.getItem(DEMO_ASSESSMENTS_KEY);
    if (!raw) {
      localStorage.setItem(DEMO_ASSESSMENTS_KEY, JSON.stringify(INITIAL_DEMO_RECORDS));
      return INITIAL_DEMO_RECORDS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_DEMO_RECORDS;
    }
  }

  const { data, error } = await supabase
    .from("health_assessments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assessments from Supabase:", error);
    throw new Error(error.message || "Failed to load assessments from database.");
  }

  return data || [];
}

export async function saveAssessment(
  record: Omit<AssessmentRecord, "id" | "created_at">,
  isDemo = false
): Promise<AssessmentRecord> {
  const isGuestDemo = Boolean(
    isDemo && (!record.user_id || record.user_id === "demo" || record.user_id.startsWith("demo-"))
  );

  const fullRecord: AssessmentRecord = {
    ...record,
    id: isGuestDemo ? `demo-${Date.now()}` : undefined,
    created_at: new Date().toISOString(),
  };

  if (isGuestDemo || !isSupabaseConfigured) {
    const current = await fetchUserAssessments(record.user_id || "demo", true);
    const updated = [fullRecord, ...current];
    localStorage.setItem(DEMO_ASSESSMENTS_KEY, JSON.stringify(updated));
    return fullRecord;
  }

  // Ensure user's profile row exists in public.profiles to satisfy foreign key constraint
  if (record.user_id) {
    try {
      await supabase.from("profiles").upsert(
        {
          id: record.user_id,
          email: "",
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
    } catch {
      // Non-blocking if profile already exists or trigger handled it
    }
  }

  const { data, error } = await supabase
    .from("health_assessments")
    .insert([record])
    .select()
    .single();

  if (error) {
    console.error("Error saving assessment to Supabase:", error);
    throw new Error(error.message || "Failed to save assessment to database.");
  }

  return data;
}

/**
 * Deletes a health assessment by ID.
 * In demo mode: removes from localStorage and cleans up associated demo shares.
 * In authenticated mode: deletes from Supabase health_assessments (cascades to report_shares).
 */
export async function deleteAssessment(
  assessmentId: string,
  isDemo = false
): Promise<void> {
  if (!assessmentId) {
    throw new Error("Assessment ID is required for deletion.");
  }

  if (isDemo || !isSupabaseConfigured) {
    const raw = localStorage.getItem(DEMO_ASSESSMENTS_KEY);
    if (raw) {
      try {
        const records: AssessmentRecord[] = JSON.parse(raw);
        const filtered = records.filter((r) => r.id !== assessmentId);
        localStorage.setItem(DEMO_ASSESSMENTS_KEY, JSON.stringify(filtered));
      } catch {
        // Fallback
      }
    }

    // Also clean up any associated demo share records
    try {
      const sharesRaw = localStorage.getItem("healthai_demo_shares");
      if (sharesRaw) {
        const shares = JSON.parse(sharesRaw);
        if (Array.isArray(shares)) {
          const remainingShares = shares.filter((s: { assessment_id: string }) => s.assessment_id !== assessmentId);
          localStorage.setItem("healthai_demo_shares", JSON.stringify(remainingShares));
        }
      }
    } catch {
      // Non-blocking
    }
    return;
  }

  const { error } = await supabase
    .from("health_assessments")
    .delete()
    .eq("id", assessmentId);

  if (error) {
    console.error("Error deleting assessment from Supabase:", error);
    throw new Error(error.message || "Failed to delete assessment from database.");
  }
}

/**
 * Saves a synthesized AI chat consultation summary into health_assessments.
 * Prevents duplicate rows for the same session.
 */
export async function saveChatAssessment(
  summary: HealthAssessmentSummary,
  sessionId: string,
  userId: string,
  isDemo = false
): Promise<AssessmentRecord> {
  const existing = await fetchUserAssessments(userId, isDemo);
  const alreadySaved = existing.find((a) => a.session_id === sessionId);
  if (alreadySaved) {
    return alreadySaved;
  }

  const record: Omit<AssessmentRecord, "id" | "created_at"> = {
    user_id: userId,
    source: "chat",
    session_id: sessionId,
    symptoms: summary.symptoms,
    risk_level: summary.risk_level,
    ai_summary: summary.summary,
    recommendations: summary.recommendations,
    disclaimer: summary.disclaimer,
    lifestyle_data: {
      activity_level: summary.lifestyle_factors?.join(", ") || "Reported via AI consultation",
    },
    chat_summary_data: {
      duration: summary.duration,
      intensity: summary.intensity,
      lifestyle_factors: summary.lifestyle_factors,
      doctor_questions: summary.doctor_questions,
    },
  };

  return saveAssessment(record, isDemo);
}

export type { DynamicRiskIndicator, HealthAnalysisResult };

export function generateDemoHealthAnalysis(record: AssessmentRecord): HealthAnalysisResult {
  const risks: DynamicRiskIndicator[] = [];
  const symptoms = record.symptoms || [];
  const bmiCategory = record.bmi_category || "Normal weight";
  const lifestyle = record.lifestyle_data || {};
  const bmi = record.bmi || 22;

  // 1. BMI & Metabolic Analysis
  if (bmiCategory === "Obesity") {
    risks.push({
      condition: "Metabolic Health & Weight Management",
      risk_level: "High",
      rationale: `BMI of ${bmi} falls in the obesity category, placing increased long-term strain on glycemic regulation and cardiovascular circulation.`,
      icon_name: "Scale",
    });
  } else if (bmiCategory === "Severe Thinness") {
    risks.push({
      condition: "Nutritional Deficit & Underweight Strain",
      risk_level: "High",
      rationale: `BMI of ${bmi} reflects severe thinness (< 16.0), indicating heightened physiological vulnerability and potential nutritional deficiency.`,
      icon_name: "Scale",
    });
  } else if (bmiCategory === "Overweight") {
    risks.push({
      condition: "Weight & Metabolic Profile",
      risk_level: "Medium",
      rationale: `BMI of ${bmi} indicates moderate excess weight, which can contribute to joint and cardiovascular strain over time.`,
      icon_name: "Scale",
    });
  } else if (bmiCategory === "Underweight") {
    risks.push({
      condition: "Low Body Weight",
      risk_level: "Medium",
      rationale: `BMI of ${bmi} indicates lower body weight, which may benefit from targeted nutritional density.`,
      icon_name: "Scale",
    });
  }

  // 2. Tobacco / Harmful Substances Analysis
  const hasSubstances = lifestyle.smoking || (lifestyle.harmful_substances && lifestyle.harmful_substances.length > 0);
  if (hasSubstances) {
    const list = [
      lifestyle.smoking ? "cigarettes" : null,
      ...(lifestyle.harmful_substances || []),
    ].filter(Boolean).join(", ");
    risks.push({
      condition: "Cardiopulmonary & Mucosal Health",
      risk_level: "High",
      rationale: `Active exposure to ${list || "tobacco products"} contributes to substantial mucosal irritation, cellular stress, and arterial stiffness.`,
      icon_name: "Flame",
    });
  }

  // 3. Hereditary / Family History
  if (lifestyle.family_history && lifestyle.family_history.length > 0) {
    if (lifestyle.family_history.some((h) => h.toLowerCase().includes("diabet"))) {
      risks.push({
        condition: "Type 2 Diabetes Predisposition",
        risk_level: "Medium",
        rationale: "Reported family history of diabetes confers genetic susceptibility to insulin resistance, indicating benefit from routine fasting glucose tests.",
        icon_name: "Activity",
      });
    }
    if (lifestyle.family_history.some((h) => h.toLowerCase().includes("heart") || h.toLowerCase().includes("hyper") || h.toLowerCase().includes("cardio"))) {
      risks.push({
        condition: "Cardiovascular Hereditary Risk",
        risk_level: "Medium",
        rationale: "Familial cardiovascular trends warrant proactive blood pressure management and periodic lipid screenings.",
        icon_name: "Heart",
      });
    }
    if (lifestyle.family_history.some((h) => h.toLowerCase().includes("cancer"))) {
      risks.push({
        condition: "Preventative Oncology Vigilance",
        risk_level: "Medium",
        rationale: "Reported family history of oncology conditions underscores the importance of maintaining age-appropriate preventative screenings.",
        icon_name: "ShieldAlert",
      });
    }
  }

  // 4. Symptoms Correlation
  const hasChestPain = symptoms.some((s) => s.toLowerCase().includes("chest pain"));
  const hasBreathShortness = symptoms.some((s) => s.toLowerCase().includes("shortness of breath"));
  if (hasChestPain || hasBreathShortness) {
    risks.push({
      condition: "Cardiopulmonary Symptoms",
      risk_level: "High",
      rationale: "Reported chest discomfort or shortness of breath represents an acute signal requiring prompt clinical evaluation.",
      icon_name: "Heart",
    });
  }

  const hasHeadaches = symptoms.some((s) => s.toLowerCase().includes("headache") || s.toLowerCase().includes("dizziness"));
  if (hasHeadaches) {
    risks.push({
      condition: "Neurological & Tension Comfort",
      risk_level: "Medium",
      rationale: "Frequent headaches or lightheadedness may reflect sleep disruption, hydration deficits, or sustained muscular tension.",
      icon_name: "Activity",
    });
  }

  // 5. Sleep & Recovery
  if ((lifestyle.sleep_hours || 7) < 6) {
    risks.push({
      condition: "Sleep Deprivation & Systemic Recovery",
      risk_level: "Medium",
      rationale: `Reported sleep of ${lifestyle.sleep_hours} hours is below the recommended 7-9 hours, which can heighten daytime fatigue and cortisol.`,
      icon_name: "Moon",
    });
  }

  // Filter: Only keep Medium and High risks if any exist; otherwise show positive general wellness card
  const prioritizedRisks = risks.filter((r) => r.risk_level === "High" || r.risk_level === "Medium");

  const finalRisks =
    prioritizedRisks.length > 0
      ? prioritizedRisks
      : [
          {
            condition: "General Wellness Profile",
            risk_level: "Low" as const,
            rationale: "Your biometric measurements and lifestyle habits reflect a balanced, low-risk baseline without acute red flags.",
            icon_name: "Activity",
          },
        ];

  // Overall Risk Level
  const hasHigh = finalRisks.some((r) => r.risk_level === "High");
  const hasMedium = finalRisks.some((r) => r.risk_level === "Medium");
  const overall_risk_level: "Low" | "Medium" | "High" = hasHigh ? "High" : hasMedium ? "Medium" : "Low";

  // Recommendations
  const recommendations: string[] = [];
  if (hasHigh || hasChestPain) {
    recommendations.push("Schedule a comprehensive medical evaluation with a physician to review reported symptoms.");
  }
  if (bmiCategory === "Obesity" || bmiCategory === "Overweight") {
    recommendations.push("Work with a dietitian on a calorie-conscious, whole-food nutritional plan rich in dietary fiber.");
  } else if (bmiCategory === "Severe Thinness") {
    recommendations.push("Consult a healthcare provider or nutritionist promptly for a safe weight restoration and nutritional recovery plan.");
  } else if (bmiCategory === "Underweight") {
    recommendations.push("Consult a nutritionist to incorporate nutrient-dense whole foods to reach a healthy weight.");
  }
  if (hasSubstances) {
    recommendations.push("Explore supportive cessation resources to reduce tobacco and chemical oral substance exposure.");
  }
  if ((lifestyle.sleep_hours || 7) < 7) {
    recommendations.push("Establish a restorative bedtime routine to reach at least 7.5 hours of continuous nightly sleep.");
  }
  if ((lifestyle.water_liters || 2) < 2) {
    recommendations.push("Aim for at least 2.0 liters of daily hydration throughout the day.");
  }
  if (recommendations.length < 3) {
    recommendations.push("Maintain 150 minutes of weekly moderate aerobic physical activity such as brisk walking.");
  }

  const summary = `Based on your recorded measurements and lifestyle inputs, your BMI is ${bmi} (${bmiCategory}). With ${symptoms.length} reported symptom(s) and your daily habits, your overall wellness risk indicator is categorized as ${overall_risk_level}.`;

  return {
    overall_risk_level,
    summary,
    risks: finalRisks,
    recommendations,
    disclaimer: "This is not a medical diagnosis. Please consult a qualified healthcare professional.",
  };
}

/**
 * Invokes LLM-driven dynamic health risk assessment (Step 3).
 * Connects to Edge Function 'analyze-health' with resilient fallback on network failure.
 */
export async function analyzeHealthAssessment(
  record: AssessmentRecord,
  isDemo = false
): Promise<HealthAnalysisResult> {
  if (isDemo || !isSupabaseConfigured) {
    return generateDemoHealthAnalysis(record);
  }

  try {
    const { data, error } = await supabase.functions.invoke("analyze-health", {
      body: record,
    });

    if (error) {
      const parsed = await parseEdgeFunctionError(error, data);
      throw new Error(`Assessment analysis failed: ${parsed.userMessage}`);
    }

    if (data?.error) {
      const parsed = await parseEdgeFunctionError(null, data);
      throw new Error(`Assessment analysis failed: ${parsed.userMessage}`);
    }

    const validated = validateHealthAnalysisOutput(data);
    if (!validated) {
      throw new Error("AI assessment response failed schema validation. Please retry.");
    }

    return validated;
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to communicate with AI health assessment engine";
    throw new Error(message);
  }
}


