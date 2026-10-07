// Milestone 2: Report Generation Service
// Builds strongly typed, validated, non-diagnostic wellness summaries.

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { AssessmentRecord, fetchUserAssessments } from "./healthService";
import { ChatSession } from "@/types/chat";
import {
  ReportData,
  ReportDataSchema,
  ReportEditPayload,
  ProfileDemographics,
  MANDATORY_REPORT_DISCLAIMER,
  SymptomTimelineItem,
} from "@/types/report";

const DEMO_PROFILES_KEY = "healthai_demo_profile_demographics";

/**
 * Computes a deterministic short verification code for printed and offline reports.
 */
export function generateVerificationCode(id: string, timestamp: string): string {
  const combined = `${id}_${timestamp}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
  return `V-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

/**
 * Evaluates lifestyle data into a 0-100 activity & habits score with rating.
 */
export function calculateActivityScore(lifestyle?: AssessmentRecord["lifestyle_data"]): {
  score: number;
  rating: "Low" | "Moderate" | "Optimal" | "Not evaluated";
} {
  if (!lifestyle || Object.keys(lifestyle).length === 0) {
    return { score: 50, rating: "Not evaluated" };
  }

  let points = 0;
  let evaluatedCategories = 0;

  // 1. Sleep Evaluation (up to 35 pts)
  if (typeof lifestyle.sleep_hours === "number" && lifestyle.sleep_hours > 0) {
    evaluatedCategories++;
    if (lifestyle.sleep_hours >= 7 && lifestyle.sleep_hours <= 9) {
      points += 35;
    } else if (lifestyle.sleep_hours >= 6 && lifestyle.sleep_hours <= 10) {
      points += 25;
    } else {
      points += 15;
    }
  }

  // 2. Hydration Evaluation (up to 35 pts)
  if (typeof lifestyle.water_liters === "number" && lifestyle.water_liters > 0) {
    evaluatedCategories++;
    if (lifestyle.water_liters >= 2) {
      points += 35;
    } else if (lifestyle.water_liters >= 1.5) {
      points += 25;
    } else {
      points += 15;
    }
  }

  // 3. Activity Level Evaluation (up to 30 pts)
  if (lifestyle.activity_level) {
    evaluatedCategories++;
    const level = lifestyle.activity_level.toLowerCase();
    if (level.includes("high") || level.includes("active") || level.includes("vigorous")) {
      points += 30;
    } else if (level.includes("moderate") || level.includes("medium")) {
      points += 25;
    } else {
      points += 15;
    }
  }

  if (evaluatedCategories === 0) {
    return { score: 50, rating: "Not evaluated" };
  }

  // Normalize if only some categories were answered
  const maxPossible = evaluatedCategories === 1 ? 35 : evaluatedCategories === 2 ? 70 : 100;
  const normalizedScore = Math.min(100, Math.round((points / maxPossible) * 100));

  let rating: "Low" | "Moderate" | "Optimal" = "Moderate";
  if (normalizedScore >= 80) rating = "Optimal";
  else if (normalizedScore < 60) rating = "Low";

  return { score: normalizedScore, rating };
}

/**
 * Returns deterministic, safe rule-based questions for the doctor discussion section.
 */
export function getFallbackDoctorQuestions(
  riskLevel: "Low" | "Medium" | "High",
  symptoms: string[],
  bmiCategory?: string
): string[] {
  const primarySymptom = symptoms.length > 0 ? symptoms.slice(0, 2).join(" and ") : "general wellness";

  if (riskLevel === "Low") {
    return [
      "Are there any age-appropriate preventive health screenings I should schedule this year?",
      `What dietary or sleep modifications would best support my energy and wellness?`,
      "Are my current physical activity habits optimal for long-term cardiovascular health?",
      "Should we monitor any specific routine biomarkers based on my personal family background?",
    ];
  }

  const questions = [
    `Could my reported symptom of ${primarySymptom} indicate an underlying issue worth evaluating?`,
    "What diagnostic tests, routine blood panels, or physical exams do you recommend?",
    "Are there specific warning signs or changes in severity that should prompt immediate medical follow-up?",
    "What evidence-based lifestyle or nutritional adjustments should I prioritize before our next check-in?",
  ];

  if (bmiCategory && bmiCategory !== "Normal weight") {
    questions.push(`How does my BMI category (${bmiCategory}) influence my overall metabolic and cardiovascular risk?`);
  } else {
    questions.push("How often would you suggest I schedule routine follow-up check-ins for these concerns?");
  }

  return questions.slice(0, 6);
}

/**
 * Pure builder function: constructs and validates ReportData from raw inputs.
 * Never invents data; explicitly marks missing fields as 'Not provided'.
 */
export function buildReportData(
  assessment: AssessmentRecord,
  profile?: ProfileDemographics | null,
  session?: ChatSession | null
): ReportData {
  const assessmentId = assessment.id || `rec-${Date.now()}`;
  const timestamp = assessment.created_at || new Date().toISOString();
  const dateObj = new Date(timestamp);
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "Recent";

  // 1. Header
  const header = {
    appName: "Health Companion AI",
    reportTitle: "Personal Health & Wellness Summary",
    generatedDate: formattedDate,
    reportId: `HCA-${assessmentId.slice(0, 8).toUpperCase()}`,
  };

  // 2. Patient Details
  const patient = {
    name: profile?.full_name?.trim() || "Not provided",
    age: typeof profile?.age === "number" && profile.age > 0 ? `${profile.age} years` : "Not provided",
    gender: profile?.gender?.trim() || "Not provided",
    height: assessment.height_cm ? `${assessment.height_cm} cm` : "Not provided",
    weight: assessment.weight_kg ? `${assessment.weight_kg} kg` : "Not provided",
    bmi: typeof assessment.bmi === "number" ? `${assessment.bmi}` : "Not provided",
    bmiCategory: assessment.bmi_category || "Not provided",
  };

  // 3. Symptoms Timeline
  const symptomsList = assessment.symptoms || [];
  const primaryConcern = symptomsList.length > 0 ? symptomsList[0] : "General wellness consultation";
  const duration = (assessment.chat_summary_data?.duration as string) || "Noted during consultation";
  const intensity = (assessment.chat_summary_data?.intensity as string) || "Self-reported";

  const timeline: SymptomTimelineItem[] =
    symptomsList.length > 0
      ? symptomsList.map((symptom, idx) => ({
          symptom,
          duration: idx === 0 ? duration : "Associated concern",
          intensity: idx === 0 ? intensity : "Reported",
          order: idx + 1,
        }))
      : [
          {
            symptom: "No acute symptoms reported",
            duration: "Routine check-in",
            intensity: "None",
            order: 1,
          },
        ];

  const symptomsSection = {
    primaryConcern,
    timeline,
  };

  // 4. Lifestyle Section
  const lifestyle = assessment.lifestyle_data;
  const { score: activityScore, rating: activityScoreRating } = calculateActivityScore(lifestyle);
  const lifestyleSection = {
    sleepHours:
      typeof lifestyle?.sleep_hours === "number" ? `${lifestyle.sleep_hours} hrs/night` : "Not provided",
    hydrationLiters:
      typeof lifestyle?.water_liters === "number" ? `${lifestyle.water_liters} L/day` : "Not provided",
    activityLevel: lifestyle?.activity_level || "Not provided",
    activityScore,
    activityScoreRating,
  };

  // 5. Risk Assessment
  const riskSection = {
    level: assessment.risk_level,
    reason:
      assessment.ai_summary ||
      `Categorical risk evaluated as ${assessment.risk_level} based on self-reported inputs.`,
    disclaimer: MANDATORY_REPORT_DISCLAIMER,
  };

  // 6. Lifestyle Recommendations
  const recommendationsSection = {
    items:
      assessment.recommendations && assessment.recommendations.length > 0
        ? assessment.recommendations
        : [
            "Maintain consistent daily sleep and hydration habits.",
            "Schedule regular physical activity suited to your comfort level.",
            "Discuss any persistent or changing symptoms with a healthcare professional.",
          ],
  };

  // 7. Doctor Discussion Points
  let questions: string[] = [];
  const chatQuestions = assessment.chat_summary_data?.doctor_questions;
  if (Array.isArray(chatQuestions) && chatQuestions.length >= 2) {
    questions = chatQuestions.filter((q): q is string => typeof q === "string").slice(0, 6);
  }
  if (questions.length < 2) {
    questions = getFallbackDoctorQuestions(assessment.risk_level, symptomsList, assessment.bmi_category);
  }

  const doctorQuestionsSection = {
    questions,
  };

  // 8. Footer
  const footer = {
    disclaimer: MANDATORY_REPORT_DISCLAIMER,
    reportId: header.reportId,
    verificationCode: generateVerificationCode(assessmentId, timestamp),
  };

  // Check for saved user edits
  const edits = (assessment.chat_summary_data?.edited_report || assessment.lifestyle_data?.edited_report) as
    | ReportEditPayload
    | undefined;

  const rawReport: ReportData = {
    id: assessmentId,
    source: assessment.source === "chat" ? "chat" : "assessment",
    header,
    patient,
    symptoms: {
      primaryConcern: edits?.primaryConcern || symptomsSection.primaryConcern,
      timeline: edits?.timeline && edits.timeline.length > 0 ? edits.timeline : symptomsSection.timeline,
    },
    lifestyle: {
      ...lifestyleSection,
      sleepHours: edits?.sleepHours || lifestyleSection.sleepHours,
      hydrationLiters: edits?.hydrationLiters || lifestyleSection.hydrationLiters,
      activityLevel: edits?.activityLevel || lifestyleSection.activityLevel,
    },
    risk: {
      ...riskSection,
      reason: edits?.riskReason || riskSection.reason,
    },
    recommendations: {
      items:
        edits?.recommendations && edits.recommendations.length > 0
          ? edits.recommendations
          : recommendationsSection.items,
    },
    doctorQuestions: {
      questions:
        edits?.doctorQuestions && edits.doctorQuestions.length >= 2
          ? edits.doctorQuestions
          : doctorQuestionsSection.questions,
    },
    footer,
    isEdited: Boolean(edits),
    lastEditedAt: edits?.lastEditedAt,
  };

  return ReportDataSchema.parse(rawReport);
}

/**
 * Fetches user profile demographics for report personalization.
 */
export async function fetchProfileDemographics(
  userId: string,
  isDemo = false
): Promise<ProfileDemographics | null> {
  if (isDemo || !isSupabaseConfigured) {
    const raw = localStorage.getItem(DEMO_PROFILES_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    return {
      full_name: "Demo Patient",
      age: 29,
      gender: "Not specified",
      date_of_birth: null,
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, age, gender, date_of_birth")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile demographics:", error);
    return null;
  }

  return data;
}

/**
 * Updates user profile demographics.
 */
export async function updateProfileDemographics(
  userId: string,
  demographics: ProfileDemographics,
  isDemo = false
): Promise<ProfileDemographics> {
  if (isDemo || !isSupabaseConfigured) {
    localStorage.setItem(DEMO_PROFILES_KEY, JSON.stringify(demographics));
    return demographics;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: demographics.full_name,
      age: demographics.age,
      gender: demographics.gender,
      date_of_birth: demographics.date_of_birth,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("full_name, age, gender, date_of_birth")
    .single();

  if (error) {
    console.error("Error updating profile demographics:", error);
    throw error;
  }

  return data;
}

/**
 * Loads the complete ReportData for a specific assessment record.
 */
export async function fetchReportData(
  assessmentId: string,
  userId: string,
  isDemo = false
): Promise<ReportData> {
  const assessments = await fetchUserAssessments(userId, isDemo);
  const assessment = assessments.find((a) => a.id === assessmentId);

  if (!assessment) {
    throw new Error("Report not found or access denied.");
  }

  const profile = await fetchProfileDemographics(userId, isDemo);
  return buildReportData(assessment, profile);
}

/**
 * Saves user modifications to report sections, making it doctor-ready.
 */
export async function saveReportEdits(
  assessmentId: string,
  edits: ReportEditPayload,
  userId: string,
  isDemo = false
): Promise<ReportData> {
  const payloadWithTimestamp: ReportEditPayload = {
    ...edits,
    lastEditedAt: new Date().toISOString(),
  };

  if (isDemo || !isSupabaseConfigured) {
    const raw = localStorage.getItem("healthai_demo_assessments");
    if (raw) {
      try {
        const records: AssessmentRecord[] = JSON.parse(raw);
        const idx = records.findIndex((a) => a.id === assessmentId);
        if (idx !== -1) {
          records[idx] = {
            ...records[idx],
            chat_summary_data: {
              ...(records[idx].chat_summary_data || {}),
              edited_report: payloadWithTimestamp,
            },
          };
          localStorage.setItem("healthai_demo_assessments", JSON.stringify(records));
        }
      } catch (err) {
        console.error("Error updating demo assessment edits:", err);
      }
    }
    return fetchReportData(assessmentId, userId, true);
  }

  // Fetch current assessment from Supabase to preserve existing chat_summary_data
  const { data: existing, error: fetchErr } = await supabase
    .from("health_assessments")
    .select("chat_summary_data")
    .eq("id", assessmentId)
    .eq("user_id", userId)
    .single();

  if (fetchErr) {
    console.error("Error fetching assessment to save edits:", fetchErr);
    throw fetchErr;
  }

  const currentSummary = (existing?.chat_summary_data as Record<string, unknown>) || {};
  const updatedSummary = {
    ...currentSummary,
    edited_report: payloadWithTimestamp,
  };

  const { error: updateErr } = await supabase
    .from("health_assessments")
    .update({ chat_summary_data: updatedSummary })
    .eq("id", assessmentId)
    .eq("user_id", userId);

  if (updateErr) {
    console.error("Error saving report edits to Supabase:", updateErr);
    throw updateErr;
  }

  return fetchReportData(assessmentId, userId, false);
}

/**
 * Resets user modifications back to the original AI generated consultation or assessment.
 */
export async function resetReportEdits(
  assessmentId: string,
  userId: string,
  isDemo = false
): Promise<ReportData> {
  if (isDemo || !isSupabaseConfigured) {
    const raw = localStorage.getItem("healthai_demo_assessments");
    if (raw) {
      try {
        const records: AssessmentRecord[] = JSON.parse(raw);
        const idx = records.findIndex((a) => a.id === assessmentId);
        if (idx !== -1 && records[idx].chat_summary_data) {
          const updatedSummary = { ...records[idx].chat_summary_data };
          delete (updatedSummary as Record<string, unknown>).edited_report;
          records[idx] = {
            ...records[idx],
            chat_summary_data: updatedSummary,
          };
          localStorage.setItem("healthai_demo_assessments", JSON.stringify(records));
        }
      } catch (err) {
        console.error("Error resetting demo assessment edits:", err);
      }
    }
    return fetchReportData(assessmentId, userId, true);
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("health_assessments")
    .select("chat_summary_data")
    .eq("id", assessmentId)
    .eq("user_id", userId)
    .single();

  if (fetchErr) {
    throw fetchErr;
  }

  const currentSummary = { ...((existing?.chat_summary_data as Record<string, unknown>) || {}) };
  delete currentSummary.edited_report;

  const { error: updateErr } = await supabase
    .from("health_assessments")
    .update({ chat_summary_data: currentSummary })
    .eq("id", assessmentId)
    .eq("user_id", userId);

  if (updateErr) {
    throw updateErr;
  }

  return fetchReportData(assessmentId, userId, false);
}

