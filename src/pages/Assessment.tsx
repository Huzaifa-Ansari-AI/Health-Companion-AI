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
  Info,
  Moon,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { detectEmergency, EMERGENCY_DISCLAIMER_MESSAGE } from "@/lib/emergencyDetector";

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
  const [localDemo, setLocalDemo] = useState<boolean>(globalDemo);

  // Step 1: Body Basics
  const [age, setAge] = useState<number>(25);
  const [gender, setGender] = useState<string>("Male");
  const [heightFeet, setHeightFeet] = useState<number>(5);
  const [heightInches, setHeightInches] = useState<number>(7);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [inputWeight, setInputWeight] = useState<number>(68);

  // Step 2: Symptoms & Lifestyle
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptoms, setCustomSymptoms] = useState<string>("");
  const [activityLevel, setActivityLevel] = useState<string>("Moderate");
  const [dietType, setDietType] = useState<string>("Balanced Diet");
  const [smoking, setSmoking] = useState<boolean>(false);
  const [selectedSubstances, setSelectedSubstances] = useState<string[]>([]);
  const [customHabits, setCustomHabits] = useState<string>("");
  const [alcohol, setAlcohol] = useState<boolean>(false);
  const [selectedFamilyConditions, setSelectedFamilyConditions] = useState<string[]>([]);
  const [customFamilyHistory, setCustomFamilyHistory] = useState<string>("");
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [waterLiters, setWaterLiters] = useState<number>(2.0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<HealthAnalysisResult | null>(null);

  // Load profile defaults if available
  useEffect(() => {
    if (user?.id) {
      getHealthProfile(user.id, localDemo)
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
  }, [user?.id, localDemo]);

  // Derived height in cm and weight in kg
  const heightCm = feetInchesToCm(heightFeet, heightInches);
  const weightKg = weightUnit === "lbs" ? lbsToKg(inputWeight) : inputWeight;

  // Real-time BMI calculation
  const { bmi, category: bmiCategory } = calculateBMI(heightCm, weightKg);

  // BMI Category Color & Scale Position
  const getBmiBadgeColor = (cat: string) => {
    switch (cat) {
      case "Normal weight":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      case "Overweight":
      case "Underweight":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
      case "Obesity":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
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

  const handleClearSymptoms = () => {
    setSelectedSymptoms([]);
    setCustomSymptoms("");
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
    if (unit === "lbs") {
      setInputWeight(kgToLbs(inputWeight));
    } else {
      setInputWeight(lbsToKg(inputWeight));
    }
    setWeightUnit(unit);
  };

  // Check for red flag symptoms
  const hasChestPainOrSevereBreathing =
    selectedSymptoms.includes("Chest pain or discomfort") ||
    (selectedSymptoms.includes("Shortness of breath") && selectedSymptoms.length > 2);

  // Calculate categorical risk and recommendations
  const calculateAnalysis = () => {
    let riskLevel: "Low" | "Medium" | "High" = "Low";
    const totalSymptoms = selectedSymptoms.length + (customSymptoms.trim() ? 1 : 0);

    const hasHighRiskHabits = smoking || selectedSubstances.length > 0 || alcohol;
    const hasUnfavorableLifestyle = sleepHours < 6 || waterLiters < 1.5 || dietType.includes("High");

    if (
      hasChestPainOrSevereBreathing ||
      totalSymptoms >= 4 ||
      bmiCategory === "Obesity" ||
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

    const compiledSymptoms = [...selectedSymptoms];
    if (customSymptoms.trim()) {
      compiledSymptoms.push(customSymptoms.trim());
    }

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
        harmful_substances: selectedSubstances,
        custom_habits: customHabits.trim() || undefined,
        alcohol,
        family_history: selectedFamilyConditions,
        custom_family_history: customFamilyHistory.trim() || undefined,
        custom_symptoms: customSymptoms.trim() || undefined,
        sleep_hours: sleepHours,
        water_liters: waterLiters,
      },
      risk_level: "Low",
      ai_summary: "",
      recommendations: [],
      disclaimer: "This is not a medical diagnosis. It is general wellness guidance.",
    };

    try {
      const result = await analyzeHealthAssessment(draftRecord, localDemo);
      setAnalysisResult(result);
    } catch {
      setAnalysisResult(generateDemoHealthAnalysis(draftRecord));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderRiskIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case "scale":
        return <Scale className="w-4 h-4 text-primary" />;
      case "flame":
        return <Flame className="w-4 h-4 text-rose-500" />;
      case "heart":
        return <Heart className="w-4 h-4 text-rose-500" />;
      case "shieldalert":
        return <ShieldAlert className="w-4 h-4 text-amber-500" />;
      case "moon":
        return <Moon className="w-4 h-4 text-indigo-500" />;
      case "alerttriangle":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setIsSubmitting(true);

    const fallbackAnalysis = calculateAnalysis();
    const finalRiskLevel = analysisResult?.overall_risk_level || fallbackAnalysis.riskLevel;
    const finalSummary = analysisResult?.summary || fallbackAnalysis.summary;
    const finalRecommendations = analysisResult?.recommendations || fallbackAnalysis.recommendations;

    // Compile complete symptoms array
    const compiledSymptoms = [...selectedSymptoms];
    if (customSymptoms.trim()) {
      compiledSymptoms.push(customSymptoms.trim());
    }

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
            harmful_substances: selectedSubstances,
            custom_habits: customHabits.trim() || undefined,
            alcohol,
            family_history: selectedFamilyConditions,
            custom_family_history: customFamilyHistory.trim() || undefined,
            custom_symptoms: customSymptoms.trim() || undefined,
            sleep_hours: sleepHours,
            water_liters: waterLiters,
            dynamic_risks: analysisResult?.risks,
          },
          risk_level: finalRiskLevel,
          ai_summary: finalSummary,
          recommendations: finalRecommendations,
          disclaimer: analysisResult?.disclaimer || "This is not a medical diagnosis. It is general wellness guidance.",
        },
        localDemo
      );

      toast({
        title: "Health Risk Assessment Saved",
        description: "Your personalized dynamic risk assessment has been successfully logged.",
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
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Top Header */}
      <header className="p-4 sm:p-5 bg-card border-b border-border/60 sticky top-0 z-20 backdrop-blur-xs">
        <div className="container mx-auto max-w-4xl flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground text-sm sm:text-base">
              Health Risk Assessment
            </span>
          </div>

          {/* Demo Mode Toggle */}
          <div className="flex items-center gap-2">
            <Label htmlFor="demo-toggle" className="text-2xs sm:text-xs text-muted-foreground hidden sm:inline">
              Demo Mode
            </Label>
            <Switch
              id="demo-toggle"
              checked={localDemo}
              onCheckedChange={setLocalDemo}
              aria-label="Toggle demo mode"
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 container mx-auto max-w-2xl px-4 py-6 sm:py-8">
        {/* Progress Stepper */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          {[
            { num: 1, label: "Body Basics" },
            { num: 2, label: "Symptoms & Lifestyle" },
            { num: 3, label: "Verification" },
          ].map((s) => (
            <div key={s.num} className="flex-1 flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    step === s.num
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : step > s.num
                      ? "bg-primary/20 text-primary font-semibold"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <span
                  className={`text-xs hidden md:inline font-medium ${
                    step === s.num ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {s.num < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-3 rounded transition-colors ${
                    step > s.num ? "bg-primary/50" : "bg-border/60"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* STEP 1: BODY BASICS */}
        {step === 1 && (
          <Card className="border-border/70 shadow-2xs rounded-2xl bg-card">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg sm:text-xl font-bold">Step 1: Body Basics</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Enter your age, biological sex, height, and weight to evaluate your Body Mass Index (BMI).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Age & Gender Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="age" className="text-xs font-medium">Age (Years)</Label>
                  <Input
                    id="age"
                    type="number"
                    min="1"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(Math.max(1, Number(e.target.value)))}
                    className="h-10 text-sm rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Gender</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {GENDER_OPTIONS.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setGender(g.value)}
                        className={`h-10 px-2 rounded-xl text-xs font-medium border transition-colors ${
                          gender === g.value
                            ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                            : "bg-card text-muted-foreground border-border hover:bg-muted/40"
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Height: Feet & Inches */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Height (Feet & Inches)</Label>
                  <span className="text-2xs text-muted-foreground">
                    ≈ {heightCm} cm
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="height-feet" className="text-2xs text-muted-foreground">Feet</Label>
                    <select
                      id="height-feet"
                      value={heightFeet}
                      onChange={(e) => setHeightFeet(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm"
                    >
                      {[3, 4, 5, 6, 7].map((ft) => (
                        <option key={ft} value={ft}>
                          {ft} ft
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="height-inches" className="text-2xs text-muted-foreground">Inches</Label>
                    <select
                      id="height-inches"
                      value={heightInches}
                      onChange={(e) => setHeightInches(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm"
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="weight-input" className="text-xs font-medium">
                    Weight ({weightUnit})
                  </Label>
                  <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
                    <button
                      type="button"
                      onClick={() => handleWeightUnitChange("kg")}
                      className={`px-2.5 py-0.5 rounded-md text-2xs font-semibold transition-colors ${
                        weightUnit === "kg"
                          ? "bg-card text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWeightUnitChange("lbs")}
                      className={`px-2.5 py-0.5 rounded-md text-2xs font-semibold transition-colors ${
                        weightUnit === "lbs"
                          ? "bg-card text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      lbs
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Input
                    id="weight-input"
                    type="number"
                    min="20"
                    max="650"
                    step="0.5"
                    value={inputWeight}
                    onChange={(e) => setInputWeight(Math.max(1, Number(e.target.value)))}
                    className="h-10 text-sm rounded-xl flex-1"
                  />
                  <div className="text-xs text-muted-foreground shrink-0 w-28 text-right">
                    {weightUnit === "lbs" ? `≈ ${weightKg} kg` : `≈ ${kgToLbs(weightKg)} lbs`}
                  </div>
                </div>
              </div>

              {/* Live Real-Time BMI Card */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Calculated Body Mass Index
                    </span>
                  </div>
                  <Badge variant="outline" className={`text-xs font-semibold ${getBmiBadgeColor(bmiCategory)}`}>
                    {bmiCategory}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-foreground">{bmi}</span>
                  <span className="text-xs text-muted-foreground">kg/m²</span>
                </div>

                {/* Visual BMI Gauge Spectrum */}
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-gradient-to-r from-amber-300 via-emerald-400 via-amber-400 to-rose-500 opacity-80" />
                  <div className="flex justify-between text-3xs text-muted-foreground font-mono">
                    <span>Underweight (&lt;18.5)</span>
                    <span>Normal (18.5-24.9)</span>
                    <span>Overweight (25-29.9)</span>
                    <span>Obesity (≥30)</span>
                  </div>
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="flex justify-end pt-2">
                <Button onClick={() => setStep(2)} className="gap-2 rounded-xl text-xs sm:text-sm">
                  <span>Continue to Symptoms & Lifestyle</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: SYMPTOMS & LIFESTYLE (Matching Reference Image 4) */}
        {step === 2 && (
          <Card className="border-border/70 shadow-2xs rounded-2xl bg-card">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg sm:text-xl font-bold">
                  Step 2: Symptoms & Daily Habits
                </CardTitle>
                <button
                  type="button"
                  onClick={handleClearSymptoms}
                  className="text-2xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Clear all
                </button>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Select your symptoms, lifestyle factors, and substance habits for an accurate risk assessment.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 1. Multi-Select Symptoms Cards */}
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  <span>Current Symptoms (Select all that apply)</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ASSESSMENT_SYMPTOMS.map((symptom) => {
                    const isSelected = selectedSymptoms.includes(symptom);
                    return (
                      <button
                        key={symptom}
                        type="button"
                        onClick={() => toggleSymptom(symptom)}
                        className={`p-2.5 rounded-xl text-left text-xs font-medium border transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-primary/10 text-primary border-primary/40 shadow-2xs font-semibold"
                            : "bg-card text-muted-foreground border-border hover:bg-muted/40 hover:text-foreground"
                        }`}
                      >
                        <span className="truncate pr-2">{symptom}</span>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/40 bg-card"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Optional Custom Symptoms */}
                <div className="pt-1">
                  <Input
                    placeholder="Other symptoms or details (optional)..."
                    value={customSymptoms}
                    onChange={(e) => setCustomSymptoms(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* 2. Physical Activity Level */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Physical Activity Level</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ACTIVITY_LEVELS.map((act) => (
                    <button
                      key={act.value}
                      type="button"
                      onClick={() => setActivityLevel(act.value)}
                      className={`p-2.5 rounded-xl text-left text-xs border transition-colors ${
                        activityLevel === act.value
                          ? "bg-primary/10 border-primary text-primary font-semibold shadow-2xs"
                          : "bg-card text-muted-foreground border-border hover:bg-muted/40"
                      }`}
                    >
                      <p className="font-medium text-foreground">{act.label}</p>
                      <p className="text-2xs text-muted-foreground">{act.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Diet Type */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Dietary Pattern</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {DIET_TYPES.map((diet) => (
                    <button
                      key={diet}
                      type="button"
                      onClick={() => setDietType(diet)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-medium border text-center transition-colors truncate ${
                        dietType === diet
                          ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                          : "bg-card text-muted-foreground border-border hover:bg-muted/40"
                      }`}
                    >
                      {diet}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Smoking & Harmful Substances */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-muted/20 border border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>Cigarette Smoking</span>
                    </Label>
                    <p className="text-2xs text-muted-foreground">Do you actively smoke cigarettes?</p>
                  </div>
                  <div className="inline-flex rounded-lg border border-border p-0.5 bg-card">
                    <button
                      type="button"
                      onClick={() => setSmoking(false)}
                      className={`px-3 py-1 rounded-md text-2xs font-semibold transition-colors ${
                        !smoking ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmoking(true)}
                      className={`px-3 py-1 rounded-md text-2xs font-semibold transition-colors ${
                        smoking ? "bg-rose-500 text-white" : "text-muted-foreground"
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                {/* Other Harmful Substances / Habits */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <Label className="text-xs font-medium text-foreground">
                    Other Substances & Habits (Select all that apply)
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {HARMFUL_SUBSTANCES.map((substance) => {
                      const isSelected = selectedSubstances.includes(substance);
                      return (
                        <button
                          key={substance}
                          type="button"
                          onClick={() => toggleSubstance(substance)}
                          className={`px-2.5 py-1 rounded-lg text-2xs font-medium border transition-colors ${
                            isSelected
                              ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40 font-semibold"
                              : "bg-card text-muted-foreground border-border hover:bg-muted/40"
                          }`}
                        >
                          {substance}
                        </button>
                      );
                    })}
                  </div>
                  <Input
                    placeholder="Other substance habits (optional)..."
                    value={customHabits}
                    onChange={(e) => setCustomHabits(e.target.value)}
                    className="h-8 text-2xs rounded-xl"
                  />
                </div>

                {/* Regular Alcohol Consumption */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div>
                    <Label className="text-xs font-semibold">Regular Alcohol Consumption</Label>
                    <p className="text-2xs text-muted-foreground">Regular or weekly alcoholic drinks</p>
                  </div>
                  <div className="inline-flex rounded-lg border border-border p-0.5 bg-card">
                    <button
                      type="button"
                      onClick={() => setAlcohol(false)}
                      className={`px-3 py-1 rounded-md text-2xs font-semibold transition-colors ${
                        !alcohol ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlcohol(true)}
                      className={`px-3 py-1 rounded-md text-2xs font-semibold transition-colors ${
                        alcohol ? "bg-amber-500 text-white" : "text-muted-foreground"
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Family Medical History */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Family History of Chronic Conditions</Label>
                <div className="flex flex-wrap gap-1.5">
                  {FAMILY_CONDITIONS.map((cond) => {
                    const isSelected = selectedFamilyConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => toggleFamilyCondition(cond)}
                        className={`px-2.5 py-1 rounded-lg text-2xs font-medium border transition-colors ${
                          isSelected
                            ? "bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/40 font-semibold"
                            : "bg-card text-muted-foreground border-border hover:bg-muted/40"
                        }`}
                      >
                        {cond}
                      </button>
                    );
                  })}
                </div>
                <Input
                  placeholder="Other family conditions (optional)..."
                  value={customFamilyHistory}
                  onChange={(e) => setCustomFamilyHistory(e.target.value)}
                  className="h-8 text-2xs rounded-xl"
                />
              </div>

              {/* 6. Sleep & Hydration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="sleep-hours" className="text-xs font-medium">Daily Sleep (Hours)</Label>
                    <span className="text-xs font-semibold text-primary">{sleepHours} hrs</span>
                  </div>
                  <Input
                    id="sleep-hours"
                    type="number"
                    min="3"
                    max="14"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(Number(e.target.value))}
                    className="h-10 text-sm rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="water-liters" className="text-xs font-medium">Water Intake (Liters/Day)</Label>
                    <span className="text-xs font-semibold text-primary">{waterLiters} L</span>
                  </div>
                  <Input
                    id="water-liters"
                    type="number"
                    min="0.5"
                    max="6.0"
                    step="0.5"
                    value={waterLiters}
                    onChange={(e) => setWaterLiters(Number(e.target.value))}
                    className="h-10 text-sm rounded-xl"
                  />
                </div>
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2 rounded-xl text-xs sm:text-sm">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Body Basics</span>
                </Button>
                <Button
                  onClick={handleProceedToStep3}
                  disabled={isAnalyzing}
                  className="gap-2 rounded-xl text-xs sm:text-sm"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span>Review Assessment</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: DYNAMIC RISK ASSESSMENT & SAVE */}
        {step === 3 && (
          <Card className="border-border/70 shadow-2xs rounded-2xl bg-card">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center gap-1.5 text-primary font-semibold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>AI Risk Assessment</span>
              </div>
              <CardTitle className="text-lg sm:text-xl font-bold">Step 3: Verification & Save</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Review your dynamic health risks and personalized guidance before saving to your profile history.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {isAnalyzing ? (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse">
                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h3 className="font-bold text-base text-foreground">Analyzing Your Health Metrics...</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Evaluating metabolic biometrics, reported symptoms, regional substances, and lifestyle factors with our AI health engine.
                    </p>
                  </div>
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
                    `${selectedSymptoms.join(" ")} ${customSymptoms} ${customHabits}`
                  );
                  const isAcuteAlert = emergencyCheck.isEmergency || hasChestPainOrSevereBreathing;

                  return (
                    <div className="space-y-5">
                      {/* Acute Emergency Banner */}
                      {isAcuteAlert && (
                        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-300">
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-bold text-sm">Immediate Medical Attention Recommended</p>
                            <p className="text-xs leading-relaxed text-rose-700 dark:text-rose-400">
                              {emergencyCheck.emergencyAdvice || EMERGENCY_DISCLAIMER_MESSAGE}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 1. BMI Hero Card */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Scale className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Body Mass Index (BMI)
                              </h4>
                              <p className="text-2xs text-muted-foreground">
                                {heightFeet}&apos;{heightInches}&quot; ({heightCm} cm) • {inputWeight} {weightUnit} ({weightUnit === "lbs" ? `≈ ${weightKg} kg` : `≈ ${kgToLbs(weightKg)} lbs`})
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-xs font-semibold ${getBmiBadgeColor(bmiCategory)}`}>
                            {bmiCategory}
                          </Badge>
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">{bmi}</span>
                          <span className="text-xs text-muted-foreground">kg/m²</span>
                        </div>

                        {/* Visual Spectrum Bar */}
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-4 gap-1 h-2 rounded-full overflow-hidden bg-muted/60">
                            <div className={`h-full ${bmi < 18.5 ? "bg-amber-500" : "bg-muted-foreground/20"}`} title="Underweight (< 18.5)" />
                            <div className={`h-full ${bmi >= 18.5 && bmi < 25 ? "bg-emerald-500" : "bg-muted-foreground/20"}`} title="Normal (18.5 - 24.9)" />
                            <div className={`h-full ${bmi >= 25 && bmi < 30 ? "bg-amber-500" : "bg-muted-foreground/20"}`} title="Overweight (25 - 29.9)" />
                            <div className={`h-full ${bmi >= 30 ? "bg-rose-500" : "bg-muted-foreground/20"}`} title="Obesity (>= 30)" />
                          </div>
                          <div className="flex justify-between text-3xs text-muted-foreground font-medium px-0.5">
                            <span>&lt; 18.5</span>
                            <span>18.5 – 24.9</span>
                            <span>25.0 – 29.9</span>
                            <span>&ge; 30.0</span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Personalized Assessment Narrative */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-teal-500/5 dark:bg-teal-950/20 border border-teal-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                              Personalized Health Assessment
                            </h4>
                          </div>
                          <Badge
                            className={`text-xs font-semibold ${
                              currentAnalysis.overall_risk_level === "Low"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                : currentAnalysis.overall_risk_level === "Medium"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                            }`}
                          >
                            {currentAnalysis.overall_risk_level} Risk
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                          {currentAnalysis.summary}
                        </p>
                      </div>

                      {/* 3. Dynamic Health Risk Indicators (Image 5 style) */}
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-bold text-foreground">Identified Health Risk Indicators</h4>
                          <p className="text-xs text-muted-foreground">
                            Conditions evaluated based on your biometrics, reported symptoms, and lifestyle markers
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {currentAnalysis.risks.map((riskItem, idx) => (
                            <div
                              key={idx}
                              className={`p-3.5 rounded-xl border transition-all ${
                                riskItem.risk_level === "High"
                                  ? "bg-rose-500/5 border-rose-500/30"
                                  : riskItem.risk_level === "Medium"
                                  ? "bg-amber-500/5 border-amber-500/30"
                                  : "bg-emerald-500/5 border-emerald-500/30"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-card border border-border">
                                    {renderRiskIcon(riskItem.icon_name)}
                                  </div>
                                  <span className="text-xs font-semibold text-foreground leading-snug">
                                    {riskItem.condition}
                                  </span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`text-3xs font-semibold shrink-0 ${
                                    riskItem.risk_level === "High"
                                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40"
                                      : riskItem.risk_level === "Medium"
                                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40"
                                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
                                  }`}
                                >
                                  {riskItem.risk_level} Risk
                                </Badge>
                              </div>
                              <p className="text-2xs text-muted-foreground leading-relaxed">
                                {riskItem.rationale}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 4. Actionable Recommendations */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Actionable Wellness Steps
                        </h4>
                        <div className="space-y-2.5">
                          {currentAnalysis.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-xs text-foreground/90">
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <span className="leading-relaxed">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 5. Medical Disclaimer Banner */}
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-2xs text-amber-900 dark:text-amber-300">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                          <strong>Medical Disclaimer:</strong> This is not a medical diagnosis. It is general wellness guidance based on self-reported biometrics. Please consult a qualified healthcare professional.
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Step 3 Actions */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  disabled={isSubmitting || isAnalyzing}
                  className="gap-2 rounded-xl text-xs sm:text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Edit Inputs</span>
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={isSubmitting || isAnalyzing}
                  className="gap-2 rounded-xl text-xs sm:text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Save Assessment</span>
                      <CheckCircle2 className="w-4 h-4" />
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
