import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { TimeRange, DailyCheckin, BodyMeasurement } from "@/types/tracking";
import {
  getCheckinsByRange,
  getMeasurementsByRange,
  getPastLocalDate,
  formatLocalDate,
} from "@/services/trackingService";
import { aggregateTrendData, TrendSummaryStats } from "@/lib/trendAggregation";
import { BmiProgressionChart } from "@/components/trends/BmiProgressionChart";
import { SleepFatigueChart } from "@/components/trends/SleepFatigueChart";
import { HydrationChart } from "@/components/trends/HydrationChart";
import { PhysicalActivityChart } from "@/components/trends/PhysicalActivityChart";
import { MoodEnergyChart } from "@/components/trends/MoodEnergyChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Heart,
  ArrowLeft,
  Calendar,
  Sparkles,
  TrendingUp,
  Shield,
  Activity,
  PlusCircle,
} from "lucide-react";

const Trends: React.FC = () => {
  const { user, isDemo } = useAuth();
  const navigate = useNavigate();

  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<TrendSummaryStats | null>(null);
  const [hasAnyHistoricalData, setHasAnyHistoricalData] = useState<boolean>(true);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        const todayStr = formatLocalDate();
        let daysAgo = 30;
        if (timeRange === "7d") daysAgo = 7;
        else if (timeRange === "90d") daysAgo = 90;
        else if (timeRange === "all") daysAgo = 365;

        const startDateStr = getPastLocalDate(daysAgo);

        // Fetch checkins and measurements concurrently
        const [checkins, measurements] = await Promise.all([
          getCheckinsByRange(user.id, startDateStr, todayStr, isDemo),
          getMeasurementsByRange(user.id, startDateStr, isDemo),
        ]);

        if (!isMounted) return;

        const anyData = checkins.length > 0 || measurements.length > 0;
        setHasAnyHistoricalData(anyData);

        const aggregated = aggregateTrendData(checkins, measurements, timeRange, todayStr);
        setStats(aggregated);
      } catch {
        // Fallback gracefully
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [user, timeRange, isDemo]);

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Top Header */}
      <header className="bg-card border-b border-border/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-base text-foreground">HealthAI</span>
            </Link>
            {isDemo && (
              <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                Demo Mode
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link to="/checkin">
              <Button size="sm" className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white font-medium">
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                Check In
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Trends Container */}
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        {/* Title and Range Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <TrendingUp className="w-6 h-6 text-teal-600" />
              Health Vitals & Longitudinal Trends
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize your habits, rest consistency, and biometric trajectory over time.
            </p>
          </div>

          {/* Time range buttons */}
          <div className="flex items-center rounded-xl border border-border bg-card p-1 shadow-2xs self-start sm:self-auto">
            {(
              [
                { key: "7d", label: "7 Days" },
                { key: "30d", label: "30 Days" },
                { key: "90d", label: "90 Days" },
                { key: "all", label: "All Time" },
              ] as const
            ).map((tab) => (
              <Button
                key={tab.key}
                type="button"
                size="sm"
                variant={timeRange === tab.key ? "default" : "ghost"}
                className={`text-xs px-3 h-7 rounded-lg ${
                  timeRange === tab.key
                    ? "bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTimeRange(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Aggregating longitudinal trends...</p>
          </div>
        ) : !hasAnyHistoricalData ? (
          <Card className="p-12 text-center border-dashed border-2">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 mx-auto flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Tracking Data Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Complete your first 30-second daily check-in to begin charting your sleep, hydration, and vitals.
            </p>
            <Link to="/checkin">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white font-medium">
                <PlusCircle className="w-4 h-4 mr-2" />
                Start Your First Check-in
              </Button>
            </Link>
          </Card>
        ) : stats ? (
          <div className="space-y-6">
            {/* 1. Weight & BMI Progression */}
            <BmiProgressionChart
              dataPoints={stats.dataPoints}
              latestWeight={stats.latestWeight}
              weightDelta={stats.weightDelta}
              latestBmi={stats.latestBmi}
            />

            {/* 2. Sleep vs Fatigue */}
            <SleepFatigueChart
              dataPoints={stats.dataPoints}
              insight={stats.sleepFatigueInsight}
              avgSleep={stats.avgSleep}
            />

            {/* 3. Hydration & Physical Activity Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HydrationChart dataPoints={stats.dataPoints} avgWater={stats.avgWater} />
              <PhysicalActivityChart
                dataPoints={stats.dataPoints}
                totalActivityMinutes={stats.totalActivityMinutes}
                avgActivityMinutes={stats.avgActivityMinutes}
              />
            </div>

            {/* 4. Mood & Energy Balance */}
            <MoodEnergyChart dataPoints={stats.dataPoints} />
          </div>
        ) : null}

        {/* Mandatory Medical Safety Disclaimer */}
        <div className="pt-4 text-center text-xs text-muted-foreground max-w-xl mx-auto flex items-center justify-center gap-1.5 bg-muted/40 p-3.5 rounded-xl border border-border/50">
          <Shield className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            <strong>Disclaimer:</strong> These charts show your own logged data. They are not a medical diagnosis or
            treatment recommendation.
          </span>
        </div>
      </main>
    </div>
  );
};

export default Trends;
