import { describe, it, expect } from "vitest";
import {
  aggregateTrendData,
  computeSleepFatigueInsight,
} from "./trendAggregation";
import { DailyCheckin, BodyMeasurement } from "@/types/tracking";

describe("Milestone 3 (Phase 4): Trend Aggregation & Correlation Insights", () => {
  const today = "2026-10-04";

  describe("Gap Filling & Continuous Timeline", () => {
    it("generates continuous timeline with explicit NULL values for missing days (not zero)", () => {
      // User only logged today
      const checkins: DailyCheckin[] = [
        {
          checkin_date: today,
          mood: 4,
          sleep_hours: 8.0,
          water_ml: 2000,
          energy: 7,
          fatigue: 2,
          activity_minutes: 30,
        },
      ];

      const result = aggregateTrendData(checkins, [], "7d", today);

      expect(result.dataPoints.length).toBe(7);

      // Today (last point) has values
      const todayPt = result.dataPoints[6];
      expect(todayPt.date).toBe(today);
      expect(todayPt.sleep_hours).toBe(8.0);
      expect(todayPt.water_ml).toBe(2000);

      // Previous days must be NULL, never false zeros
      for (let i = 0; i < 6; i++) {
        const pt = result.dataPoints[i];
        expect(pt.sleep_hours).toBeNull();
        expect(pt.water_ml).toBeNull();
        expect(pt.activity_minutes).toBeNull();
      }
    });

    it("respects time range lengths (7d = 7, 30d = 30, 90d = 90)", () => {
      const result7 = aggregateTrendData([], [], "7d", today);
      expect(result7.dataPoints.length).toBe(7);

      const result30 = aggregateTrendData([], [], "30d", today);
      expect(result30.dataPoints.length).toBe(30);

      const result90 = aggregateTrendData([], [], "90d", today);
      expect(result90.dataPoints.length).toBe(90);
    });

    it("handles single-point data and empty datasets without throwing", () => {
      const empty = aggregateTrendData([], [], "7d", today);
      expect(empty.avgSleep).toBeNull();
      expect(empty.avgWater).toBeNull();
      expect(empty.totalActivityMinutes).toBe(0);
      expect(empty.latestWeight).toBeNull();
      expect(empty.weightDelta).toBeNull();

      const singleMeas: BodyMeasurement[] = [
        {
          measured_at: `${today}T08:00:00.000Z`,
          weight_kg: 72.0,
          bmi: 23.5,
          source: "manual",
        },
      ];
      const single = aggregateTrendData([], singleMeas, "7d", today);
      expect(single.latestWeight).toBe(72.0);
      expect(single.latestBmi).toBe(23.5);
      expect(single.weightDelta).toBe(0);
    });

    it("computes averages and weight change delta correctly across measurements", () => {
      const measurements: BodyMeasurement[] = [
        {
          measured_at: "2026-09-28T08:00:00.000Z",
          weight_kg: 75.0,
          bmi: 24.5,
          source: "assessment",
        },
        {
          measured_at: "2026-10-04T08:00:00.000Z",
          weight_kg: 73.5,
          bmi: 24.0,
          source: "checkin",
        },
      ];

      const result = aggregateTrendData([], measurements, "7d", today);
      expect(result.latestWeight).toBe(73.5);
      expect(result.weightDelta).toBe(-1.5); // 73.5 - 75.0
    });
  });

  describe("computeSleepFatigueInsight - Non-Causal Correlation Engine", () => {
    it("locks insight if fewer than 7 data points are present", () => {
      const fewCheckins: DailyCheckin[] = [
        {
          checkin_date: "2026-10-01",
          mood: 3,
          sleep_hours: 6,
          water_ml: 1500,
          energy: 6,
          fatigue: 3,
          activity_minutes: 20,
        },
        {
          checkin_date: "2026-10-02",
          mood: 4,
          sleep_hours: 8,
          water_ml: 2000,
          energy: 8,
          fatigue: 2,
          activity_minutes: 30,
        },
      ];

      const insight = computeSleepFatigueInsight(fewCheckins);
      expect(insight.hasEnoughData).toBe(false);
      expect(insight.neededPoints).toBe(5);
      expect(insight.insightText).toContain("5 more days needed");
    });

    it("unlocks non-causal insight with 7+ data points using safe phrasing", () => {
      const sevenCheckins: DailyCheckin[] = [
        // 3 days with short sleep (< 7h) and higher fatigue (4/5)
        { checkin_date: "2026-09-28", mood: 2, sleep_hours: 5.5, water_ml: 1500, energy: 4, fatigue: 4, activity_minutes: 0 },
        { checkin_date: "2026-09-29", mood: 2, sleep_hours: 6.0, water_ml: 1500, energy: 5, fatigue: 4, activity_minutes: 15 },
        { checkin_date: "2026-09-30", mood: 3, sleep_hours: 5.0, water_ml: 1800, energy: 4, fatigue: 4, activity_minutes: 0 },
        // 4 days with good sleep (>= 7h) and lower fatigue (1-2/5)
        { checkin_date: "2026-10-01", mood: 4, sleep_hours: 8.0, water_ml: 2000, energy: 8, fatigue: 2, activity_minutes: 30 },
        { checkin_date: "2026-10-02", mood: 5, sleep_hours: 8.5, water_ml: 2200, energy: 9, fatigue: 1, activity_minutes: 45 },
        { checkin_date: "2026-10-03", mood: 4, sleep_hours: 7.5, water_ml: 2000, energy: 8, fatigue: 2, activity_minutes: 30 },
        { checkin_date: "2026-10-04", mood: 4, sleep_hours: 8.0, water_ml: 2500, energy: 8, fatigue: 2, activity_minutes: 40 },
      ];

      const insight = computeSleepFatigueInsight(sevenCheckins);
      expect(insight.hasEnoughData).toBe(true);
      expect(insight.neededPoints).toBe(0);
      expect(insight.insightText).toContain("In your logged data");
      expect(insight.insightText).toContain("less than 7 hours of sleep");
      expect(insight.insightText).toContain("higher fatigue");

      // Strictly verify no medical causation claims
      expect(insight.insightText).not.toMatch(/causes|diagnosed|proven|treatment|disease|disorder/i);
    });

    it("generates consistent balance message when sleep and fatigue are uniform", () => {
      const uniformCheckins: DailyCheckin[] = Array.from({ length: 7 }, (_, i) => ({
        checkin_date: `2026-10-0${i + 1}`,
        mood: 4,
        sleep_hours: 7.5,
        water_ml: 2000,
        energy: 8,
        fatigue: 2,
        activity_minutes: 30,
      }));

      const insight = computeSleepFatigueInsight(uniformCheckins);
      expect(insight.hasEnoughData).toBe(true);
      expect(insight.insightText).toContain("generally consistent");
    });
  });
});
