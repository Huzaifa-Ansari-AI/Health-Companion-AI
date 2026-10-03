import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  DailyCheckin,
  DailyCheckinInput,
  DailyCheckinInputSchema,
  BodyMeasurement,
  BodyMeasurementInput,
  BodyMeasurementInputSchema,
  UserAchievement,
  AchievementKey,
} from "@/types/tracking";

// ============================================================================
// STORAGE KEYS FOR DEMO MODE
// ============================================================================
const DEMO_CHECKINS_KEY = "healthai_demo_daily_checkins";
const DEMO_MEASUREMENTS_KEY = "healthai_demo_body_measurements";
const DEMO_ACHIEVEMENTS_KEY = "healthai_demo_user_achievements";

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== "undefined" && "localStorage" in globalThis && globalThis.localStorage) {
    return globalThis.localStorage as Storage;
  }
  return null;
}

/**
 * Returns a local calendar date formatted as YYYY-MM-DD.
 * Preserves user's local timezone rather than UTC conversion.
 */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates a past date relative to local today.
 */
export function getPastLocalDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return formatLocalDate(d);
}

// Initial realistic demo checkins (last 10 days)
function getInitialDemoCheckins(): DailyCheckin[] {
  const list: DailyCheckin[] = [];
  const baseWeights = [70.5, 70.4, 70.3, 70.1, 70.2, 70.0, 69.9, 69.8, 69.7, 69.6];

  for (let i = 9; i >= 0; i--) {
    const dateStr = getPastLocalDate(i);
    const dayIndex = 9 - i;
    list.push({
      id: `demo-chk-${dayIndex}`,
      user_id: "demo-user-123",
      checkin_date: dateStr,
      mood: dayIndex % 4 === 0 ? 3 : dayIndex % 3 === 0 ? 5 : 4,
      sleep_hours: dayIndex % 3 === 0 ? 6.5 : dayIndex % 2 === 0 ? 8.0 : 7.2,
      water_ml: 1750 + (dayIndex * 100) % 750,
      energy: dayIndex % 2 === 0 ? 8 : 7,
      fatigue: dayIndex % 3 === 0 ? 3 : 2,
      activity_minutes: dayIndex % 2 === 0 ? 30 : 45,
      note: dayIndex === 0 ? "Felt energized after morning walk." : null,
      created_at: `${dateStr}T10:00:00.000Z`,
      updated_at: `${dateStr}T10:00:00.000Z`,
    });
  }
  return list;
}

function getInitialDemoMeasurements(): BodyMeasurement[] {
  const weights = [71.2, 70.8, 70.5, 70.2, 69.8, 69.6];
  return weights.map((w, idx) => {
    const dateStr = getPastLocalDate((5 - idx) * 4);
    return {
      id: `demo-meas-${idx}`,
      user_id: "demo-user-123",
      measured_at: `${dateStr}T08:30:00.000Z`,
      weight_kg: w,
      height_cm: 175,
      bmi: Number((w / (1.75 * 1.75)).toFixed(1)),
      source: idx === 0 ? "assessment" : "checkin",
      created_at: `${dateStr}T08:30:00.000Z`,
    };
  });
}

function getInitialDemoAchievements(): UserAchievement[] {
  return [
    {
      id: "demo-ach-1",
      user_id: "demo-user-123",
      key: "first_checkin",
      unlocked_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      id: "demo-ach-2",
      user_id: "demo-user-123",
      key: "streak_3",
      unlocked_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: "demo-ach-3",
      user_id: "demo-user-123",
      key: "streak_7",
      unlocked_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
  ];
}

// ============================================================================
// DAILY CHECKINS CRUD
// ============================================================================

/**
 * Upserts a daily check-in for the specified local calendar date.
 * If an entry already exists for that user and date, it updates the record.
 */
export async function upsertDailyCheckin(
  userId: string,
  input: DailyCheckinInput,
  isDemo = false
): Promise<DailyCheckin> {
  const validated = DailyCheckinInputSchema.parse(input);

  if (isDemo || !isSupabaseConfigured) {
    const storage = getStorage();
    const raw = storage?.getItem(DEMO_CHECKINS_KEY);
    const checkins: DailyCheckin[] = raw ? JSON.parse(raw) : getInitialDemoCheckins();

    const existingIndex = checkins.findIndex(
      (c) => c.user_id === userId && c.checkin_date === validated.checkin_date
    );

    const nowIso = new Date().toISOString();
    let saved: DailyCheckin;

    if (existingIndex >= 0) {
      saved = {
        ...checkins[existingIndex],
        ...validated,
        updated_at: nowIso,
      };
      checkins[existingIndex] = saved;
    } else {
      saved = {
        ...validated,
        id: `demo-chk-${Date.now()}`,
        user_id: userId,
        created_at: nowIso,
        updated_at: nowIso,
      };
      checkins.push(saved);
    }

    storage?.setItem(DEMO_CHECKINS_KEY, JSON.stringify(checkins));
    return saved;
  }

  // Supabase upsert on (user_id, checkin_date)
  const payload = {
    ...validated,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("daily_checkins")
    .upsert(payload, { onConflict: "user_id,checkin_date" })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Failed to save daily check-in.");
  }

  return data as DailyCheckin;
}

/**
 * Fetches check-ins for a user within a specified calendar date range (inclusive).
 */
export async function getCheckinsByRange(
  userId: string,
  startDate: string,
  endDate: string,
  isDemo = false
): Promise<DailyCheckin[]> {
  if (isDemo || !isSupabaseConfigured) {
    const storage = getStorage();
    const raw = storage?.getItem(DEMO_CHECKINS_KEY);
    const checkins: DailyCheckin[] = raw ? JSON.parse(raw) : getInitialDemoCheckins();

    return checkins
      .filter(
        (c) =>
          c.user_id === userId &&
          c.checkin_date >= startDate &&
          c.checkin_date <= endDate
      )
      .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  }

  const { data, error } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", userId)
    .gte("checkin_date", startDate)
    .lte("checkin_date", endDate)
    .order("checkin_date", { ascending: true });

  if (error) {
    throw new Error(error.message || "Failed to load check-ins range.");
  }

  return (data || []) as DailyCheckin[];
}

/**
 * Retrieves today's check-in for the user if completed, otherwise null.
 */
export async function getTodayCheckin(
  userId: string,
  todayDate: string = formatLocalDate(),
  isDemo = false
): Promise<DailyCheckin | null> {
  if (isDemo || !isSupabaseConfigured) {
    const storage = getStorage();
    const raw = storage?.getItem(DEMO_CHECKINS_KEY);
    const checkins: DailyCheckin[] = raw ? JSON.parse(raw) : getInitialDemoCheckins();
    const found = checkins.find(
      (c) => c.user_id === userId && c.checkin_date === todayDate
    );
    return found || null;
  }

  const { data, error } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("checkin_date", todayDate)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to check today's status.");
  }

  return (data as DailyCheckin) || null;
}

// ============================================================================
// BODY MEASUREMENTS CRUD
// ============================================================================

/**
 * Saves a new body measurement record (e.g. weight, optional height/BMI).
 */
export async function saveBodyMeasurement(
  userId: string,
  input: BodyMeasurementInput,
  isDemo = false
): Promise<BodyMeasurement> {
  const validated = BodyMeasurementInputSchema.parse(input);
  const nowIso = validated.measured_at || new Date().toISOString();

  if (isDemo || !isSupabaseConfigured) {
    const storage = getStorage();
    const raw = storage?.getItem(DEMO_MEASUREMENTS_KEY);
    const list: BodyMeasurement[] = raw ? JSON.parse(raw) : getInitialDemoMeasurements();

    const record: BodyMeasurement = {
      ...validated,
      id: `demo-meas-${Date.now()}`,
      user_id: userId,
      measured_at: nowIso,
      created_at: nowIso,
    };

    list.push(record);
    storage?.setItem(DEMO_MEASUREMENTS_KEY, JSON.stringify(list));
    return record;
  }

  const payload = {
    ...validated,
    user_id: userId,
    measured_at: nowIso,
  };

  const { data, error } = await supabase
    .from("body_measurements")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Failed to record body measurement.");
  }

  return data as BodyMeasurement;
}

/**
 * Retrieves body measurements for a user, sorted chronologically.
 */
export async function getMeasurementsByRange(
  userId: string,
  startDate?: string,
  isDemo = false
): Promise<BodyMeasurement[]> {
  if (isDemo || !isSupabaseConfigured) {
    const storage = getStorage();
    const raw = storage?.getItem(DEMO_MEASUREMENTS_KEY);
    let list: BodyMeasurement[] = raw ? JSON.parse(raw) : getInitialDemoMeasurements();

    if (startDate) {
      list = list.filter((m) => m.measured_at >= startDate);
    }
    return list.sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  }

  let query = supabase
    .from("body_measurements")
    .select("*")
    .eq("user_id", userId)
    .order("measured_at", { ascending: true });

  if (startDate) {
    query = query.gte("measured_at", startDate);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Failed to load body measurements.");
  }

  return (data || []) as BodyMeasurement[];
}

// ============================================================================
// USER ACHIEVEMENTS CRUD
// ============================================================================

/**
 * Fetches all unlocked achievements for a user.
 */
export async function getUserAchievements(
  userId: string,
  isDemo = false
): Promise<UserAchievement[]> {
  if (isDemo || !isSupabaseConfigured) {
    const storage = getStorage();
    const raw = storage?.getItem(DEMO_ACHIEVEMENTS_KEY);
    const list: UserAchievement[] = raw ? JSON.parse(raw) : getInitialDemoAchievements();
    return list.filter((a) => a.user_id === userId);
  }

  const { data, error } = await supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "Failed to load achievements.");
  }

  return (data || []) as UserAchievement[];
}

/**
 * Idempotently unlocks an achievement for a user.
 * Returns the achievement record if newly unlocked or already unlocked.
 */
export async function unlockAchievement(
  userId: string,
  key: AchievementKey,
  isDemo = false
): Promise<UserAchievement> {
  const nowIso = new Date().toISOString();

  if (isDemo || !isSupabaseConfigured) {
    const storage = getStorage();
    const raw = storage?.getItem(DEMO_ACHIEVEMENTS_KEY);
    const list: UserAchievement[] = raw ? JSON.parse(raw) : getInitialDemoAchievements();

    const existing = list.find((a) => a.user_id === userId && a.key === key);
    if (existing) {
      return existing;
    }

    const created: UserAchievement = {
      id: `demo-ach-${Date.now()}`,
      user_id: userId,
      key,
      unlocked_at: nowIso,
    };
    list.push(created);
    storage?.setItem(DEMO_ACHIEVEMENTS_KEY, JSON.stringify(list));
    return created;
  }

  // Supabase insert with ignoreDuplicates on conflict (user_id, key)
  const { data, error } = await supabase
    .from("user_achievements")
    .upsert({ user_id: userId, key, unlocked_at: nowIso }, { onConflict: "user_id,key" })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Failed to unlock achievement.");
  }

  return data as UserAchievement;
}

