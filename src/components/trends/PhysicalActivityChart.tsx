import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock } from "lucide-react";
import { TrendDataPoint } from "@/lib/trendAggregation";

interface PhysicalActivityChartProps {
  dataPoints: TrendDataPoint[];
  totalActivityMinutes: number;
  avgActivityMinutes: number | null;
}

export const PhysicalActivityChart: React.FC<PhysicalActivityChartProps> = ({
  dataPoints,
  totalActivityMinutes,
  avgActivityMinutes,
}) => {
  const pointsWithActivity = dataPoints.filter((p) => p.activity_minutes !== null);
  const hasData = pointsWithActivity.length > 0;

  const screenReaderSummary = hasData
    ? `Physical activity chart with ${pointsWithActivity.length} logged days. Total activity is ${totalActivityMinutes} minutes, averaging ${
        avgActivityMinutes !== null ? `${avgActivityMinutes} mins/day` : "none"
      }.`
    : "No physical activity logged in this range.";

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Physical Activity Tracking
            </CardTitle>
            <CardDescription className="text-xs">
              Daily active movement and exercise minutes logged.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200">
              Total: {totalActivityMinutes} mins
            </Badge>
            {avgActivityMinutes !== null && (
              <Badge variant="outline" className="text-xs bg-muted">
                Avg: {avgActivityMinutes} m/day
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="sr-only">{screenReaderSummary}</p>

        {!hasData ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-muted/15 rounded-xl border border-dashed border-border/70">
            <Activity className="w-8 h-8 text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium text-foreground">No physical activity logged</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              Log your walking, workouts, or movement during daily check-ins to monitor your activity habits.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  domain={[0, (dataMax: number) => Math.max(60, Math.ceil(dataMax / 15) * 15)]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  unit="m"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const pt = payload[0].payload as TrendDataPoint;
                      if (pt.activity_minutes === null) return null;
                      return (
                        <div className="bg-popover border border-border p-2.5 rounded-lg shadow-md text-xs space-y-1">
                          <p className="font-semibold text-foreground">{pt.date}</p>
                          <p className="text-emerald-600 font-medium">
                            Activity: {pt.activity_minutes} minutes
                          </p>
                          <p className="text-muted-foreground">
                            {pt.activity_minutes === 0 ? "Rest Day" : "Active movement"}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={30}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "30m Baseline",
                    fill: "#10b981",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
                <Bar
                  dataKey="activity_minutes"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
