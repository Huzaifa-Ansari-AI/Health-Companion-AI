import { DailyCheckin, BodyMeasurement, TimeRange } from "@/types/tracking";
import { formatLocalDate, getPastLocalDate } from "@/services/trackingService";
import { getCalendarDayDifference } from "./streaks";

export interface TrendDataPoint {
  date: string;
  displayDate: string;
  sleep_hours: number | null;
  water_ml: number | null;
  energy: number | null;
  fatigue: number | null;
  activity_minutes: number | null;
  mood: number | null;
  weight_kg: number | null;
  bmi: number | null;
}

export interface SleepFatigueInsight {
  hasEnoughData: boolean;
  dataPointsCount: number;
  neededPoints: number;
  insightText: string;
}

export interface TrendSummaryStats {
  dataPoints: TrendDataPoint[];
  avgSleep: number | null;
  avgWater: number | null;
  totalActivityMinutes: number;
  avgActivityMinutes: number | null;
  latestWeight: number | null;
  weightDelta: number | null;
  latestBmi: number | null;
  sleepFatigueInsight: SleepFatigueInsight;
}

/**
 * Pure function: Computes sleep vs fatigue correlation insight.
 * Rule: Requires at least 7 valid points with both sleep and fatigue.
 * Wording: Strictly says "In your logged data" and NEVER claims cause or medical diagnosis.
 */
export function computeSleepFatigueInsight(checkins: DailyCheckin[]): SleepFatigueInsight {
  const valid = (checkins || []).filter(
    (c) =>
      typeof c.sleep_hours === "number" &&
      c.sleep_hours > 0 &&
      typeof c.fatigue === "number" &&
      c.fatigue >= 1 &&
      c.fatigue <= 5
  );

  const count = valid.length;
  if (count < 7) {
    const needed = 7 - count;
    return {
      hasEnoughData: false,
      dataPointsCount: count,
      neededPoints: needed,
      insightText: `Keep checking in to unlock this insight (${needed} more ${
        needed === 1 ? "day" : "days"
      } needed).`,
    };
  }

  // Compare fatigue on days with sleep < 7h vs sleep >= 7h
  const shortSleepDays = valid.filter((c) => c.sleep_hours! < 7);
  const goodSleepDays = valid.filter((c) => c.sleep_hours! >= 7);

  if (shortSleepDays.length >= 2 && goodSleepDays.length >= 2) {
    const avgFatigueShort =
      shortSleepDays.reduce((acc, c) => acc + c.fatigue!, 0) / shortSleepDays.length;
    const avgFatigueGood =
      goodSleepDays.reduce((acc, c) => acc + c.fatigue!, 0) / goodSleepDays.length;

    const diff = avgFatigueShort - avgFatigueGood;
    if (diff >= 0.5) {
      return {
        hasEnoughData: true,
        dataPointsCount: count,
        neededPoints: 0,
        insightText: `In your logged data, on days with less than 7 hours of sleep, you reported higher fatigue (avg ${avgFatigueShort.toFixed(
          1
        )}/5 vs ${avgFatigueGood.toFixed(1)}/5 on days with 7+ hours).`,
      };
    } else if (diff <= -0.5) {
      return {
        hasEnoughData: true,
        dataPointsCount: count,
        neededPoints: 0,
        insightText: `In your logged data, days with 7+ hours of sleep tended to coincide with slightly higher reported fatigue (avg ${avgFatigueGood.toFixed(
          1
        )}/5 vs ${avgFatigueShort.toFixed(1)}/5).`,
      };
    }
  }

  return {
    hasEnoughData: true,
    dataPointsCount: count,
    neededPoints: 0,
    insightText:
      "In your logged data, reported fatigue levels remained generally consistent across your recorded sleep durations.",
  };
}

/**
 * Pure function: Aggregates checkins and measurements into filled calendar timelines.
 * Missing days are represented with `null` values (gaps, NOT zero).
 */
export function aggregateTrendData(
  checkins: DailyCheckin[],
  measurements: BodyMeasurement[],
  timeRange: TimeRange,
  todayStr: string = formatLocalDate()
): TrendSummaryStats {
  let daysCount = 7;
  if (timeRange === "30d") daysCount = 30;
  else if (timeRange === "90d") daysCount = 90;
  else if (timeRange === "all") {
    // Find earliest date
    let earliest = todayStr;
    checkins.forEach((c) => {
      if (c.checkin_date < earliest) earliest = c.checkin_date;
    });
    measurements.forEach((m) => {
      const d = m.measured_at.split("T")[0];
      if (d < earliest) earliest = d;
    });
    const diff = getCalendarDayDifference(earlierDate(earliest, todayStr), todayStr);
    daysCount = Math.max(7, Math.min(365, diff + 1));
  }

  // Generate continuous calendar days from past to today
  const [y, m, d] = todayStr.split("-").map(Number);
  const timelineDates: string[] = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m - 1, d - i));
    const yr = dt.getUTCFullYear();
    const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const da = String(dt.getUTCDate()).padStart(2, "0");
    timelineDates.push(`${yr}-${mo}-${da}`);
  }

  // Map checkins by date
  const checkinMap = new Map<string, DailyCheckin>();
  checkins.forEach((c) => {
    checkinMap.set(c.checkin_date, c);
  });

  // Map measurements by date (latest measurement per date)
  const measurementMap = new Map<string, BodyMeasurement>();
  measurements
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at))
    .forEach((m) => {
      const dateKey = m.measured_at.split("T")[0];
      measurementMap.set(dateKey, m);
    });

  // Build combined data points with explicit null for missing entries
  const dataPoints: TrendDataPoint[] = timelineDates.map((dateStr) => {
    const chk = checkinMap.get(dateStr);
    const meas = measurementMap.get(dateStr);

    const parts = dateStr.split("-");
    const displayDate = `${parts[1]}/${parts[2]}`;

    return {
      date: dateStr,
      displayDate,
      sleep_hours: chk && typeof chk.sleep_hours === "number" ? chk.sleep_hours : null,
      water_ml: chk && typeof chk.water_ml === "number" ? chk.water_ml : null,
      energy: chk && typeof chk.energy === "number" ? chk.energy : null,
      fatigue: chk && typeof chk.fatigue === "number" ? chk.fatigue : null,
      activity_minutes: chk && typeof chk.activity_minutes === "number" ? chk.activity_minutes : null,
      mood: chk && typeof chk.mood === "number" ? chk.mood : null,
      weight_kg: meas && typeof meas.weight_kg === "number" ? meas.weight_kg : null,
      bmi: meas && typeof meas.bmi === "number" ? meas.bmi : null,
    };
  });

  // Calculate summary metrics
  const validSleep = dataPoints.map((p) => p.sleep_hours).filter((s): s is number => s !== null);
  const avgSleep =
    validSleep.length > 0
      ? Number((validSleep.reduce((a, b) => a + b, 0) / validSleep.length).toFixed(1))
      : null;

  const validWater = dataPoints.map((p) => p.water_ml).filter((w): w is number => w !== null);
  const avgWater =
    validWater.length > 0
      ? Math.round(validWater.reduce((a, b) => a + b, 0) / validWater.length)
      : null;

  const validActivity = dataPoints
    .map((p) => p.activity_minutes)
    .filter((a): a is number => a !== null);
  const totalActivityMinutes = validActivity.reduce((a, b) => a + b, 0);
  const avgActivityMinutes =
    validActivity.length > 0 ? Math.round(totalActivityMinutes / validActivity.length) : null;

  // Weight & BMI trends
  const validWeights = dataPoints
    .map((p) => p.weight_kg)
    .filter((w): w is number => w !== null);
  const latestWeight = validWeights.length > 0 ? validWeights[validWeights.length - 1] : null;
  const firstWeight = validWeights.length > 0 ? validWeights[0] : null;
  const weightDelta =
    latestWeight !== null && firstWeight !== null
      ? Number((latestWeight - firstWeight).toFixed(1))
      : null;

  const validBmi = dataPoints.map((p) => p.bmi).filter((b): b is number => b !== null);
  const latestBmi = validBmi.length > 0 ? validBmi[validBmi.length - 1] : null;

  // Sleep vs Fatigue insight
  const sleepFatigueInsight = computeSleepFatigueInsight(checkins);

  return {
    dataPoints,
    avgSleep,
    avgWater,
    totalActivityMinutes,
    avgActivityMinutes,
    latestWeight,
    weightDelta,
    latestBmi,
    sleepFatigueInsight,
  };
}

function earlierDate(d1: string, d2: string): string {
  return d1 < d2 ? d1 : d2;
}
