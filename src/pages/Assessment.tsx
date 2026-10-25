import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  calculateBMI,
  saveAssessment,
  feetInchesToCm,
  lbsToKg,
  kgToLbs,
  analyzeHealthAssessment,
  generateDemoHealthAnalysis,
  type HealthAnalysisResult,
  type AssessmentRecord,
} from "@/services/healthService";
import { getHealthProfile } from "@/services/profileService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Scale,
  Activity,
  Flame,
  AlertTriangle,
  Moon,
  Loader2,
  RefreshCw,
  Droplets,
  Utensils,
  Dna,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { detectEmergency, EMERGENCY_DISCLAIMER_MESSAGE } from "@/lib/emergencyDetector";
import { AfiyatLogo } from "@/components/common/AfiyatLogo";
import { CustomTagInput } from "@/components/common/CustomTagInput";

const ASSESSMENT_SYMPTOMS = [
  "Frequent fatigue or tiredness",
  "Recurring headaches",
  "Shortness of breath",
  "Chest pain or discomfort",
  "Dizziness or lightheadedness",
  "Excessive thirst",
  "Frequent urination",
  "Blurred vision",
  "Joint pain or stiffness",
  "Sleep problems / insomnia",
  "High stress or anxiety",
  "Digestive discomfort / bloating",
];

const HARMFUL_SUBSTANCES = [
  "Tobacco / Vaping / E-cigarettes",
  "Nicotine pouches (e.g. ZYN, VELO)",
  "Gutka",
  "Chhalia / Supari",
  "Paan",
  "Naswar",
  "Excess energy drinks / cold drinks",
];

const FAMILY_CONDITIONS = [
  "Diabetes",
  "Heart disease / Cardiovascular",
  "Hypertension (High BP)",
  "Cancer",
  "Asthma / Respiratory",
  "Kidney disease",
  "Thyroid disorder",
];

const ACTIVITY_LEVELS = [
  { value: "Sedentary", label: "Sedentary", desc: "Little or no exercise, desk job" },
  { value: "Light", label: "Lightly Active", desc: "Light exercise 1-3 days/week" },
  { value: "Moderate", label: "Moderately Active", desc: "Moderate workouts 3-5 days/week" },
  { value: "Active", label: "Very Active", desc: "Strenuous exercise 6-7 days/week" },
];

const DIET_TYPES = [
  "Balanced Diet",
  "High Processed / Fast Food",
  "High Sugar / Sweets",
  "High Fat / Oily",
  "Vegetarian",
  "Vegan",
];

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
  { value: "Prefer not to say", label: "Prefer not to say" },
];

const Assessment: React.FC = () => {
  const { user, isDemo: globalDemo } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(globalDemo);

  // Step 1: Body Basics
  const [age, setAge] = useState<number>(25);
  const [gender, setGender] = useState<string>("Male");
  const [heightFeet, setHeightFeet] = useState<number>(5);
  const [heightInches, setHeightInches] = useState<number>(7);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [weightInputStr, setWeightInputStr] = useState<string>("68");

  // Step 2: Symptoms & Lifestyle
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptomsList, setCustomSymptomsList] = useState<string[]>([]);
  const [activityLevel, setActivityLevel] = useState<string>("Moderate");
  const [dietType, setDietType] = useState<string>("Balanced Diet");
  const [smoking, setSmoking] = useState<boolean>(false);
  const [selectedSubstances, setSelectedSubstances] = useState<string[]>([]);
  const [customHabitsList, setCustomHabitsList] = useState<string[]>([]);
  const [alcohol, setAlcohol] = useState<boolean>(false);
  const [selectedFamilyConditions, setSelectedFamilyConditions] = useState<string[]>([]);
  const [customFamilyHistoryList, setCustomFamilyHistoryList] = useState<string[]>([]);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [waterLiters, setWaterLiters] = useState<number>(2.0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<HealthAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Load profile defaults if available
  useEffect(() => {
    if (user?.id) {
      getHealthProfile(user.id, isOfflineMode)
        .then((profile) => {
          if (profile) {
            if (profile.age) setAge(profile.age);
            if (profile.gender) setGender(profile.gender);
          }
        })
        .catch(() => {
          // Non-blocking fallback
        });
    }
  }, [user?.id, isOfflineMode]);

  // Derived height in cm and weight in kg
  const heightCm = feetInchesToCm(heightFeet, heightInches);
  const parsedWeight = parseFloat(weightInputStr);
  const validWeight = !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : 0;
  const inputWeight = validWeight;
  const weightKg = weightUnit === "lbs" ? lbsToKg(validWeight) : validWeight;

  // Real-time BMI calculation
  const { bmi, category: bmiCategory } = calculateBMI(heightCm, weightKg);

  // BMI Category Color & Scale Position
  const getBmiBadgeColor = (cat: string) => {
    switch (cat) {
      case "Normal weight":
        return "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold";
      case "Overweight":
      case "Underweight":
        return "bg-amber-50 text-amber-800 border-amber-300 font-bold";
      case "Severe Thinness":
      case "Obesity":
        return "bg-rose-50 text-rose-800 border-rose-300 font-bold";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200 font-medium";
    }
  };

  // Symptom selection helper
  const toggleSymptom = (item: string) => {
    if (selectedSymptoms.includes(item)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== item));
    } else {
      setSelectedSymptoms([...selectedSymptoms, item]);
    }
  };

  // Tag modification helpers for multi-entry tags
  const addCustomSymptom = (tag: string) => {
    setCustomSymptomsList((prev) => [...prev, tag]);
  };
  const removeCustomSymptom = (tag: string) => {
    setCustomSymptomsList((prev) => prev.filter((t) => t !== tag));
  };

  const addCustomHabit = (tag: string) => {
    setCustomHabitsList((prev) => [...prev, tag]);
  };
  const removeCustomHabit = (tag: string) => {
    setCustomHabitsList((prev) => prev.filter((t) => t !== tag));
  };

  const addCustomFamilyCondition = (tag: string) => {
    setCustomFamilyHistoryList((prev) => [...prev, tag]);
  };
  const removeCustomFamilyCondition = (tag: string) => {
    setCustomFamilyHistoryList((prev) => prev.filter((t) => t !== tag));
  };

  const handleClearSymptoms = () => {
    setSelectedSymptoms([]);
    setCustomSymptomsList([]);
  };

  // Substances selection helper
  const toggleSubstance = (item: string) => {
    if (selectedSubstances.includes(item)) {
      setSelectedSubstances(selectedSubstances.filter((s) => s !== item));
    } else {
      setSelectedSubstances([...selectedSubstances, item]);
    }
  };

  // Family condition selection helper
  const toggleFamilyCondition = (item: string) => {
    if (selectedFamilyConditions.includes(item)) {
      setSelectedFamilyConditions(selectedFamilyConditions.filter((c) => c !== item));
    } else {
      setSelectedFamilyConditions([...selectedFamilyConditions, item]);
    }
  };

  // Toggle Weight Unit
  const handleWeightUnitChange = (unit: "kg" | "lbs") => {
    if (unit === weightUnit) return;
    if (validWeight > 0) {
      if (unit === "lbs") {
        setWeightInputStr(String(kgToLbs(validWeight)));
      } else {
        setWeightInputStr(String(lbsToKg(validWeight)));
      }
    }
    setWeightUnit(unit);
  };

  // Step 1 to Step 2 Validation Handler
  const handleContinueToStep2 = () => {
    if (!validWeight || validWeight <= 0) {
      toast({
        title: "Weight required",
        description: "Please enter your weight before continuing to Step 2.",
        variant: "destructive",
      });
      return;
    }
    if (weightKg < 20 || weightKg > 650) {
      toast({
        title: "Weight out of realistic range",
        description: `Please enter a weight between 20 kg (44 lbs) and 650 kg (1430 lbs). Current: ${weightKg.toFixed(1)} kg.`,
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  // Check for red flag symptoms
  const hasChestPainOrSevereBreathing =
    selectedSymptoms.includes("Chest pain or discomfort") ||
    (selectedSymptoms.includes("Shortness of breath") && selectedSymptoms.length > 2);

  // Calculate categorical risk and recommendations
  const calculateAnalysis = () => {
    let riskLevel: "Low" | "Medium" | "High" = "Low";
    const totalSymptoms = selectedSymptoms.length + customSymptomsList.length;

    const hasHighRiskHabits = smoking || selectedSubstances.length > 0 || alcohol;
    const hasUnfavorableLifestyle = sleepHours < 6 || waterLiters < 1.5 || dietType.includes("High");

    if (
      hasChestPainOrSevereBreathing ||
      totalSymptoms >= 4 ||
      bmiCategory === "Obesity" ||
      bmiCategory === "Severe Thinness" ||
      (totalSymptoms >= 2 && hasHighRiskHabits)
    ) {
      riskLevel = "High";
    } else if (
      totalSymptoms >= 1 ||
      bmiCategory === "Overweight" ||
      bmiCategory === "Underweight" ||
      hasHighRiskHabits ||
      hasUnfavorableLifestyle
    ) {
      riskLevel = "Medium";
    }

    const recommendations: string[] = [];

    if (hasChestPainOrSevereBreathing) {
      recommendations.push(
        "⚠️ Urgent: You reported chest discomfort or breathing difficulty. Please seek prompt evaluation from an emergency department or doctor."
      );
    }

    if (bmiCategory === "Obesity" || bmiCategory === "Overweight") {
      recommendations.push(
        "Discuss a personalized metabolic plan with a primary care doctor, focusing on balanced portions and moderate aerobic exercise."
      );
    } else if (bmiCategory === "Severe Thinness") {
      recommendations.push(
        "⚠️ Severe Thinness detected (BMI < 16.0). Please consult a healthcare provider or clinical dietitian promptly to assess underlying nutritional needs."
      );
    } else if (bmiCategory === "Underweight") {
      recommendations.push(
        "Consult a dietitian to incorporate calorie-dense, nutrient-rich whole foods into your daily meals."
      );
    } else {
      recommendations.push("Maintain a nutritious, varied whole-food diet to sustain healthy metabolic function.");
    }

    if (smoking || selectedSubstances.length > 0) {
      recommendations.push(
        "Consider evidence-based cessation support or counseling for tobacco/substance use to protect long-term cardiovascular health."
      );
    }

    if (sleepHours < 7) {
      recommendations.push("Prioritize a regular sleep schedule to achieve 7-9 hours of restorative rest nightly.");
    }

    if (waterLiters < 2) {
      recommendations.push("Increase daily hydration to at least 2.0 liters of water throughout the day.");
    }

    if (activityLevel === "Sedentary") {
      recommendations.push("Introduce 20-30 minutes of gentle walking or light movement 4-5 times a week.");
    }

    const summary = `Your BMI is ${bmi} (${bmiCategory}) based on ${heightFeet}'${heightInches}" (${heightCm} cm) and ${weightKg} kg. With ${totalSymptoms} reported symptom(s), a ${activityLevel.toLowerCase()} activity profile, and your recorded lifestyle habits, your overall wellness risk indicator is categorized as ${riskLevel}.`;

    return { riskLevel, summary, recommendations };
  };

  const handleProceedToStep3 = async () => {
    setStep(3);
    setIsAnalyzing(true);

    const compiledSymptoms = [...selectedSymptoms, ...customSymptomsList];
    const compiledSubstances = [...selectedSubstances, ...customHabitsList];
    const compiledFamilyHistory = [...selectedFamilyConditions, ...customFamilyHistoryList];

    const draftRecord: AssessmentRecord = {
      user_id: user?.id,
      height_cm: heightCm,
      weight_kg: weightKg,
      bmi,
      bmi_category: bmiCategory,
      symptoms: compiledSymptoms.length > 0 ? compiledSymptoms : ["None reported"],
      lifestyle_data: {
        age,
        gender,
        height_feet: heightFeet,
        height_inches: heightInches,
        weight_unit: weightUnit,
        input_weight: inputWeight,
        activity_level: activityLevel,
        diet_type: dietType,
        smoking,
        harmful_substances: compiledSubstances,
        custom_habits: customHabitsList.length > 0 ? customHabitsList.join(", ") : undefined,
        alcohol,
        family_history: compiledFamilyHistory,
        custom_family_history: customFamilyHistoryList.length > 0 ? customFamilyHistoryList.join(", ") : undefined,
        custom_symptoms: customSymptomsList.length > 0 ? customSymptomsList.join(", ") : undefined,
        sleep_hours: sleepHours,
        water_liters: waterLiters,
      },
      risk_level: "Low",
      ai_summary: "",
      recommendations: [],
      disclaimer: "This is not a medical diagnosis. It is general wellness guidance.",
    };

    setAnalysisError(null);
    if (isOfflineMode) {
      // Offline mode evaluates deterministically without cloud AI calls
      setAnalysisResult(generateDemoHealthAnalysis(draftRecord));
      setIsAnalyzing(false);
      return;
    }

    try {
      const result = await analyzeHealthAssessment(draftRecord, false);
      setAnalysisResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate AI health analysis.";
      setAnalysisError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderRiskIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case "scale":
        return <Scale className="w-4 h-4 text-emerald-600" />;
      case "flame":
        return <Flame className="w-4 h-4 text-rose-600" />;
      case "heart":
        return <Heart className="w-4 h-4 text-rose-600" />;
      case "shieldalert":
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      case "moon":
        return <Moon className="w-4 h-4 text-indigo-600" />;
      case "alerttriangle":
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Activity className="w-4 h-4 text-teal-600" />;
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setIsSubmitting(true);

    const fallbackAnalysis = calculateAnalysis();
    const finalRiskLevel = analysisResult?.overall_risk_level || fallbackAnalysis.riskLevel;
    const finalSummary = analysisResult?.summary || fallbackAnalysis.summary;
    const finalRecommendations = analysisResult?.recommendations || fallbackAnalysis.recommendations;

    const compiledSymptoms = [...selectedSymptoms, ...customSymptomsList];
    const compiledSubstances = [...selectedSubstances, ...customHabitsList];
    const compiledFamilyHistory = [...selectedFamilyConditions, ...customFamilyHistoryList];

    try {
      await saveAssessment(
        {
          user_id: user.id,
          height_cm: heightCm,
          weight_kg: weightKg,
          bmi,
          bmi_category: bmiCategory,
          symptoms: compiledSymptoms.length > 0 ? compiledSymptoms : ["None reported"],
          lifestyle_data: {
            age,
            gender,
            height_feet: heightFeet,
            height_inches: heightInches,
            weight_unit: weightUnit,
            input_weight: inputWeight,
            activity_level: activityLevel,
            diet_type: dietType,
            smoking,
            harmful_substances: compiledSubstances,
            custom_habits: customHabitsList.length > 0 ? customHabitsList.join(", ") : undefined,
            alcohol,
            family_history: compiledFamilyHistory,
            custom_family_history: customFamilyHistoryList.length > 0 ? customFamilyHistoryList.join(", ") : undefined,
            custom_symptoms: customSymptomsList.length > 0 ? customSymptomsList.join(", ") : undefined,
            sleep_hours: sleepHours,
            water_liters: waterLiters,
            dynamic_risks: analysisResult?.risks,
            assessment_mode: isOfflineMode ? "offline" : "online",
          },
          risk_level: finalRiskLevel,
          ai_summary: finalSummary,
          recommendations: finalRecommendations,
          disclaimer: analysisResult?.disclaimer || "This is not a medical diagnosis. It is general wellness guidance.",
        },
        globalDemo
      );

      toast({
        title: "Assessment Successfully Saved",
        description: "Your personalized dynamic health assessment has been saved to your dashboard.",
      });

      navigate("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as Record<string, unknown>).message)
          : "Failed to persist assessment data.";
      toast({
        title: "Error saving assessment",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col">
      {/* Top Header with Authentic Afiyat Calligraphy Logo */}
      <header className="p-4 sm:p-5 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs backdrop-blur-md">
        <div className="container mx-auto max-w-4xl flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 text-xs sm:text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
            <span>Dashboard</span>
          </Link>

          {/* Centralized Brand Identity */}
          <div className="flex items-center gap-3">
            <AfiyatLogo variant="mark" size="xs" linkTo="/" />
            <span className="font-bold text-slate-900 text-sm sm:text-base hidden sm:inline">
              Health Risk Assessment
            </span>
          </div>

          {/* Offline Mode Switch */}
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <Label htmlFor="offline-mode-toggle" className="text-xs font-bold text-slate-800 cursor-pointer block leading-tight">
                Offline Mode
              </Label>
              <span className="text-[10px] text-slate-500 font-medium">Deterministic • Rule-Based</span>
            </div>
            <Label htmlFor="offline-mode-toggle" className="text-xs font-bold text-slate-800 sm:hidden">
              Offline
            </Label>
            <Switch
              id="offline-mode-toggle"
              checked={isOfflineMode}
              onCheckedChange={setIsOfflineMode}
              aria-label="Toggle offline deterministic mode"
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 container mx-auto max-w-2xl px-4 py-8">
        {/* Progress Stepper with High-Contrast Active States */}
        <div className="flex items-center justify-between mb-8">
          {[
            { num: 1, label: "Body Basics" },
            { num: 2, label: "Symptoms & Habits" },
            { num: 3, label: isOfflineMode ? "Review & Save" : "AI Review & Save" },
          ].map((s) => (
            <div key={s.num} className="flex-1 flex items-center">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    step === s.num
                      ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm ring-4 ring-emerald-100"
                      : step > s.num
                      ? "bg-emerald-100 text-emerald-800 font-bold border border-emerald-300"
                      : "bg-slate-200 text-slate-500 font-medium"
                  }`}
                >
                  {step > s.num ? <CheckCircle2 className="w-5 h-5 text-emerald-700" /> : s.num}
                </div>
                <span
                  className={`text-xs hidden md:inline font-bold ${
                    step === s.num ? "text-slate-900" : step > s.num ? "text-emerald-800" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {s.num < 3 && (
                <div
                  className={`flex-1 h-1 mx-3 rounded-full transition-colors ${
                    step > s.num ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* STEP 1: BODY BASICS */}
        {step === 1 && (
          <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-6 sm:p-7 space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                <Scale className="w-4 h-4" />
                <span>Step 1 of 3</span>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Body Basics & Biometrics
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 font-normal">
                Enter your age, biological sex, height, and weight to calculate your Body Mass Index (BMI).
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 sm:p-7 space-y-6">
              {/* Age & Gender Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Age (Years)
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    min="1"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(Math.max(1, Number(e.target.value)))}
                    className="h-11 text-base font-semibold rounded-xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Biological Sex
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {GENDER_OPTIONS.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setGender(g.value)}
                        className={`h-11 px-3 rounded-xl text-xs font-bold border transition-all ${
                          gender === g.value
                            ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Height: Feet & Inches */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Height (Feet & Inches)
                  </Label>
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    ≈ {heightCm} cm
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="height-feet" className="text-xs font-medium text-slate-600">
                      Feet
                    </Label>
                    <select
                      id="height-feet"
                      value={heightFeet}
                      onChange={(e) => setHeightFeet(Number(e.target.value))}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:ring-emerald-500"
                    >
                      {[3, 4, 5, 6, 7].map((ft) => (
                        <option key={ft} value={ft}>
                          {ft} ft
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="height-inches" className="text-xs font-medium text-slate-600">
                      Inches
                    </Label>
                    <select
                      id="height-inches"
                      value={heightInches}
                      onChange={(e) => setHeightInches(Number(e.target.value))}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:ring-emerald-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>
                          {i} in
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Weight: Input + Unit Toggle */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="weight-input" className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Weight ({weightUnit.toUpperCase()})
                  </Label>
                  <div className="inline-flex rounded-xl border border-slate-300 p-0.5 bg-slate-100">
                    <button
                      type="button"
                      onClick={() => handleWeightUnitChange("kg")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        weightUnit === "kg"
                          ? "bg-white text-emerald-800 shadow-2xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWeightUnitChange("lbs")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        weightUnit === "lbs"
                          ? "bg-white text-emerald-800 shadow-2xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      lbs
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Input
                    id="weight-input"
                    type="text"
                    inputMode="decimal"
                    placeholder={weightUnit === "kg" ? "e.g. 68" : "e.g. 150"}
                    value={weightInputStr}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) {
                        setWeightInputStr(val);
                      }
                    }}
                    className="h-11 text-base font-semibold rounded-xl border-slate-300 flex-1 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-2.5 rounded-xl border border-slate-200 shrink-0">
                    {validWeight > 0
                      ? weightUnit === "lbs"
                        ? `≈ ${weightKg} kg`
                        : `≈ ${kgToLbs(weightKg)} lbs`
                      : "—"}
                  </div>
                </div>
              </div>

              {/* Live Real-Time BMI Indicator Card */}
              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-emerald-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Evaluated Body Mass Index
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs px-2.5 py-0.5 rounded-full ${
                      validWeight > 0
                        ? getBmiBadgeColor(bmiCategory)
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {validWeight > 0 ? bmiCategory : "Awaiting weight"}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                    {validWeight > 0 ? bmi : "—"}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">kg/m²</span>
                </div>

                {/* Visual BMI Gauge Spectrum (5 Categories) */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-5 gap-1.5 h-2.5 rounded-full overflow-hidden bg-slate-200">
                    <div
                      className={`h-full transition-all ${
                        validWeight > 0 && bmi < 16.0
                          ? "bg-rose-500 ring-2 ring-rose-300"
                          : "bg-rose-300/40"
                      }`}
                      title="Severe Thinness (< 16.0)"
                    />
                    <div
                      className={`h-full transition-all ${
                        validWeight > 0 && bmi >= 16.0 && bmi < 18.5
                          ? "bg-amber-500 ring-2 ring-amber-300"
                          : "bg-amber-300/40"
                      }`}
                      title="Underweight (16.0 - 18.4)"
                    />
                    <div
                      className={`h-full transition-all ${
                        validWeight > 0 && bmi >= 18.5 && bmi < 25.0
                          ? "bg-emerald-500 ring-2 ring-emerald-300"
                          : "bg-emerald-300/40"
                      }`}
                      title="Normal (18.5 - 24.9)"
                    />
                    <div
                      className={`h-full transition-all ${
                        validWeight > 0 && bmi >= 25.0 && bmi < 30.0
                          ? "bg-amber-500 ring-2 ring-amber-300"
                          : "bg-amber-300/40"
                      }`}
                      title="Overweight (25.0 - 29.9)"
                    />
                    <div
                      className={`h-full transition-all ${
                        validWeight > 0 && bmi >= 30.0
                          ? "bg-rose-500 ring-2 ring-rose-300"
                          : "bg-rose-300/40"
                      }`}
                      title="Obesity (≥ 30.0)"
                    />
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-bold text-rose-700 leading-tight">Severe Thinness</span>
                      <span className="text-[10px] text-slate-500 font-medium">&lt; 16.0</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-bold text-amber-700 leading-tight">Underweight</span>
                      <span className="text-[10px] text-slate-500 font-medium">16.0–18.4</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-bold text-emerald-700 leading-tight">Normal</span>
                      <span className="text-[10px] text-slate-500 font-medium">18.5–24.9</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-bold text-amber-700 leading-tight">Overweight</span>
                      <span className="text-[10px] text-slate-500 font-medium">25.0–29.9</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-bold text-rose-700 leading-tight">Obesity</span>
                      <span className="text-[10px] text-slate-500 font-medium">≥ 30.0</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="flex justify-end pt-3">
                <Button
                  onClick={handleContinueToStep2}
                  className="gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-sm"
                >
                  <span>Continue to Symptoms & Habits</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: SYMPTOMS & LIFESTYLE */}
        {step === 2 && (
          <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-6 sm:p-7 space-y-1">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 uppercase tracking-wider mb-1">
                  <Activity className="w-4 h-4" />
                  <span>Step 2 of 3</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearSymptoms}
                  className="text-xs font-bold text-slate-500 hover:text-rose-600 underline underline-offset-2 transition-colors"
                >
                  Clear symptoms
                </button>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Symptoms & Daily Habits
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 font-normal">
                Select your experienced symptoms and lifestyle factors for comprehensive wellness evaluation.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 sm:p-7 space-y-7">
              {/* 1. Multi-Select Symptoms Cards */}
              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Current Symptoms (Select all that apply)</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ASSESSMENT_SYMPTOMS.map((symptom) => {
                    const isSelected = selectedSymptoms.includes(symptom);
                    return (
                      <button
                        key={symptom}
                        type="button"
                        onClick={() => toggleSymptom(symptom)}
                        className={`p-3 rounded-xl text-left text-xs font-semibold border transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-emerald-50 text-emerald-900 border-emerald-400 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate pr-2">{symptom}</span>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Optional Custom Symptoms (Online Mode only) */}
                {!isOfflineMode ? (
                  <div className="pt-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Add Other Specific Symptoms (Press Enter or + to add)
                    </Label>
                    <CustomTagInput
                      tags={customSymptomsList}
                      onAddTag={addCustomSymptom}
                      onRemoveTag={removeCustomSymptom}
                      placeholder="e.g. Mild lower back stiffness, acid reflux..."
                      badgeVariantClassName="bg-emerald-50 text-emerald-900 border-emerald-300"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic pt-1">
                    Offline mode evaluates standardized structured indicators without cloud AI processing.
                  </p>
                )}
              </div>

              {/* 2. Physical Activity Level */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Physical Activity Level
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ACTIVITY_LEVELS.map((act) => (
                    <button
                      key={act.value}
                      type="button"
                      onClick={() => setActivityLevel(act.value)}
                      className={`p-3 rounded-xl text-left text-xs border transition-all ${
                        activityLevel === act.value
                          ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <p className="font-bold text-slate-900">{act.label}</p>
                      <p className="text-[11px] text-slate-500 font-normal mt-0.5">{act.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Dietary Pattern */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-emerald-600" />
                  <span>Dietary Pattern</span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DIET_TYPES.map((diet) => (
                    <button
                      key={diet}
                      type="button"
                      onClick={() => setDietType(diet)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border text-center transition-all truncate ${
                        dietType === diet
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {diet}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Smoking & Harmful Substances */}
              <div className="space-y-4 p-4 rounded-2xl bg-amber-50/40 border border-amber-200/70">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-600" />
                      <span>Cigarette Smoking</span>
                    </Label>
                    <p className="text-xs text-slate-500 mt-0.5">Do you actively smoke cigarettes?</p>
                  </div>
                  <div className="inline-flex rounded-xl border border-slate-300 p-0.5 bg-white">
                    <button
                      type="button"
                      onClick={() => setSmoking(false)}
                      className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        !smoking
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmoking(true)}
                      className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        smoking
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                {/* Regional Substances & Habits */}
                <div className="space-y-2 pt-3 border-t border-amber-200/60">
                  <Label className="text-xs font-bold text-slate-800">
                    Other Substances & Habits (Select all that apply)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {HARMFUL_SUBSTANCES.map((substance) => {
                      const isSelected = selectedSubstances.includes(substance);
                      return (
                        <button
                          key={substance}
                          type="button"
                          onClick={() => toggleSubstance(substance)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isSelected
                              ? "bg-amber-100 text-amber-900 border-amber-400 font-bold"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {substance}
                        </button>
                      );
                    })}
                  </div>
                  {!isOfflineMode && (
                    <div className="pt-2 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Add Other Substance Habits (Press Enter or + to add)
                      </Label>
                      <CustomTagInput
                        tags={customHabitsList}
                        onAddTag={addCustomHabit}
                        onRemoveTag={removeCustomHabit}
                        placeholder="e.g. Occasional hookah, betel nut..."
                        badgeVariantClassName="bg-amber-100 text-amber-950 border-amber-300"
                      />
                    </div>
                  )}
                </div>

                {/* Alcohol Consumption */}
                <div className="flex items-center justify-between pt-3 border-t border-amber-200/60">
                  <div>
                    <Label className="text-xs font-bold text-slate-900">Regular Alcohol Consumption</Label>
                    <p className="text-xs text-slate-500 mt-0.5">Regular or weekly alcoholic drinks</p>
                  </div>
                  <div className="inline-flex rounded-xl border border-slate-300 p-0.5 bg-white">
                    <button
                      type="button"
                      onClick={() => setAlcohol(false)}
                      className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        !alcohol ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlcohol(true)}
                      className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        alcohol ? "bg-amber-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Family Medical History */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Dna className="w-4 h-4 text-emerald-600" />
                  <span>Family History of Chronic Conditions</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {FAMILY_CONDITIONS.map((cond) => {
                    const isSelected = selectedFamilyConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => toggleFamilyCondition(cond)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? "bg-teal-100 text-teal-900 border-teal-400 font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {cond}
                      </button>
                    );
                  })}
                </div>
                {!isOfflineMode && (
                  <div className="pt-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Add Other Family Chronic Conditions (Press Enter or + to add)
                    </Label>
                    <CustomTagInput
                      tags={customFamilyHistoryList}
                      onAddTag={addCustomFamilyCondition}
                      onRemoveTag={removeCustomFamilyCondition}
                      placeholder="e.g. Alzheimer's, Osteoporosis, Autoimmune..."
                      badgeVariantClassName="bg-teal-100 text-teal-950 border-teal-300"
                    />
                  </div>
                )}
              </div>

              {/* 6. Sleep & Hydration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="sleep-hours" className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Moon className="w-4 h-4 text-indigo-600" />
                      <span>Daily Sleep (Hours)</span>
                    </Label>
                    <span className="text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      {sleepHours} hrs
                    </span>
                  </div>
                  <Input
                    id="sleep-hours"
                    type="number"
                    min="3"
                    max="14"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(Number(e.target.value))}
                    className="h-11 text-base font-semibold rounded-xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="water-liters" className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Droplets className="w-4 h-4 text-cyan-600" />
                      <span>Water Intake (Liters/Day)</span>
                    </Label>
                    <span className="text-xs font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                      {waterLiters} L
                    </span>
                  </div>
                  <Input
                    id="water-liters"
                    type="number"
                    min="0.5"
                    max="6.0"
                    step="0.5"
                    value={waterLiters}
                    onChange={(e) => setWaterLiters(Number(e.target.value))}
                    className="h-11 text-base font-semibold rounded-xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="gap-2 h-11 px-5 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Body Basics</span>
                </Button>
                <Button
                  onClick={handleProceedToStep3}
                  disabled={isAnalyzing}
                  className="gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-sm"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span>Review Assessment</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: DYNAMIC RISK ASSESSMENT & SAVE */}
        {step === 3 && (
          <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-6 sm:p-7 space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4" />
                <span>
                  {isOfflineMode
                    ? "Step 3 of 3 • Offline Review & Save"
                    : "Step 3 of 3 • Verification & Save"}
                </span>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {isOfflineMode
                  ? "Health Analysis & Recommendations"
                  : "AI Health Analysis & Recommendations"}
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 font-normal">
                {isOfflineMode
                  ? "Review your rule-based health assessment and wellness guidance before saving to your dashboard."
                  : "Review your evaluated health risks and personalized guidance before saving to your dashboard history."}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 sm:p-7 space-y-6">
              {isAnalyzing ? (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center animate-pulse shadow-xs">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h3 className="font-extrabold text-base text-slate-900">
                      Analyzing Your Health Metrics...
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">
                      Evaluating metabolic biometrics, reported symptoms, lifestyle habits, and risk patterns with our
                      transparent AI health engine.
                    </p>
                  </div>
                </div>
              ) : analysisError && !analysisResult ? (
                <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-rose-900">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span className="font-semibold leading-relaxed">{analysisError}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleProceedToStep3}
                    disabled={isAnalyzing}
                    className="h-9 px-4 text-xs font-bold border-rose-300 hover:bg-rose-100 text-rose-900 shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    <span>Retry Analysis</span>
                  </Button>
                </div>
              ) : (
                (() => {
                  const fallbackAnalysis = calculateAnalysis();
                  const currentAnalysis = analysisResult || {
                    overall_risk_level: fallbackAnalysis.riskLevel,
                    summary: fallbackAnalysis.summary,
                    risks: [
                      {
                        condition: "General Wellness Profile",
                        risk_level: "Low" as const,
                        rationale: "Your biometric measurements and lifestyle habits reflect a balanced baseline.",
                        icon_name: "Activity",
                      },
                    ],
                    recommendations: fallbackAnalysis.recommendations,
                    disclaimer: "This is not a medical diagnosis. Please consult a qualified healthcare professional.",
                  };

                  const emergencyCheck = detectEmergency(
                    `${selectedSymptoms.join(" ")} ${customSymptomsList.join(" ")} ${customHabitsList.join(" ")}`
                  );
                  const isAcuteAlert = emergencyCheck.isEmergency || hasChestPainOrSevereBreathing;

                  return (
                    <div className="space-y-6">
                      {/* Offline Mode Banner (Requirement A) */}
                      {isOfflineMode && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-amber-950 shadow-xs space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                              OFFLINE MODE
                            </Badge>
                            <span className="text-xs font-bold text-amber-900">
                              Rule-Based Result — Not AI-Analyzed
                            </span>
                          </div>
                          <p className="text-xs text-amber-900 leading-relaxed font-normal">
                            This report was generated using the application&apos;s offline rules. An AI model did not analyze your responses, and the result may be less personalized than an AI-assisted assessment.
                          </p>
                          <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
                            <span>Notice:</span> This is not a medical diagnosis. Please consult a qualified healthcare professional.
                          </p>
                        </div>
                      )}

                      {/* Acute Emergency Banner */}
                      {isAcuteAlert && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 flex items-start gap-3.5 text-xs text-rose-950 shadow-xs">
                          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-bold text-sm text-rose-900">Immediate Medical Attention Recommended</p>
                            <p className="text-xs leading-relaxed text-rose-800 font-medium">
                              {emergencyCheck.emergencyAdvice || EMERGENCY_DISCLAIMER_MESSAGE}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 1. BMI Hero Card */}
                      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                              <Scale className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Body Mass Index (BMI)
                              </h4>
                              <p className="text-xs text-slate-500">
                                {heightFeet}&apos;{heightInches}&quot; ({heightCm} cm) • {inputWeight} {weightUnit} (
                                {weightUnit === "lbs" ? `≈ ${weightKg} kg` : `≈ ${kgToLbs(weightKg)} lbs`})
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-xs px-2.5 py-0.5 rounded-full ${getBmiBadgeColor(bmiCategory)}`}>
                            {bmiCategory}
                          </Badge>
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{bmi}</span>
                          <span className="text-xs font-semibold text-slate-500">kg/m²</span>
                        </div>

                        {/* Visual BMI Gauge Spectrum (5 Categories) */}
                        <div className="space-y-2 pt-1">
                          <div className="grid grid-cols-5 gap-1.5 h-2.5 rounded-full overflow-hidden bg-slate-200">
                            <div
                              className={`h-full transition-all ${
                                bmi < 16.0 ? "bg-rose-500 ring-2 ring-rose-300" : "bg-rose-300/40"
                              }`}
                              title="Severe Thinness (< 16.0)"
                            />
                            <div
                              className={`h-full transition-all ${
                                bmi >= 16.0 && bmi < 18.5 ? "bg-amber-500 ring-2 ring-amber-300" : "bg-amber-300/40"
                              }`}
                              title="Underweight (16.0 - 18.4)"
                            />
                            <div
                              className={`h-full transition-all ${
                                bmi >= 18.5 && bmi < 25.0 ? "bg-emerald-500 ring-2 ring-emerald-300" : "bg-emerald-300/40"
                              }`}
                              title="Normal (18.5 - 24.9)"
                            />
                            <div
                              className={`h-full transition-all ${
                                bmi >= 25.0 && bmi < 30.0 ? "bg-amber-500 ring-2 ring-amber-300" : "bg-amber-300/40"
                              }`}
                              title="Overweight (25.0 - 29.9)"
                            />
                            <div
                              className={`h-full transition-all ${
                                bmi >= 30.0 ? "bg-rose-500 ring-2 ring-rose-300" : "bg-rose-300/40"
                              }`}
                              title="Obesity (≥ 30.0)"
                            />
                          </div>
                          <div className="grid grid-cols-5 gap-1 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-[11px] font-bold text-rose-700 leading-tight">Severe Thinness</span>
                              <span className="text-[10px] text-slate-500 font-medium">&lt; 16.0</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[11px] font-bold text-amber-700 leading-tight">Underweight</span>
                              <span className="text-[10px] text-slate-500 font-medium">16.0–18.4</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[11px] font-bold text-emerald-700 leading-tight">Normal</span>
                              <span className="text-[10px] text-slate-500 font-medium">18.5–24.9</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[11px] font-bold text-amber-700 leading-tight">Overweight</span>
                              <span className="text-[10px] text-slate-500 font-medium">25.0–29.9</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[11px] font-bold text-rose-700 leading-tight">Obesity</span>
                              <span className="text-[10px] text-slate-500 font-medium">≥ 30.0</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. Personalized Assessment Narrative */}
                      <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-teal-700" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                              {isOfflineMode ? "Standardized Health Summary" : "Personalized Health Narrative"}
                            </h4>
                          </div>
                          <Badge
                            className={`text-xs font-bold px-3 py-1 rounded-full ${
                              currentAnalysis.overall_risk_level === "Low"
                                ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                : currentAnalysis.overall_risk_level === "Medium"
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-rose-100 text-rose-900 border-rose-300"
                            }`}
                          >
                            {currentAnalysis.overall_risk_level} Risk
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed font-normal">
                          {currentAnalysis.summary}
                        </p>
                      </div>

                      {/* 3. Identified Health Risk Indicators */}
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Evaluated Health Risk Indicators</h4>
                          <p className="text-xs text-slate-500">
                            Conditions evaluated based on biometrics, reported symptoms, and lifestyle habits
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {currentAnalysis.risks.map((riskItem, idx) => (
                            <div
                              key={idx}
                              className={`p-4 rounded-2xl border transition-all ${
                                riskItem.risk_level === "High"
                                  ? "bg-rose-50/60 border-rose-200"
                                  : riskItem.risk_level === "Medium"
                                  ? "bg-amber-50/60 border-amber-200"
                                  : "bg-emerald-50/60 border-emerald-200"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                                    {renderRiskIcon(riskItem.icon_name)}
                                  </div>
                                  <span className="text-xs font-bold text-slate-900 leading-snug">
                                    {riskItem.condition}
                                  </span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`text-3xs font-bold px-2 py-0.5 shrink-0 ${
                                    riskItem.risk_level === "High"
                                      ? "bg-rose-100 text-rose-800 border-rose-300"
                                      : riskItem.risk_level === "Medium"
                                      ? "bg-amber-100 text-amber-800 border-amber-300"
                                      : "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  }`}
                                >
                                  {riskItem.risk_level}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                                {riskItem.rationale}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 4. Actionable Wellness Recommendations */}
                      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Actionable Wellness Steps
                        </h4>
                        <div className="space-y-3">
                          {currentAnalysis.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-3 text-xs sm:text-sm text-slate-800">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-relaxed font-normal">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 5. Medical Safety Notice */}
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
                        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                          <strong>Medical Notice:</strong> This is not a medical diagnosis. It is general lifestyle awareness based on self-reported inputs. Please consult a qualified healthcare professional.
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Step 3 Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  disabled={isSubmitting || isAnalyzing}
                  className="gap-2 h-11 px-5 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Edit Inputs</span>
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={isSubmitting || isAnalyzing}
                  className="gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Save Assessment</span>
                      <CheckCircle2 className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Assessment;
