import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DailyCheckin, UserAchievement } from "@/types/tracking";
import {
  getCheckinsByRange,
  getPastLocalDate,
  formatLocalDate,
  syncUserAchievements,
} from "@/services/trackingService";
import {
  calculateStreakStats,
  StreakStats,
  getEnrichedAchievements,
  DisplayAchievement,
} from "@/lib/streaks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Flame,
  Trophy,
  Sparkles,
  Award,
  Zap,
  Moon,
  Droplet,
  CalendarCheck,
  Activity,
  Lock,
  CheckCircle2,
} from "lucide-react";

interface StreakProgressCardProps {
  hasAssessment?: boolean;
}

export const StreakProgressCard: React.FC<StreakProgressCardProps> = ({ hasAssessment = false }) => {
  const { user, isDemo } = useAuth();

  const [stats, setStats] = useState<StreakStats>({
    currentStreak: 0,
    longestStreak: 0,
    isTodayCompleted: false,
    completionRate7d: 0,
    completionRate30d: 0,
    streakMessage: "Welcome back, start a new streak today",
  });
  const [achievements, setAchievements] = useState<DisplayAchievement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const loadTrackingData = async () => {
      try {
        const todayStr = formatLocalDate();
        const past60DaysStr = getPastLocalDate(60);

        // 1. Fetch recent checkins
        const checkins: DailyCheckin[] = await getCheckinsByRange(
          user.id,
          past60DaysStr,
          todayStr,
          isDemo
        );

        if (!isMounted) return;

        // 2. Compute streaks
        const dates = checkins.map((c) => c.checkin_date);
        const streakData = calculateStreakStats(dates, todayStr);
        setStats(streakData);

        // 3. Sync achievements and enrich
        const userAchievements: UserAchievement[] = await syncUserAchievements(
          user.id,
          checkins,
          hasAssessment,
          isDemo
        );

        if (!isMounted) return;
        setAchievements(getEnrichedAchievements(userAchievements));
      } catch {
        // Fallback gracefully on fetch failure
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadTrackingData();
    return () => {
      isMounted = false;
    };
  }, [user, isDemo, hasAssessment]);

  // Dynamic icon resolution
  const renderBadgeIcon = (iconName: string, isUnlocked: boolean) => {
    const className = `w-5 h-5 ${
      isUnlocked ? "text-amber-500" : "text-muted-foreground/60"
    }`;
    switch (iconName) {
      case "Sparkles":
        return <Sparkles className={className} />;
      case "Flame":
        return <Flame className={className} />;
      case "Award":
        return <Award className={className} />;
      case "Zap":
        return <Zap className={className} />;
      case "Trophy":
        return <Trophy className={className} />;
      case "Moon":
        return <Moon className={className} />;
      case "Droplet":
        return <Droplet className={className} />;
      case "CalendarCheck":
        return <CalendarCheck className={className} />;
      case "Activity":
      default:
        return <Activity className={className} />;
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/60 bg-card/60 animate-pulse">
        <CardContent className="p-6 h-40" />
      </Card>
    );
  }

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                <Flame className="w-5 h-5" />
              </span>
              Wellness Streaks & Milestones
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              {stats.streakMessage}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200 self-start">
            <Trophy className="w-3.5 h-3.5 mr-1" />
            {unlockedCount} of {achievements.length} Badges Unlocked
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Streak Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Current Streak */}
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Current Streak</span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats.currentStreak}{" "}
              <span className="text-xs font-normal text-muted-foreground">days</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {stats.isTodayCompleted ? "Logged today" : "Pending today"}
            </p>
          </div>

          {/* Longest Streak */}
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Best Streak</span>
              <Trophy className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats.longestStreak}{" "}
              <span className="text-xs font-normal text-muted-foreground">days</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Personal best</p>
          </div>

          {/* 7-Day Consistency */}
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Last 7 Days</span>
              <span className="font-semibold text-teal-700">{stats.completionRate7d}%</span>
            </div>
            <Progress value={stats.completionRate7d} className="h-2 bg-muted" />
            <p className="text-[11px] text-muted-foreground">
              {Math.round((stats.completionRate7d / 100) * 7)} of 7 days logged
            </p>
          </div>

          {/* 30-Day Adherence */}
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Last 30 Days</span>
              <span className="font-semibold text-primary">{stats.completionRate30d}%</span>
            </div>
            <Progress value={stats.completionRate30d} className="h-2 bg-muted" />
            <p className="text-[11px] text-muted-foreground">
              {Math.round((stats.completionRate30d / 100) * 30)} of 30 days logged
            </p>
          </div>
        </div>

        {/* Milestone Badges Showcase */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              Achievements Showcase
            </h4>
            <span className="text-xs text-muted-foreground">No pressure, just gentle habits</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {achievements.map((badge) => {
              const formattedDate = badge.unlockedAt
                ? new Date(badge.unlockedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : null;

              return (
                <div
                  key={badge.key}
                  className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                    badge.isUnlocked
                      ? "bg-gradient-to-br from-amber-50/50 via-background to-card border-amber-200/80 shadow-2xs motion-safe:hover:scale-[1.01]"
                      : "bg-muted/15 border-border/50 text-muted-foreground opacity-80"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      badge.isUnlocked
                        ? "bg-amber-100/80 text-amber-700 shadow-2xs"
                        : "bg-muted text-muted-foreground/60"
                    }`}
                  >
                    {renderBadgeIcon(badge.iconName, badge.isUnlocked)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className="font-semibold text-xs text-foreground truncate">
                        {badge.title}
                      </h5>
                      {badge.isUnlocked ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Lock className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                      {badge.description}
                    </p>
                    {badge.isUnlocked && formattedDate && (
                      <span className="inline-block mt-1 text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                        Unlocked {formattedDate}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
