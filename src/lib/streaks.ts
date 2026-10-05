import {
  DailyCheckin,
  AchievementKey,
  SYSTEM_ACHIEVEMENTS,
  UserAchievement,
} from "@/types/tracking";
import { formatLocalDate } from "@/services/trackingService";

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  isTodayCompleted: boolean;
  completionRate7d: number;
  completionRate30d: number;
  streakMessage: string;
}

/**
 * Calculates day difference between two YYYY-MM-DD date strings.
 * Operates purely on calendar year/month/date in UTC to prevent DST daylight saving shifts.
 */
export function getCalendarDayDifference(earlierDateStr: string, laterDateStr: string): number {
  const [y1, m1, d1] = earlierDateStr.split("-").map(Number);
  const [y2, m2, d2] = laterDateStr.split("-").map(Number);

  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);

  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Generates an array of past YYYY-MM-DD date strings relative to a base date.
 */
export function getPastCalendarDates(baseDateStr: string, daysCount: number): string[] {
  const [y, m, d] = baseDateStr.split("-").map(Number);
  const dates: string[] = [];

  for (let i = 0; i < daysCount; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d - i));
    const yr = dt.getUTCFullYear();
    const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const da = String(dt.getUTCDate()).padStart(2, "0");
    dates.push(`${yr}-${mo}-${da}`);
  }
  return dates;
}

/**
 * Pure function: Computes current streak, longest streak, and completion rates.
 * Rules:
 * - A streak counts consecutive calendar days with a check-in.
 * - Today not yet done does NOT break an active streak until the day ends.
 * - Positive tone only: no guilt or red "streak lost" messaging.
 */
export function calculateStreakStats(
  checkinDates: string[],
  todayDateStr: string = formatLocalDate()
): StreakStats {
  if (!checkinDates || checkinDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      isTodayCompleted: false,
      completionRate7d: 0,
      completionRate30d: 0,
      streakMessage: "Welcome back, start a new streak today",
    };
  }

  // Deduplicate and sort dates in ascending chronological order
  const uniqueSorted = Array.from(new Set(checkinDates))
    .filter((d) => Boolean(d && d.match(/^\d{4}-\d{2}-\d{2}$/)))
    .sort();

  if (uniqueSorted.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      isTodayCompleted: false,
      completionRate7d: 0,
      completionRate30d: 0,
      streakMessage: "Welcome back, start a new streak today",
    };
  }

  const dateSet = new Set(uniqueSorted);
  const isTodayCompleted = dateSet.has(todayDateStr);

  // Compute Longest Streak across all historical dates
  let longestStreak = 1;
  let currentRun = 1;

  for (let i = 1; i < uniqueSorted.length; i++) {
    const diff = getCalendarDayDifference(uniqueSorted[i - 1], uniqueSorted[i]);
    if (diff === 1) {
      currentRun++;
      if (currentRun > longestStreak) {
        longestStreak = currentRun;
      }
    } else if (diff > 1) {
      currentRun = 1;
    }
  }

  // Compute Current Streak:
  // Check if today is completed. If not, check if yesterday was completed.
  const pastDatesFromToday = getPastCalendarDates(todayDateStr, 2);
  const yesterdayStr = pastDatesFromToday[1];

  let currentStreak = 0;

  if (isTodayCompleted) {
    // Walk backwards starting from today
    let checkDateStr = todayDateStr;
    while (dateSet.has(checkDateStr)) {
      currentStreak++;
      const prevDates = getPastCalendarDates(checkDateStr, 2);
      checkDateStr = prevDates[1];
    }
  } else if (dateSet.has(yesterdayStr)) {
    // Today not yet done, but yesterday was completed -> streak is still alive!
    let checkDateStr = yesterdayStr;
    while (dateSet.has(checkDateStr)) {
      currentStreak++;
      const prevDates = getPastCalendarDates(checkDateStr, 2);
      checkDateStr = prevDates[1];
    }
  } else {
    // Neither today nor yesterday was done -> streak is 0
    currentStreak = 0;
  }

  // Update longest streak if current is somehow higher
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  // Completion rate for last 7 days (today and past 6 days)
  const last7Days = getPastCalendarDates(todayDateStr, 7);
  const completed7Count = last7Days.filter((d) => dateSet.has(d)).length;
  const completionRate7d = Math.round((completed7Count / 7) * 100);

  // Completion rate for last 30 days
  const last30Days = getPastCalendarDates(todayDateStr, 30);
  const completed30Count = last30Days.filter((d) => dateSet.has(d)).length;
  const completionRate30d = Math.round((completed30Count / 30) * 100);

  // Formulate positive message
  let streakMessage = "Welcome back, start a new streak today";
  if (currentStreak === 1) {
    streakMessage = isTodayCompleted
      ? "Great job starting your streak today! Keep the gentle momentum going."
      : "You checked in yesterday. Check in today to build your streak!";
  } else if (currentStreak > 1) {
    streakMessage = isTodayCompleted
      ? `Awesome rhythm! You're on a ${currentStreak}-day wellness streak.`
      : `You're on a ${currentStreak}-day streak! Check in today to keep it going.`;
  }

  return {
    currentStreak,
    longestStreak,
    isTodayCompleted,
    completionRate7d,
    completionRate30d,
    streakMessage,
  };
}

/**
 * Pure function: Evaluates which achievements a user is eligible to unlock.
 */
export function evaluateAchievements(
  checkins: DailyCheckin[],
  hasAssessment: boolean = false,
  todayDateStr: string = formatLocalDate()
): AchievementKey[] {
  const unlocked: AchievementKey[] = [];
  if (!checkins || checkins.length === 0) {
    if (hasAssessment) unlocked.push("first_assessment");
    return unlocked;
  }

  // 1. First check-in
  unlocked.push("first_checkin");

  // 2. Streaks
  const dates = checkins.map((c) => c.checkin_date);
  const stats = calculateStreakStats(dates, todayDateStr);

  if (stats.longestStreak >= 3 || stats.currentStreak >= 3) {
    unlocked.push("streak_3");
  }
  if (stats.longestStreak >= 7 || stats.currentStreak >= 7) {
    unlocked.push("streak_7");
  }
  if (stats.longestStreak >= 14 || stats.currentStreak >= 14) {
    unlocked.push("streak_14");
  }
  if (stats.longestStreak >= 30 || stats.currentStreak >= 30) {
    unlocked.push("streak_30");
  }

  // 3. Sleep goal (7 days with sleep >= 7h)
  const sleepGoalDays = checkins.filter((c) => typeof c.sleep_hours === "number" && c.sleep_hours >= 7).length;
  if (sleepGoalDays >= 7) {
    unlocked.push("sleep_goal_7");
  }

  // 4. Hydration goal (7 days with water >= 2000ml)
  const hydrationGoalDays = checkins.filter((c) => typeof c.water_ml === "number" && c.water_ml >= 2000).length;
  if (hydrationGoalDays >= 7) {
    unlocked.push("hydration_goal_7");
  }

  // 5. First complete week (7 distinct days logged)
  const uniqueDatesCount = new Set(dates).size;
  if (uniqueDatesCount >= 7) {
    unlocked.push("first_week_complete");
  }

  // 6. First assessment
  if (hasAssessment) {
    unlocked.push("first_assessment");
  }

  return unlocked;
}

/**
 * Compares system achievements with user's unlocked achievements.
 * Returns an enriched list with status (unlocked or locked) and unlock date.
 */
export interface DisplayAchievement {
  key: AchievementKey;
  title: string;
  description: string;
  iconName: string;
  category: "consistency" | "habits" | "milestone";
  isUnlocked: boolean;
  unlockedAt?: string;
}

export function getEnrichedAchievements(
  unlockedRecords: UserAchievement[]
): DisplayAchievement[] {
  const map = new Map<string, string>();
  unlockedRecords.forEach((rec) => {
    map.set(rec.key, rec.unlocked_at);
  });

  return (Object.keys(SYSTEM_ACHIEVEMENTS) as AchievementKey[]).map((key) => {
    const meta = SYSTEM_ACHIEVEMENTS[key];
    const isUnlocked = map.has(key);
    return {
      ...meta,
      isUnlocked,
      unlockedAt: map.get(key),
    };
  });
}
