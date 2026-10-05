import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  DailyCheckinInput,
  MOOD_OPTIONS,
  FATIGUE_OPTIONS,
  MoodScore,
  FatigueScore,
} from "@/types/tracking";
import {
  formatLocalDate,
  getPastLocalDate,
  getTodayCheckin,
  upsertDailyCheckin,
  saveBodyMeasurement,
  unlockAchievement,
} from "@/services/trackingService";
import { detectEmergency } from "@/lib/emergencyDetector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  Droplet,
  Zap,
  Activity,
  Heart,
  Scale,
  FileText,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  Sparkles,
} from "lucide-react";

interface CheckinFormProps {
  onSuccess?: () => void;
  initialDate?: string;
}

export const CheckinForm: React.FC<CheckinFormProps> = ({ onSuccess, initialDate }) => {
  const { user, isDemo } = useAuth();
  const { toast } = useToast();

  const todayStr = formatLocalDate();
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);

  // Form State
  const [mood, setMood] = useState<MoodScore>(4);
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [waterMl, setWaterMl] = useState<number>(2000);
  const [energy, setEnergy] = useState<number>(7);
  const [fatigue, setFatigue] = useState<FatigueScore>(2);
  const [activityMinutes, setActivityMinutes] = useState<number>(30);
  const [weightKg, setWeightKg] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasExistingEntry, setHasExistingEntry] = useState<boolean>(false);

  // Allowed past 7 calendar days (0 = today, 6 = 6 days ago)
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const dStr = getPastLocalDate(i);
    let label = dStr;
    if (i === 0) label = "Today";
    else if (i === 1) label = "Yesterday";
    else {
      const parts = dStr.split("-");
      label = `${parts[1]}/${parts[2]}`;
    }
    return { date: dStr, label };
  });

  // Emergency / Crisis detection on note field
  const emergencyCheck = detectEmergency(note);

  // Load existing check-in data when selected date changes
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    setIsLoading(true);

    const loadDateEntry = async () => {
      try {
        const existing = await getTodayCheckin(user.id, selectedDate, isDemo);
        if (!isMounted) return;

        if (existing) {
          setMood(existing.mood);
          setSleepHours(existing.sleep_hours);
          setWaterMl(existing.water_ml);
          setEnergy(existing.energy);
          setFatigue(existing.fatigue);
          setActivityMinutes(existing.activity_minutes);
          setNote(existing.note || "");
          setHasExistingEntry(true);
        } else {
          // Reset to healthy defaults for fresh date
          setMood(4);
          setSleepHours(7.5);
          setWaterMl(2000);
          setEnergy(7);
          setFatigue(2);
          setActivityMinutes(30);
          setNote("");
          setHasExistingEntry(false);
        }
      } catch {
        // Fallback gracefully on fetch error
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDateEntry();
    return () => {
      isMounted = false;
    };
  }, [user, selectedDate, isDemo]);

  const handleDateSelect = (d: string) => {
    // Strictly prevent selecting future dates
    if (d > todayStr) {
      toast({
        title: "Future date not allowed",
        description: "You can only log check-ins for today or the past 7 days.",
        variant: "destructive",
      });
      return;
    }
    setSelectedDate(d);
  };

  const handleAdjustWater = (amount: number) => {
    setWaterMl((prev) => Math.max(0, Math.min(10000, prev + amount)));
  };

  const handleAdjustSleep = (delta: number) => {
    setSleepHours((prev) => Math.max(0, Math.min(24, Number((prev + delta).toFixed(1)))));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Disallow future date submission as a hard rule
    if (selectedDate > todayStr) {
      toast({
        title: "Invalid date",
        description: "Cannot record check-ins for future dates.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: DailyCheckinInput = {
        checkin_date: selectedDate,
        mood,
        sleep_hours: sleepHours,
        water_ml: waterMl,
        energy,
        fatigue,
        activity_minutes: activityMinutes,
        note: note.trim() ? note.trim().slice(0, 500) : null,
      };

      await upsertDailyCheckin(user.id, payload, isDemo);

      // Optional weight tracking
      const parsedWeight = parseFloat(weightKg);
      if (!isNaN(parsedWeight) && parsedWeight >= 20 && parsedWeight <= 350) {
        await saveBodyMeasurement(
          user.id,
          {
            weight_kg: parsedWeight,
            source: "checkin",
            measured_at: `${selectedDate}T12:00:00.000Z`,
          },
          isDemo
        );
      }

      // Unlock First Check-in achievement idempotently
      await unlockAchievement(user.id, "first_checkin", isDemo);

      toast({
        title: hasExistingEntry ? "Check-in updated" : "Check-in completed",
        description: "Thank you for checking in with yourself today. Keep up the gentle rhythm!",
      });

      setHasExistingEntry(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record your check-in.";
      toast({
        title: "Check-in failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border/60 shadow-sm max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              Daily Health Check-in
            </CardTitle>
            <CardDescription className="text-sm">
              Takes just 30 seconds to reflect on your daily vitals and lifestyle rhythm.
            </CardDescription>
          </div>
          {hasExistingEntry && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 self-start">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Logged
            </Badge>
          )}
        </div>

        {/* Date Selector: Today & past 6 days */}
        <div className="pt-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            Select Day (Up to 7 days back)
          </Label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {availableDates.map((item) => (
              <Button
                key={item.date}
                type="button"
                size="sm"
                variant={selectedDate === item.date ? "default" : "outline"}
                className={`text-xs px-3 py-1.5 shrink-0 rounded-lg ${
                  selectedDate === item.date
                    ? "bg-teal-600 hover:bg-teal-700 text-white font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => handleDateSelect(item.date)}
              >
                <Calendar className="w-3 h-3 mr-1" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading your entry...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Mood Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500" />
                How are you feeling overall today?
              </Label>
              <div className="grid grid-cols-5 gap-2 pt-1">
                {MOOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMood(opt.value)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      mood === opt.value
                        ? `${opt.colorClass} ring-2 ring-teal-500 font-semibold shadow-xs`
                        : "bg-background border-border/70 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <span className="text-2xl mb-1">{opt.emoji}</span>
                    <span className="text-xs">{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Sensitive mood supportive guidance */}
              {mood <= 2 && (
                <div className="mt-2.5 p-3 rounded-lg bg-amber-50/80 border border-amber-200/70 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                  <Heart className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    We notice things feel heavy today. Please take it easy on yourself. If these feelings persist or feel
                    unmanageable, consider reaching out to someone you trust or a supportive healthcare professional.
                  </div>
                </div>
              )}
            </div>

            {/* 2. Sleep Duration */}
            <div className="space-y-2.5 p-4 rounded-xl bg-muted/20 border border-border/60">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  Sleep Duration
                </Label>
                <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {sleepHours} hrs
                </span>
              </div>
              <Slider
                value={[sleepHours]}
                min={0}
                max={14}
                step={0.5}
                onValueChange={(val) => setSleepHours(val[0])}
                className="py-1"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2"
                    onClick={() => handleAdjustSleep(-0.5)}
                  >
                    -0.5h
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2"
                    onClick={() => handleAdjustSleep(0.5)}
                  >
                    +0.5h
                  </Button>
                </div>
                <span>Target: 7-9 hours</span>
              </div>
            </div>

            {/* 3. Water Intake */}
            <div className="space-y-2.5 p-4 rounded-xl bg-muted/20 border border-border/60">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Droplet className="w-4 h-4 text-sky-500" />
                  Hydration Intake
                </Label>
                <div className="text-sm font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  {waterMl.toLocaleString()} ml (~{Math.round(waterMl / 250)} glasses)
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-9"
                  onClick={() => handleAdjustWater(250)}
                >
                  +1 Glass (250ml)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-9"
                  onClick={() => handleAdjustWater(500)}
                >
                  +2 Glasses (500ml)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-xs h-9 text-muted-foreground"
                  onClick={() => handleAdjustWater(-250)}
                >
                  -250ml
                </Button>
              </div>
            </div>

            {/* 4. Energy & Fatigue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Energy Score (1-10) */}
              <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Energy Level (1-10)
                  </Label>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    {energy}/10
                  </span>
                </div>
                <Slider
                  value={[energy]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(val) => setEnergy(val[0])}
                  className="py-1"
                />
                <p className="text-[11px] text-muted-foreground">
                  {energy <= 3 ? "Low energy" : energy <= 6 ? "Moderate energy" : energy <= 8 ? "Good energy" : "Peak energy"}
                </p>
              </div>

              {/* Fatigue Score (1-5) */}
              <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-purple-500" />
                    Fatigue Level
                  </Label>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                    {FATIGUE_OPTIONS.find((f) => f.value === fatigue)?.label}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1 pt-1">
                  {FATIGUE_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFatigue(f.value)}
                      className={`h-8 text-xs font-semibold rounded-md border transition-all ${
                        fatigue === f.value
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-background border-border text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      {f.value}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {FATIGUE_OPTIONS.find((f) => f.value === fatigue)?.description}
                </p>
              </div>
            </div>

            {/* 5. Physical Activity (Minutes) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Physical Activity (Minutes)
                </Label>
                <span className="text-xs font-medium text-muted-foreground">
                  {activityMinutes} mins today
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[0, 15, 30, 45, 60, 90].map((mins) => (
                  <Button
                    key={mins}
                    type="button"
                    size="sm"
                    variant={activityMinutes === mins ? "default" : "outline"}
                    className={`text-xs h-8 px-3 rounded-lg ${
                      activityMinutes === mins
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => setActivityMinutes(mins)}
                  >
                    {mins === 0 ? "Rest Day (0m)" : `${mins}m`}
                  </Button>
                ))}
              </div>
            </div>

            {/* 6. Optional Weight & Daily Note */}
            <div className="space-y-4 pt-2 border-t border-border/50">
              {/* Weight */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  Optional Weight (kg)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="20"
                  max="350"
                  placeholder="e.g. 70.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="max-w-xs text-sm"
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Daily Reflection or Symptoms Note (Optional)
                  </Label>
                  <span className="text-[11px] text-muted-foreground">{note.length}/500</span>
                </div>
                <Textarea
                  placeholder="Any physical sensations, habits, or reflections you'd like to remember..."
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 500))}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              {/* Emergency / Crisis Alert Banner if trigger words detected */}
              {emergencyCheck.isEmergency && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    Support & Immediate Medical Guidance
                  </div>
                  <p className="text-xs leading-relaxed text-rose-900">
                    Your note mentions symptoms that may require urgent attention or immediate support. Please know you
                    are not alone.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <a
                      href="tel:988"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors"
                    >
                      <PhoneCall className="w-3 h-3" /> Call/Text 988 (Lifeline)
                    </a>
                    <a
                      href="tel:911"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 font-semibold hover:bg-rose-200 transition-colors"
                    >
                      Call 911 / Local Emergency
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-3 flex items-center justify-end gap-3">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 shadow-xs"
              >
                {isSaving ? "Saving..." : hasExistingEntry ? "Update Check-in" : "Save Today's Check-in"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
