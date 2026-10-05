import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DailyCheckinInputSchema,
  BodyMeasurementInputSchema,
  DailyCheckinInput,
  BodyMeasurementInput,
} from "@/types/tracking";
import {
  formatLocalDate,
  getPastLocalDate,
  upsertDailyCheckin,
  getCheckinsByRange,
  getTodayCheckin,
  saveBodyMeasurement,
  getMeasurementsByRange,
  getUserAchievements,
  unlockAchievement,
} from "./trackingService";
import { supabase } from "@/lib/supabase";

describe("trackingService - Validation & Local Storage Operations", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    global.localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      length: 0,
      key: () => null,
    } as Storage;
    vi.clearAllMocks();
  });

  describe("Zod Validation Schemas", () => {
    it("validates a healthy daily check-in input", () => {
      const valid: DailyCheckinInput = {
        checkin_date: "2026-10-04",
        mood: 4,
        sleep_hours: 7.5,
        water_ml: 2250,
        energy: 8,
        fatigue: 2,
        activity_minutes: 45,
        note: "Felt great after morning jog.",
      };

      const parsed = DailyCheckinInputSchema.parse(valid);
      expect(parsed.mood).toBe(4);
      expect(parsed.sleep_hours).toBe(7.5);
      expect(parsed.water_ml).toBe(2250);
    });

    it("rejects invalid mood out of 1-5 range", () => {
      expect(() => {
        DailyCheckinInputSchema.parse({
          checkin_date: "2026-10-04",
          mood: 6 as unknown as 1,
          sleep_hours: 8,
          water_ml: 2000,
          energy: 7,
          fatigue: 2,
        });
      }).toThrow();
    });

    it("rejects sleep hours over 24 or under 0", () => {
      expect(() => {
        DailyCheckinInputSchema.parse({
          checkin_date: "2026-10-04",
          mood: 3,
          sleep_hours: 25,
          water_ml: 2000,
          energy: 7,
          fatigue: 2,
        });
      }).toThrow();

      expect(() => {
        DailyCheckinInputSchema.parse({
          checkin_date: "2026-10-04",
          mood: 3,
          sleep_hours: -1,
          water_ml: 2000,
          energy: 7,
          fatigue: 2,
        });
      }).toThrow();
    });

    it("rejects notes longer than 500 characters", () => {
      expect(() => {
        DailyCheckinInputSchema.parse({
          checkin_date: "2026-10-04",
          mood: 3,
          sleep_hours: 7,
          water_ml: 2000,
          energy: 5,
          fatigue: 3,
          note: "a".repeat(501),
        });
      }).toThrow();
    });

    it("validates body measurements and rejects unrealistic weight limits", () => {
      const valid: BodyMeasurementInput = {
        weight_kg: 72.5,
        height_cm: 178,
        bmi: 22.9,
        source: "checkin",
      };
      expect(BodyMeasurementInputSchema.parse(valid).weight_kg).toBe(72.5);

      // Under minimum (< 20kg)
      expect(() => {
        BodyMeasurementInputSchema.parse({
          weight_kg: 15,
          source: "manual",
        });
      }).toThrow();

      // Over maximum (> 350kg)
      expect(() => {
        BodyMeasurementInputSchema.parse({
          weight_kg: 400,
          source: "manual",
        });
      }).toThrow();
    });
  });

  describe("Date Utility Functions", () => {
    it("formats local calendar date consistently as YYYY-MM-DD", () => {
      const sample = new Date(2026, 9, 4); // October 4, 2026
      expect(formatLocalDate(sample)).toBe("2026-10-04");
    });

    it("calculates past local calendar dates correctly", () => {
      const past = getPastLocalDate(7);
      expect(past).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("Daily Checkins (Demo Mode CRUD & Upsert)", () => {
    const userId = "demo-user-123";

    it("creates a checkin and updates the same date entry on second save (upsert)", async () => {
      const date = "2026-10-04";

      // 1. Initial save
      const initial = await upsertDailyCheckin(
        userId,
        {
          checkin_date: date,
          mood: 3,
          sleep_hours: 6,
          water_ml: 1500,
          energy: 6,
          fatigue: 3,
          activity_minutes: 20,
          note: "Morning entry",
        },
        true
      );

      expect(initial.mood).toBe(3);
      expect(initial.sleep_hours).toBe(6);

      // 2. Same-day update with revised values
      const updated = await upsertDailyCheckin(
        userId,
        {
          checkin_date: date,
          mood: 4,
          sleep_hours: 6,
          water_ml: 2500, // Updated hydration later in the day
          energy: 8,
          fatigue: 2,
          activity_minutes: 45,
          note: "Updated evening entry",
        },
        true
      );

      expect(updated.mood).toBe(4);
      expect(updated.water_ml).toBe(2500);

      // 3. Confirm only 1 entry exists for that date
      const checkins = await getCheckinsByRange(userId, date, date, true);
      expect(checkins.length).toBe(1);
      expect(checkins[0].note).toBe("Updated evening entry");
    });

    it("retrieves today checkin or returns null if not completed", async () => {
      const today = "2026-10-04";
      const before = await getTodayCheckin(userId, today, true);
      // Clean storage starts with default initial demo checkins; test against a novel date
      const novelDate = "2026-10-31";
      const notFound = await getTodayCheckin(userId, novelDate, true);
      expect(notFound).toBeNull();

      await upsertDailyCheckin(
        userId,
        {
          checkin_date: novelDate,
          mood: 5,
          sleep_hours: 8,
          water_ml: 2200,
          energy: 9,
          fatigue: 1,
        },
        true
      );

      const found = await getTodayCheckin(userId, novelDate, true);
      expect(found).not.toBeNull();
      expect(found?.mood).toBe(5);
    });
  });

  describe("Body Measurements & Achievements", () => {
    const userId = "demo-user-123";

    it("saves and retrieves body measurements ordered chronologically", async () => {
      const now = new Date().toISOString();
      const saved = await saveBodyMeasurement(
        userId,
        {
          weight_kg: 70.2,
          height_cm: 175,
          bmi: 22.9,
          source: "checkin",
          measured_at: now,
        },
        true
      );

      expect(saved.weight_kg).toBe(70.2);
      expect(saved.bmi).toBe(22.9);

      const measurements = await getMeasurementsByRange(userId, undefined, true);
      expect(measurements.length).toBeGreaterThan(0);
      const found = measurements.find((m) => m.id === saved.id);
      expect(found).toBeDefined();
      expect(found?.weight_kg).toBe(70.2);
    });


    it("unlocks user achievements idempotently without duplicates", async () => {
      const first = await unlockAchievement(userId, "first_checkin", true);
      expect(first.key).toBe("first_checkin");

      // Second unlock attempt should return existing achievement
      const second = await unlockAchievement(userId, "first_checkin", true);
      expect(second.id).toBe(first.id);

      const achievements = await getUserAchievements(userId, true);
      const matches = achievements.filter((a) => a.key === "first_checkin");
      expect(matches.length).toBe(1);
    });
  });

  describe("Supabase Backend Operations (Mocked)", () => {
    const userId = "real-user-456";

    it("executes Supabase upsert for daily check-in with authenticated user", async () => {
      const mockResult = {
        id: "chk-real-1",
        user_id: userId,
        checkin_date: "2026-10-04",
        mood: 4,
        sleep_hours: 8,
        water_ml: 2000,
        energy: 8,
        fatigue: 2,
        activity_minutes: 30,
        note: null,
      };

      const singleMock = vi.fn().mockResolvedValue({ data: mockResult, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const upsertMock = vi.fn().mockReturnValue({ select: selectMock });
      const fromSpy = vi.spyOn(supabase, "from").mockReturnValue({
        upsert: upsertMock,
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await upsertDailyCheckin(
        userId,
        {
          checkin_date: "2026-10-04",
          mood: 4,
          sleep_hours: 8,
          water_ml: 2000,
          energy: 8,
          fatigue: 2,
          activity_minutes: 30,
        },
        false
      );

      expect(fromSpy).toHaveBeenCalledWith("daily_checkins");
      expect(upsertMock).toHaveBeenCalled();
      expect(result.id).toBe("chk-real-1");
      expect(result.mood).toBe(4);
    });

    it("handles Supabase database errors gracefully", async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const upsertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.spyOn(supabase, "from").mockReturnValue({
        upsert: upsertMock,
      } as unknown as ReturnType<typeof supabase.from>);

      await expect(
        upsertDailyCheckin(
          userId,
          {
            checkin_date: "2026-10-04",
            mood: 4,
            sleep_hours: 8,
            water_ml: 2000,
            energy: 8,
            fatigue: 2,
            activity_minutes: 30,
          },
          false
        )
      ).rejects.toThrow("Database connection failed");
    });
  });
});

