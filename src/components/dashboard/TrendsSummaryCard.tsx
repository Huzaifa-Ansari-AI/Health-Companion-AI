import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  getCheckinsByRange,
  getPastLocalDate,
  formatLocalDate,
} from "@/services/trackingService";
import { aggregateTrendData, TrendSummaryStats } from "@/lib/trendAggregation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Clock,
  Droplet,
  Activity,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const TrendsSummaryCard: React.FC = () => {
  const { user, isDemo } = useAuth();
  const [stats, setStats] = useState<TrendSummaryStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const load7DaySummary = async () => {
      try {
        const todayStr = formatLocalDate();
        const startStr = getPastLocalDate(7);
        const checkins = await getCheckinsByRange(user.id, startStr, todayStr, isDemo);

        if (!isMounted) return;
        const aggregated = aggregateTrendData(checkins, [], "7d", todayStr);
        setStats(aggregated);
      } catch {
        // Fallback gracefully
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load7DaySummary();
    return () => {
      isMounted = false;
    };
  }, [user, isDemo]);

  if (isLoading || !stats) {
    return null;
  }

  const hasAnyData = stats.dataPoints.some(
    (p) => p.sleep_hours !== null || p.water_ml !== null || p.activity_minutes !== null
  );

  if (!hasAnyData) {
    return null;
  }

  return (
    <Card className="border-border/60 bg-gradient-to-br from-card via-background to-muted/20 shadow-xs">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
              <TrendingUp className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-foreground">
                7-Day Health Rhythm Snapshot
              </h3>
              <p className="text-xs text-muted-foreground">
                Your longitudinal vitals summary across the past week.
              </p>
            </div>
          </div>

          <Link to="/trends">
            <Button size="sm" variant="outline" className="text-xs self-start sm:self-auto gap-1 border-teal-200 text-teal-800 hover:bg-teal-50">
              Explore Full Trends
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Sleep */}
          <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">7d Sleep Avg</p>
              <p className="text-sm font-bold text-foreground">
                {stats.avgSleep !== null ? `${stats.avgSleep} hrs` : "No logs"}
              </p>
            </div>
          </div>

          {/* Hydration */}
          <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Droplet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">7d Water Avg</p>
              <p className="text-sm font-bold text-foreground">
                {stats.avgWater !== null ? `${stats.avgWater.toLocaleString()} ml` : "No logs"}
              </p>
            </div>
          </div>

          {/* Activity */}
          <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total Active Time</p>
              <p className="text-sm font-bold text-foreground">
                {stats.totalActivityMinutes > 0 ? `${stats.totalActivityMinutes} mins` : "0 mins"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
