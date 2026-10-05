import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { DailyCheckin, MOOD_OPTIONS } from "@/types/tracking";
import { getTodayCheckin, formatLocalDate } from "@/services/trackingService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Clock,
  Droplet,
  Zap,
  Activity,
  CalendarCheck,
} from "lucide-react";

export const TodayCheckinCard: React.FC = () => {
  const { user, isDemo } = useAuth();
  const [todayEntry, setTodayEntry] = useState<DailyCheckin | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const entry = await getTodayCheckin(user.id, formatLocalDate(), isDemo);
        if (isMounted) setTodayEntry(entry);
      } catch {
        // Fallback gracefully on fetch error
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    checkStatus();
    return () => {
      isMounted = false;
    };
  }, [user, isDemo]);

  if (isLoading) {
    return (
      <Card className="border-border/60 bg-card/60 animate-pulse">
        <CardContent className="p-5 h-24" />
      </Card>
    );
  }

  const moodOpt = todayEntry ? MOOD_OPTIONS.find((m) => m.value === todayEntry.mood) : null;

  return (
    <Card className="border-teal-100 bg-gradient-to-r from-teal-50/60 via-background to-card overflow-hidden shadow-xs">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-100/70 text-teal-700">
                <CalendarCheck className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-base text-foreground">
                {todayEntry ? "Today's Check-in Completed" : "Today's Wellness Check-in"}
              </h3>
              {todayEntry ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Done Today
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-200">
                  Pending Today
                </Badge>
              )}
            </div>

            {todayEntry ? (
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-medium text-foreground bg-background px-2.5 py-1 rounded-md border border-border/60">
                  <span className="text-base leading-none">{moodOpt?.emoji}</span>
                  <span>{moodOpt?.label}</span>
                </span>
                <span className="flex items-center gap-1 bg-background px-2.5 py-1 rounded-md border border-border/60">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{todayEntry.sleep_hours}h sleep</span>
                </span>
                <span className="flex items-center gap-1 bg-background px-2.5 py-1 rounded-md border border-border/60">
                  <Droplet className="w-3.5 h-3.5 text-sky-500" />
                  <span>{todayEntry.water_ml.toLocaleString()}ml</span>
                </span>
                <span className="flex items-center gap-1 bg-background px-2.5 py-1 rounded-md border border-border/60">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>{todayEntry.energy}/10 energy</span>
                </span>
                {todayEntry.activity_minutes > 0 && (
                  <span className="flex items-center gap-1 bg-background px-2.5 py-1 rounded-md border border-border/60">
                    <Activity className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{todayEntry.activity_minutes}m active</span>
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                Takes just 30 seconds to reflect on your mood, sleep, and hydration. Keep your wellness streak alive!
              </p>
            )}
          </div>

          {/* Action button */}
          <div className="shrink-0 flex items-center gap-2">
            <Link to="/checkin">
              <Button
                size="sm"
                className={
                  todayEntry
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 border text-xs"
                    : "bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs"
                }
              >
                {todayEntry ? (
                  "Edit Check-in"
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-200" />
                    Check In (30s)
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
