import { describe, it, expect } from "vitest";
import {
  getCalendarDayDifference,
  getPastCalendarDates,
  calculateStreakStats,
  evaluateAchievements,
  getEnrichedAchievements,
} from "./streaks";
import { DailyCheckin, UserAchievement } from "@/types/tracking";

describe("Milestone 3 (Phase 3): Streaks & Achievements Engine", () => {
  describe("Calendar Date Math & DST Safety", () => {
    it("computes calendar day difference across months accurately without DST skew", () => {
      expect(getCalendarDayDifference("2026-09-30", "2026-10-01")).toBe(1);
      expect(getCalendarDayDifference("2026-02-28", "2026-03-01")).toBe(1);
      expect(getCalendarDayDifference("2026-10-01", "2026-10-10")).toBe(9);
      expect(getCalendarDayDifference("2026-10-04", "2026-10-04")).toBe(0);
    });

    it("generates past calendar dates sequence accurately", () => {
      const dates = getPastCalendarDates("2026-10-04", 4);
      expect(dates).toEqual(["2026-10-04", "2026-10-03", "2026-10-02", "2026-10-01"]);
    });
  });

  describe("calculateStreakStats - Core Streaks & Edge Cases", () => {
    const today = "2026-10-04";
    const yesterday = "2026-10-03";
    const twoDaysAgo = "2026-10-02";
    const threeDaysAgo = "2026-10-01";

    it("handles empty or invalid checkin dates gracefully with positive messaging", () => {
      const stats = calculateStreakStats([], today);
      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(0);
      expect(stats.isTodayCompleted).toBe(false);
      expect(stats.streakMessage).toBe("Welcome back, start a new streak today");
      expect(stats.streakMessage).not.toMatch(/lost|failed|broken|missed/i);
    });

    it("computes a 1-day streak when today is completed", () => {
      const stats = calculateStreakStats([today], today);
      expect(stats.currentStreak).toBe(1);
      expect(stats.longestStreak).toBe(1);
      expect(stats.isTodayCompleted).toBe(true);
      expect(stats.streakMessage).toContain("Great job starting your streak today");
    });

    it("PRESERVES streak when today is pending but yesterday was completed", () => {
      // 3 consecutive days ending yesterday: Oct 1, Oct 2, Oct 3
      const dates = [threeDaysAgo, twoDaysAgo, yesterday];
      const stats = calculateStreakStats(dates, today);

      expect(stats.isTodayCompleted).toBe(false);
      expect(stats.currentStreak).toBe(3); // Streak is STILL ALIVE!
      expect(stats.longestStreak).toBe(3);
      expect(stats.streakMessage).toContain("You're on a 3-day streak! Check in today to keep it going.");
    });

    it("resets current streak gently when both today and yesterday were missed (gap)", () => {
      // Checked in on Oct 1 and Oct 2, but missed Oct 3 (yesterday) and Oct 4 (today)
      const dates = [threeDaysAgo, twoDaysAgo];
      const stats = calculateStreakStats(dates, today);

      expect(stats.isTodayCompleted).toBe(false);
      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(2); // Personal best preserved!
      expect(stats.streakMessage).toBe("Welcome back, start a new streak today");
      // Strictly no guilt or loss warning
      expect(stats.streakMessage).not.toMatch(/lost|broken|failed/i);
    });

    it("merges disjoint streaks when a missed day is back-filled", () => {
      // User initially had Oct 1 and Oct 3 logged (gap on Oct 2)
      const initialDates = ["2026-10-01", "2026-10-03", "2026-10-04"];
      const initialStats = calculateStreakStats(initialDates, today);
      expect(initialStats.currentStreak).toBe(2); // Oct 3 and Oct 4

      // User back-fills Oct 2
      const backfilledDates = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];
      const updatedStats = calculateStreakStats(backfilledDates, today);
      expect(updatedStats.currentStreak).toBe(4);
      expect(updatedStats.longestStreak).toBe(4);
    });

    it("tracks historical longest streak across past gaps", () => {
      // 5-day streak in September, then 2-day current streak in October
      const dates = [
        "2026-09-10",
        "2026-09-11",
        "2026-09-12",
        "2026-09-13",
        "2026-09-14", // 5 days
        // gap
        yesterday,
        today, // 2 days
      ];

      const stats = calculateStreakStats(dates, today);
      expect(stats.currentStreak).toBe(2);
      expect(stats.longestStreak).toBe(5);
    });

    it("computes 7-day and 30-day completion rates correctly", () => {
      // Logged today, yesterday, and 2 days ago (3 of 7 days)
      const dates = [today, yesterday, twoDaysAgo];
      const stats = calculateStreakStats(dates, today);

      expect(stats.completionRate7d).toBe(Math.round((3 / 7) * 100)); // 43%
      expect(stats.completionRate30d).toBe(Math.round((3 / 30) * 100)); // 10%
    });
  });

  describe("evaluateAchievements - Milestone Unlock Rules", () => {
    const today = "2026-10-04";

    it("unlocks first_assessment when assessment exists even without checkins", () => {
      const unlocked = evaluateAchievements([], true, today);
      expect(unlocked).toEqual(["first_assessment"]);
    });

    it("unlocks first_checkin on very first check-in", () => {
      const checkins: DailyCheckin[] = [
        {
          checkin_date: today,
          mood: 4,
          sleep_hours: 8,
          water_ml: 1500,
          energy: 7,
          fatigue: 2,
          activity_minutes: 30,
        },
      ];

      const unlocked = evaluateAchievements(checkins, false, today);
      expect(unlocked).toContain("first_checkin");
      expect(unlocked).not.toContain("streak_3");
    });

    it("unlocks streak milestones and habit goals when criteria are met", () => {
      // 7 consecutive days meeting sleep and hydration goals
      const checkins: DailyCheckin[] = [];
      for (let i = 6; i >= 0; i--) {
        const [y, m, d] = today.split("-").map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d - i));
        const dtStr = dt.toISOString().split("T")[0];

        checkins.push({
          checkin_date: dtStr,
          mood: 4,
          sleep_hours: 7.5, // >= 7h
          water_ml: 2200, // >= 2000ml
          energy: 8,
          fatigue: 2,
          activity_minutes: 30,
        });
      }

      const unlocked = evaluateAchievements(checkins, true, today);

      expect(unlocked).toContain("first_checkin");
      expect(unlocked).toContain("streak_3");
      expect(unlocked).toContain("streak_7");
      expect(unlocked).toContain("sleep_goal_7");
      expect(unlocked).toContain("hydration_goal_7");
      expect(unlocked).toContain("first_week_complete");
      expect(unlocked).toContain("first_assessment");
      expect(unlocked).not.toContain("streak_14");
    });
  });

  describe("getEnrichedAchievements - Showcase Status Mapping", () => {
    it("enriches achievements with unlocked status and timestamps", () => {
      const unlockedRecords: UserAchievement[] = [
        {
          id: "ach-1",
          key: "first_checkin",
          unlocked_at: "2026-10-01T10:00:00.000Z",
        },
        {
          id: "ach-2",
          key: "streak_3",
          unlocked_at: "2026-10-03T10:00:00.000Z",
        },
      ];

      const enriched = getEnrichedAchievements(unlockedRecords);

      const firstCheckin = enriched.find((a) => a.key === "first_checkin");
      expect(firstCheckin?.isUnlocked).toBe(true);
      expect(firstCheckin?.unlockedAt).toBe("2026-10-01T10:00:00.000Z");

      const streak7 = enriched.find((a) => a.key === "streak_7");
      expect(streak7?.isUnlocked).toBe(false);
      expect(streak7?.unlockedAt).toBeUndefined();
    });
  });
});
