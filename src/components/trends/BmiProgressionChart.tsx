import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { TrendDataPoint } from "@/lib/trendAggregation";

interface BmiProgressionChartProps {
  dataPoints: TrendDataPoint[];
  latestWeight: number | null;
  weightDelta: number | null;
  latestBmi: number | null;
}

export const BmiProgressionChart: React.FC<BmiProgressionChartProps> = ({
  dataPoints,
  latestWeight,
  weightDelta,
  latestBmi,
}) => {
  const pointsWithWeight = dataPoints.filter((p) => p.weight_kg !== null);
  const hasData = pointsWithWeight.length > 0;

  // Screen reader accessible summary
  const screenReaderSummary = hasData
    ? `Weight trend chart showing ${pointsWithWeight.length} measurements. Latest weight is ${
        latestWeight !== null ? `${latestWeight} kg` : "not recorded"
      } with BMI ${latestBmi !== null ? latestBmi : "not recorded"}. ${
        weightDelta !== null
          ? `Change over selected period is ${weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg.`
          : ""
      }`
    : "No weight measurements recorded in this time range.";

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Scale className="w-5 h-5 text-teal-600" />
              Weight & BMI Progression
            </CardTitle>
            <CardDescription className="text-xs">
              Logged measurements over time with standardized reference zones.
            </CardDescription>
          </div>

          {hasData && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {latestWeight !== null && (
                <Badge variant="outline" className="text-xs bg-card font-semibold">
                  Latest: {latestWeight} kg
                </Badge>
              )}
              {latestBmi !== null && (
                <Badge variant="outline" className="text-xs bg-teal-50 text-teal-800 border-teal-200">
                  BMI: {latestBmi}
                </Badge>
              )}
              {weightDelta !== null && (
                <Badge
                  variant="outline"
                  className={`text-xs flex items-center gap-0.5 ${
                    weightDelta === 0
                      ? "text-muted-foreground bg-muted"
                      : weightDelta > 0
                      ? "text-indigo-700 bg-indigo-50 border-indigo-200"
                      : "text-emerald-700 bg-emerald-50 border-emerald-200"
                  }`}
                >
                  {weightDelta === 0 ? (
                    <Minus className="w-3 h-3" />
                  ) : weightDelta > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Hidden screen-reader description */}
        <p className="sr-only">{screenReaderSummary}</p>

        {!hasData ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-muted/15 rounded-xl border border-dashed border-border/70">
            <Scale className="w-8 h-8 text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium text-foreground">No weight logs in this period</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              Add your weight during daily check-ins or health assessments to track your trajectory.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full pt-2">
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
                  domain={["auto", "auto"]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  unit="kg"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const pt = payload[0].payload as TrendDataPoint;
                      if (pt.weight_kg === null) return null;
                      return (
                        <div className="bg-popover border border-border p-2.5 rounded-lg shadow-md text-xs space-y-1">
                          <p className="font-semibold text-foreground">{pt.date}</p>
                          <p className="text-teal-600 font-medium">Weight: {pt.weight_kg} kg</p>
                          {pt.bmi !== null && <p className="text-muted-foreground">BMI: {pt.bmi}</p>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight_kg"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#0d9488" }}
                  activeDot={{ r: 5 }}
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
