import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  ScatterChart,
  Scatter,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Moon, Sparkles, Info, BarChart2, ScatterPlot } from "lucide-react";
import { TrendDataPoint, SleepFatigueInsight } from "@/lib/trendAggregation";

interface SleepFatigueChartProps {
  dataPoints: TrendDataPoint[];
  insight: SleepFatigueInsight;
  avgSleep: number | null;
}

export const SleepFatigueChart: React.FC<SleepFatigueChartProps> = ({
  dataPoints,
  insight,
  avgSleep,
}) => {
  const [viewMode, setViewMode] = useState<"combined" | "scatter">("combined");

  const validPoints = dataPoints.filter(
    (p) => p.sleep_hours !== null && p.fatigue !== null
  );
  const hasData = validPoints.length > 0;

  // Prepare scatter data points: { x: sleep_hours, y: fatigue, date }
  const scatterData = validPoints.map((p) => ({
    x: p.sleep_hours,
    y: p.fatigue,
    date: p.displayDate,
  }));

  const screenReaderSummary = hasData
    ? `Sleep and fatigue chart with ${validPoints.length} logged days. Average sleep is ${
        avgSleep !== null ? `${avgSleep} hours` : "not available"
      }. Insight: ${insight.insightText}`
    : "No sleep or fatigue data logged in this range.";

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-600" />
              Sleep Duration vs. Reported Fatigue
            </CardTitle>
            <CardDescription className="text-xs">
              Compare your nightly rest hours with daytime fatigue ratings (1-5).
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {avgSleep !== null && (
              <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-800 border-indigo-200">
                Avg: {avgSleep} hrs
              </Badge>
            )}

            <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/30">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "combined" ? "default" : "ghost"}
                className={`h-7 px-2.5 text-xs rounded-md ${
                  viewMode === "combined" ? "bg-indigo-600 text-white" : "text-muted-foreground"
                }`}
                onClick={() => setViewMode("combined")}
              >
                Timeline
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "scatter" ? "default" : "ghost"}
                className={`h-7 px-2.5 text-xs rounded-md ${
                  viewMode === "scatter" ? "bg-indigo-600 text-white" : "text-muted-foreground"
                }`}
                onClick={() => setViewMode("scatter")}
              >
                Scatter
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="sr-only">{screenReaderSummary}</p>

        {!hasData ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-muted/15 rounded-xl border border-dashed border-border/70">
            <Moon className="w-8 h-8 text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium text-foreground">No sleep & fatigue logs yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              Complete your daily check-in to track how your sleep rhythm relates to your daytime energy.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === "combined" ? (
                <ComposedChart data={dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis
                    dataKey="displayDate"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  {/* Left Axis: Sleep hours */}
                  <YAxis
                    yAxisId="left"
                    domain={[0, 14]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    unit="h"
                  />
                  {/* Right Axis: Fatigue (1-5) */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 5]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const pt = payload[0].payload as TrendDataPoint;
                        return (
                          <div className="bg-popover border border-border p-2.5 rounded-lg shadow-md text-xs space-y-1">
                            <p className="font-semibold text-foreground">{pt.date}</p>
                            <p className="text-indigo-600 font-medium">
                              Sleep: {pt.sleep_hours !== null ? `${pt.sleep_hours} hrs` : "Not logged"}
                            </p>
                            <p className="text-purple-600 font-medium">
                              Fatigue: {pt.fatigue !== null ? `${pt.fatigue}/5` : "Not logged"}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="sleep_hours"
                    name="Sleep (hrs)"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="fatigue"
                    name="Fatigue (1-5)"
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#a855f7" }}
                    connectNulls={false}
                  />
                </ComposedChart>
              ) : (
                <ScatterChart margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis
                    dataKey="x"
                    name="Sleep Hours"
                    unit="h"
                    domain={[0, 14]}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    dataKey="y"
                    name="Fatigue Score"
                    domain={[1, 5]}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border p-2 rounded-lg text-xs space-y-0.5">
                            <p className="font-semibold">{d.date}</p>
                            <p>Sleep: {d.x} hrs</p>
                            <p>Fatigue: {d.y}/5</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter data={scatterData} fill="#6366f1" />
                </ScatterChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Insight Banner */}
        <div
          className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
            insight.hasEnoughData
              ? "bg-indigo-50/70 border-indigo-200/80 text-indigo-950"
              : "bg-muted/40 border-border/70 text-muted-foreground"
          }`}
        >
          {insight.hasEnoughData ? (
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <p className="font-semibold">
              {insight.hasEnoughData ? "Sleep & Rhythm Insight" : "Insight In Progress"}
            </p>
            <p className="leading-relaxed">{insight.insightText}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
