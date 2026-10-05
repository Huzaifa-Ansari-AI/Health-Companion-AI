import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { HealthAssessmentSummary } from "@/types/chat";

export interface AssessmentRecord {
  id?: string;
  user_id?: string;
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  bmi_category?: string;
  symptoms: string[];
  lifestyle_data?: {
    sleep_hours?: number;
    activity_level?: string;
    water_liters?: number;
  };
  risk_level: "Low" | "Medium" | "High";
  ai_summary: string;
  recommendations: string[];
  disclaimer: string;
  source?: "assessment" | "chat";
  session_id?: string;
  chat_summary_data?: Record<string, unknown>;
  created_at?: string;
}

export function calculateBMI(heightCm: number, weightKg: number): { bmi: number; category: string } {
  if (heightCm <= 0 || weightKg <= 0) return { bmi: 0, category: "Unknown" };
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

  let category = "Normal weight";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi < 25) category = "Normal weight";
  else if (bmi < 30) category = "Overweight";
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
  const fullRecord: AssessmentRecord = {
    ...record,
    id: isDemo ? `demo-${Date.now()}` : undefined,
    created_at: new Date().toISOString(),
  };

  if (isDemo || !isSupabaseConfigured) {
    const current = await fetchUserAssessments("demo", true);
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

