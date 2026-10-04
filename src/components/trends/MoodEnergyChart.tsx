import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Zap } from "lucide-react";
import { TrendDataPoint } from "@/lib/trendAggregation";
import { MOOD_OPTIONS } from "@/types/tracking";

interface MoodEnergyChartProps {
  dataPoints: TrendDataPoint[];
}

export const MoodEnergyChart: React.FC<MoodEnergyChartProps> = ({ dataPoints }) => {
  const pointsWithMood = dataPoints.filter((p) => p.mood !== null || p.energy !== null);
  const hasData = pointsWithMood.length > 0;

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Daily Mood & Energy Balance
            </CardTitle>
            <CardDescription className="text-xs">
              Tracking your subjective energy (1-10) and emotional wellbeing (1-5).
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Energy (1-10)
            </span>
            <span className="flex items-center gap-1 text-rose-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Mood (1-5)
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!hasData ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-muted/15 rounded-xl border border-dashed border-border/70">
            <Heart className="w-7 h-7 text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium text-foreground">No mood or energy logs yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              Select your emoji mood during check-ins to view emotional trends.
            </p>
          </div>
        ) : (
          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  domain={[1, 10]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const pt = payload[0].payload as TrendDataPoint;
                      const moodOpt = MOOD_OPTIONS.find((m) => m.value === pt.mood);
                      return (
                        <div className="bg-popover border border-border p-2 rounded-lg shadow-md text-xs space-y-1">
                          <p className="font-semibold text-foreground">{pt.date}</p>
                          {pt.energy !== null && (
                            <p className="text-amber-600 font-medium">Energy: {pt.energy}/10</p>
                          )}
                          {pt.mood !== null && (
                            <p className="text-rose-600 font-medium flex items-center gap-1">
                              Mood: {moodOpt?.emoji} {moodOpt?.label}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="energy"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: "#f59e0b" }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: "#f43f5e" }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
