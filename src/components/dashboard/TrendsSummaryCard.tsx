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
import {
  TrendingUp,
  Clock,
  Droplet,
  Activity,
  ArrowRight,
  LineChart,
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

  if (isLoading) {
    return (
      <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-sm animate-pulse">
        <CardContent className="p-6 h-28" />
      </Card>
    );
  }

  const hasAnyData = stats && stats.dataPoints.some(
    (p) => p.sleep_hours !== null || p.water_ml !== null || p.activity_minutes !== null
  );

  return (
    <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-sm overflow-hidden">
      <CardContent className="p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100/80 text-teal-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Explore Trends & 7-Day Health Rhythm
              </h3>
              <p className="text-xs text-slate-500 font-normal">
                Longitudinal tracking across sleep, hydration, and active minutes.
              </p>
            </div>
          </div>

          <Link to="/trends">
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-bold self-start sm:self-auto gap-1.5 border-teal-300 text-teal-800 hover:bg-teal-50 rounded-xl"
            >
              <span>Explore Full Trends</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {hasAnyData && stats ? (
          /* 3 Metric Summary Cards */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            {/* Sleep */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">7d Sleep Avg</p>
                <p className="text-base font-extrabold text-slate-900">
                  {stats.avgSleep !== null ? `${stats.avgSleep} hrs` : "No logs"}
                </p>
              </div>
            </div>

            {/* Hydration */}
            <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/80 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                <Droplet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">7d Water Avg</p>
                <p className="text-base font-extrabold text-slate-900">
                  {stats.avgWater !== null ? `${stats.avgWater.toLocaleString()} ml` : "No logs"}
                </p>
              </div>
            </div>

            {/* Activity */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Time</p>
                <p className="text-base font-extrabold text-slate-900">
                  {stats.totalActivityMinutes > 0 ? `${stats.totalActivityMinutes} mins` : "0 mins"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State for Trends */
          <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200/70 text-slate-600 flex items-center justify-center shrink-0">
                <LineChart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">No Check-in Data Recorded Yet</p>
                <p className="text-[11px] text-slate-500 font-normal">
                  Log your daily check-in above to begin populating your 7-day health trend curves.
                </p>
              </div>
            </div>
            <Link to="/checkin">
              <Button size="sm" variant="outline" className="rounded-xl border-slate-300 text-xs font-semibold">
                Record First Check-in
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
