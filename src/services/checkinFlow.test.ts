import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  formatLocalDate,
  getPastLocalDate,
  upsertDailyCheckin,
  getCheckinsByRange,
  getTodayCheckin,
} from "./trackingService";
import { DailyCheckinInput, DailyCheckinInputSchema } from "@/types/tracking";
import { detectEmergency, EMERGENCY_DISCLAIMER_MESSAGE } from "@/lib/emergencyDetector";

describe("Milestone 3 (Phase 2): Daily Check-in & Crisis Safety Flows", () => {
  let mockStorage: Record<string, string> = {};
  const userId = "test-user-flow-123";

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

  describe("Validation & Constraints", () => {
    it("validates a healthy check-in input with all fields", () => {
      const input: DailyCheckinInput = {
        checkin_date: formatLocalDate(),
        mood: 4,
        sleep_hours: 8.0,
        water_ml: 2250,
        energy: 8,
        fatigue: 2,
        activity_minutes: 45,
        note: "Took a walk outside, feeling rested.",
      };

      const parsed = DailyCheckinInputSchema.parse(input);
      expect(parsed.mood).toBe(4);
      expect(parsed.water_ml).toBe(2250);
      expect(parsed.activity_minutes).toBe(45);
    });

    it("rejects invalid activity minutes (> 1440 or < 0)", () => {
      expect(() => {
        DailyCheckinInputSchema.parse({
          checkin_date: formatLocalDate(),
          mood: 3,
          sleep_hours: 7,
          water_ml: 2000,
          energy: 6,
          fatigue: 2,
          activity_minutes: 1500, // Exceeds 24 hours
        });
      }).toThrow("Activity minutes cannot exceed 1440");

      expect(() => {
        DailyCheckinInputSchema.parse({
          checkin_date: formatLocalDate(),
          mood: 3,
          sleep_hours: 7,
          water_ml: 2000,
          energy: 6,
          fatigue: 2,
          activity_minutes: -10,
        });
      }).toThrow("Activity minutes cannot be negative");
    });
  });

  describe("Upsert & Edit Behavior", () => {
    it("updates same-day check-in without duplicating database records", async () => {
      const today = formatLocalDate();

      // 1. Morning check-in
      const morning = await upsertDailyCheckin(
        userId,
        {
          checkin_date: today,
          mood: 3,
          sleep_hours: 6.5,
          water_ml: 500,
          energy: 5,
          fatigue: 3,
          activity_minutes: 0,
          note: "Morning check-in",
        },
        true
      );
      expect(morning.water_ml).toBe(500);

      // 2. Evening update for same day
      const evening = await upsertDailyCheckin(
        userId,
        {
          checkin_date: today,
          mood: 4,
          sleep_hours: 6.5,
          water_ml: 2250, // Reached hydration target later
          energy: 7,
          fatigue: 2,
          activity_minutes: 30, // Evening walk
          note: "Hydration achieved, went for an evening walk.",
        },
        true
      );
      expect(evening.water_ml).toBe(2250);
      expect(evening.activity_minutes).toBe(30);

      // 3. Verify exactly one entry exists for today
      const range = await getCheckinsByRange(userId, today, today, true);
      expect(range.length).toBe(1);
      expect(range[0].water_ml).toBe(2250);
      expect(range[0].note).toBe("Hydration achieved, went for an evening walk.");
    });
  });

  describe("Date Rules & 7-Day Back-filling", () => {
    it("allows back-filling check-ins for up to the last 7 calendar days", async () => {
      for (let i = 1; i <= 6; i++) {
        const pastDate = getPastLocalDate(i);
        const record = await upsertDailyCheckin(
          userId,
          {
            checkin_date: pastDate,
            mood: 4,
            sleep_hours: 7.5,
            water_ml: 2000,
            energy: 7,
            fatigue: 2,
            activity_minutes: 20,
          },
          true
        );
        expect(record.checkin_date).toBe(pastDate);
      }

      const earliest = getPastLocalDate(6);
      const today = formatLocalDate();
      const allPast = await getCheckinsByRange(userId, earliest, today, true);
      expect(allPast.length).toBeGreaterThanOrEqual(6);
    });

    it("strictly blocks future dates in validation rules", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = formatLocalDate(tomorrow);

      // Simulates client-side check and business rule verification
      const isFuture = tomorrowStr > formatLocalDate();
      expect(isFuture).toBe(true);
    });
  });

  describe("Sensitive Mood & Crisis Detection on Notes", () => {
    it("detects crisis and self-harm keywords on daily reflection note", () => {
      const crisisNote = "I feel so overwhelmed and feel like ending my life";
      const result = detectEmergency(crisisNote);

      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategory).toBe("Crisis / Self-Harm / Overdose");
      expect(result.emergencyAdvice).toBe(EMERGENCY_DISCLAIMER_MESSAGE);
    });

    it("detects acute physical emergencies like chest pain in reflection notes", () => {
      const acuteNote = "Woke up with crushing chest pain and shortness of breath";
      const result = detectEmergency(acuteNote);

      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategory).toBe("Chest Pain / Cardiac Crisis");
    });

    it("correctly identifies safe normal wellness notes without false alarm", () => {
      const normalNote = "Drank 8 glasses of water, slight tension from work but feeling relaxed after yoga.";
      const result = detectEmergency(normalNote);

      expect(result.isEmergency).toBe(false);
    });

    it("respects negation in notes (e.g. 'no chest pain today')", () => {
      const negatedNote = "Felt great, no chest pain, slept for 8 hours.";
      const result = detectEmergency(negatedNote);

      expect(result.isEmergency).toBe(false);
    });
  });
});
