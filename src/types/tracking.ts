import { z } from "zod";

/**
 * Mood rating scale:
 * 1 = Terrible, 2 = Low, 3 = Okay, 4 = Good, 5 = Great
 */
export type MoodScore = 1 | 2 | 3 | 4 | 5;

/**
 * Fatigue rating scale:
 * 1 = Minimal / Refreshed, 5 = Severe / Exhausted
 */
export type FatigueScore = 1 | 2 | 3 | 4 | 5;

/**
 * Source of body measurement record
 */
export type MeasurementSource = "assessment" | "checkin" | "manual";

/**
 * Supported tracking query time ranges
 */
export type TimeRange = "7d" | "30d" | "90d" | "all";

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const CheckinDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const DailyCheckinInputSchema = z.object({
  checkin_date: z
    .string()
    .regex(CheckinDateRegex, "Invalid date format. Expected YYYY-MM-DD."),
  mood: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  sleep_hours: z
    .number()
    .min(0, "Sleep hours cannot be negative.")
    .max(24, "Sleep hours cannot exceed 24."),
  water_ml: z
    .number()
    .int("Water intake must be an integer (ml).")
    .min(0, "Water intake cannot be negative.")
    .max(10000, "Water intake cannot exceed 10,000 ml."),
  energy: z
    .number()
    .int()
    .min(1, "Energy rating must be between 1 and 10.")
    .max(10, "Energy rating must be between 1 and 10."),
  fatigue: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  activity_minutes: z
    .number()
    .int()
    .min(0, "Activity minutes cannot be negative.")
    .max(1440, "Activity minutes cannot exceed 1440 (24 hours).")
    .default(0),
  note: z
    .string()
    .max(500, "Notes cannot exceed 500 characters.")
    .nullable()
    .optional(),
});

export type DailyCheckinInput = z.infer<typeof DailyCheckinInputSchema>;

export interface DailyCheckin extends DailyCheckinInput {
  id?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export const BodyMeasurementInputSchema = z.object({
  weight_kg: z
    .number()
    .min(20, "Weight must be at least 20 kg.")
    .max(350, "Weight must be 350 kg or less."),
  height_cm: z
    .number()
    .min(50, "Height must be at least 50 cm.")
    .max(260, "Height must be 260 cm or less.")
    .nullable()
    .optional(),
  bmi: z
    .number()
    .min(5, "BMI must be at least 5.")
    .max(100, "BMI must be 100 or less.")
    .nullable()
    .optional(),
  source: z.enum(["assessment", "checkin", "manual"]),
  measured_at: z.string().optional(),
});

export type BodyMeasurementInput = z.infer<typeof BodyMeasurementInputSchema>;

export interface BodyMeasurement extends BodyMeasurementInput {
  id?: string;
  user_id?: string;
  measured_at: string;
  created_at?: string;
}

// ============================================================================
// ACHIEVEMENTS & MILESTONES
// ============================================================================

export type AchievementKey =
  | "first_checkin"
  | "streak_3"
  | "streak_7"
  | "streak_14"
  | "streak_30"
  | "sleep_goal_7"
  | "hydration_goal_7"
  | "first_week_complete"
  | "first_assessment";

export interface UserAchievement {
  id?: string;
  user_id?: string;
  key: AchievementKey | string;
  unlocked_at: string;
}

export interface AchievementMeta {
  key: AchievementKey;
  title: string;
  description: string;
  iconName: string;
  category: "consistency" | "habits" | "milestone";
}

export const SYSTEM_ACHIEVEMENTS: Record<AchievementKey, AchievementMeta> = {
  first_checkin: {
    key: "first_checkin",
    title: "First Step",
    description: "Completed your very first daily wellness check-in.",
    iconName: "Sparkles",
    category: "milestone",
  },
  streak_3: {
    key: "streak_3",
    title: "Momentum Builder",
    description: "Maintained a 3-day wellness check-in streak.",
    iconName: "Flame",
    category: "consistency",
  },
  streak_7: {
    key: "streak_7",
    title: "One Week Strong",
    description: "Logged daily check-ins for 7 consecutive days.",
    iconName: "Award",
    category: "consistency",
  },
  streak_14: {
    key: "streak_14",
    title: "Habit Pioneer",
    description: "Sustained a continuous 14-day check-in streak.",
    iconName: "Zap",
    category: "consistency",
  },
  streak_30: {
    key: "streak_30",
    title: "Wellness Master",
    description: "Celebrated a full month of daily health reflection.",
    iconName: "Trophy",
    category: "consistency",
  },
  sleep_goal_7: {
    key: "sleep_goal_7",
    title: "Rest Guardian",
    description: "Met your rest target (7+ hours) 7 times.",
    iconName: "Moon",
    category: "habits",
  },
  hydration_goal_7: {
    key: "hydration_goal_7",
    title: "Hydration Hero",
    description: "Reached 2,000ml hydration target 7 times.",
    iconName: "Droplet",
    category: "habits",
  },
  first_week_complete: {
    key: "first_week_complete",
    title: "Full Week Dedication",
    description: "Logged 7 days of comprehensive health vitals.",
    iconName: "CalendarCheck",
    category: "milestone",
  },
  first_assessment: {
    key: "first_assessment",
    title: "Discovery Pioneer",
    description: "Completed an initial health or symptoms consultation.",
    iconName: "Activity",
    category: "milestone",
  },
};

// ============================================================================
// MOOD & FATIGUE METADATA
// ============================================================================

export interface MoodOption {
  value: MoodScore;
  label: string;
  emoji: string;
  colorClass: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { value: 1, label: "Terrible", emoji: "😢", colorClass: "text-rose-600 bg-rose-50 border-rose-200" },
  { value: 2, label: "Low", emoji: "🙁", colorClass: "text-amber-600 bg-amber-50 border-amber-200" },
  { value: 3, label: "Okay", emoji: "😐", colorClass: "text-slate-600 bg-slate-50 border-slate-200" },
  { value: 4, label: "Good", emoji: "🙂", colorClass: "text-teal-600 bg-teal-50 border-teal-200" },
  { value: 5, label: "Great", emoji: "😄", colorClass: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];

export interface FatigueOption {
  value: FatigueScore;
  label: string;
  description: string;
}

export const FATIGUE_OPTIONS: FatigueOption[] = [
  { value: 1, label: "Minimal", description: "Energized, well-rested" },
  { value: 2, label: "Mild", description: "Slight tiredness" },
  { value: 3, label: "Moderate", description: "Noticeable fatigue, manageable" },
  { value: 4, label: "High", description: "Sluggish, struggling to focus" },
  { value: 5, label: "Severe", description: "Exhausted, low capacity" },
];
