import React, { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Droplet, CheckCircle2 } from "lucide-react";
import { TrendDataPoint } from "@/lib/trendAggregation";

interface HydrationChartProps {
  dataPoints: TrendDataPoint[];
  avgWater: number | null;
}

export const HydrationChart: React.FC<HydrationChartProps> = ({ dataPoints, avgWater }) => {
  const [goalMl, setGoalMl] = useState<number>(2000);

  const pointsWithWater = dataPoints.filter((p) => p.water_ml !== null);
  const hasData = pointsWithWater.length > 0;

  const metGoalCount = pointsWithWater.filter((p) => (p.water_ml ?? 0) >= goalMl).length;

  const screenReaderSummary = hasData
    ? `Hydration bar chart with ${pointsWithWater.length} days logged. Average water intake is ${
        avgWater !== null ? `${avgWater} ml` : "not available"
      }. Goal target is ${goalMl} ml, met on ${metGoalCount} days.`
    : "No hydration data logged in this range.";

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Droplet className="w-5 h-5 text-sky-600" />
              Daily Hydration Tracking
            </CardTitle>
            <CardDescription className="text-xs">
              Daily water intake against your personalized target (not medical advice).
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {avgWater !== null && (
              <Badge variant="outline" className="text-xs bg-sky-50 text-sky-800 border-sky-200">
                Avg: {avgWater.toLocaleString()} ml
              </Badge>
            )}

            {/* Quick goal switcher */}
            <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/30 text-xs">
              <span className="text-[11px] text-muted-foreground px-2">Goal:</span>
              {[1500, 2000, 2500].map((val) => (
                <Button
                  key={val}
                  type="button"
                  size="sm"
                  variant={goalMl === val ? "default" : "ghost"}
                  className={`h-6 px-2 text-[11px] rounded-md ${
                    goalMl === val ? "bg-sky-600 text-white" : "text-muted-foreground"
                  }`}
                  onClick={() => setGoalMl(val)}
                >
                  {val / 1000}L
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="sr-only">{screenReaderSummary}</p>

        {!hasData ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-muted/15 rounded-xl border border-dashed border-border/70">
            <Droplet className="w-8 h-8 text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium text-foreground">No hydration logs yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              Log your water glasses in daily check-ins to monitor your hydration consistency.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  domain={[0, (dataMax: number) => Math.max(3000, Math.ceil(dataMax / 500) * 500)]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  unit="ml"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const pt = payload[0].payload as TrendDataPoint;
                      if (pt.water_ml === null) return null;
                      const met = pt.water_ml >= goalMl;
                      return (
                        <div className="bg-popover border border-border p-2.5 rounded-lg shadow-md text-xs space-y-1">
                          <p className="font-semibold text-foreground">{pt.date}</p>
                          <p className="text-sky-600 font-medium">
                            Hydration: {pt.water_ml.toLocaleString()} ml (~
                            {Math.round(pt.water_ml / 250)} glasses)
                          </p>
                          <p className={met ? "text-emerald-600 font-medium" : "text-amber-600"}>
                            {met ? "Target met" : `${(goalMl - pt.water_ml).toLocaleString()} ml below target`}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={goalMl}
                  stroke="#0284c7"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Goal ${goalMl}ml`,
                    fill: "#0284c7",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
                <Bar
                  dataKey="water_ml"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {hasData && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Target reached on {metGoalCount} of {pointsWithWater.length} logged days
            </span>
            <span>Default target: {goalMl.toLocaleString()} ml/day</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
