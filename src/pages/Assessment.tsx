import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { calculateBMI, saveAssessment } from "@/services/healthService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Heart, Sparkles, CheckCircle2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const COMMON_SYMPTOMS = [
  "Occasional fatigue",
  "Poor sleep quality",
  "Mild shortness of breath",
  "Frequent headaches",
  "Joint stiffness",
  "Digestive discomfort",
  "High stress / anxiety",
  "None",
];

const Assessment: React.FC = () => {
  const { user, isDemo } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [heightCm, setHeightCm] = useState<number>(170);
  const [weightKg, setWeightKg] = useState<number>(68);

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [activityLevel, setActivityLevel] = useState<string>("Moderate");
  const [waterLiters, setWaterLiters] = useState<number>(2);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live BMI calculation
  const { bmi, category: bmiCategory } = calculateBMI(heightCm, weightKg);

  const toggleSymptom = (symptom: string) => {
    if (symptom === "None") {
      setSelectedSymptoms(["None"]);
      return;
    }
    const filtered = selectedSymptoms.filter((s) => s !== "None");
    if (filtered.includes(symptom)) {
      setSelectedSymptoms(filtered.filter((s) => s !== symptom));
    } else {
      setSelectedSymptoms([...filtered, symptom]);
    }
  };

  // Determine categorical risk level and AI recommendations safely
  const calculateAnalysis = () => {
    let riskLevel: "Low" | "Medium" | "High" = "Low";
    const symptomCount = selectedSymptoms.filter((s) => s !== "None").length;

    if (symptomCount >= 3 || bmiCategory === "Obesity") {
      riskLevel = "High";
    } else if (symptomCount >= 1 || bmiCategory === "Overweight" || bmiCategory === "Underweight") {
      riskLevel = "Medium";
    }

    const recommendations: string[] = [];
    if (bmiCategory === "Overweight" || bmiCategory === "Obesity") {
      recommendations.push("Adopt a whole-food diet low in refined sugars and consult a medical professional.");
    } else if (bmiCategory === "Underweight") {
      recommendations.push("Increase caloric intake with nutrient-rich proteins and healthy fats.");
    } else {
      recommendations.push("Maintain a nutritious, varied diet to sustain healthy metabolic function.");
    }

    if (sleepHours < 7) {
      recommendations.push("Prioritize a consistent bedtime routine to achieve 7-9 hours of restorative sleep.");
    }
    if (waterLiters < 2) {
      recommendations.push("Increase daily fluid intake to at least 2 liters of clean water.");
    }
    recommendations.push("Engage in regular physical exercise tailored to your comfort and endurance.");

    const summary = `Your BMI is ${bmi} (${bmiCategory}). With ${symptomCount} reported symptom(s) and a ${activityLevel.toLowerCase()} activity habit, your overall wellness risk indicator is categorized as ${riskLevel}.`;

    return { riskLevel, summary, recommendations };
  };

  const handleFinish = async () => {
    if (!user) return;
    setIsSubmitting(true);

    const analysis = calculateAnalysis();

    try {
      await saveAssessment(
        {
          user_id: user.id,
          height_cm: heightCm,
          weight_kg: weightKg,
          bmi,
          bmi_category: bmiCategory,
          symptoms: selectedSymptoms,
          lifestyle_data: {
            sleep_hours: sleepHours,
            activity_level: activityLevel,
            water_liters: waterLiters,
          },
          risk_level: analysis.riskLevel,
          ai_summary: analysis.summary,
          recommendations: analysis.recommendations,
          disclaimer: "This is not a medical diagnosis.",
        },
        isDemo
      );

      toast({
        title: "Assessment Complete",
        description: "Your health records have been safely recorded.",
      });
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to persist assessment data.";
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
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Top Header */}
      <header className="p-4 sm:p-6 bg-card border-b border-border/50">
        <div className="container mx-auto max-w-4xl flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground text-sm">Health Check</span>
          </div>
        </div>
      </header>

      {/* Main Step Container */}
      <main className="flex-1 container mx-auto max-w-2xl px-4 py-8">
        {/* Progress indicators */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                  step === s
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : step > s
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-1 mx-2 rounded ${step > s ? "bg-primary/40" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1: BIOMETRICS & BMI */}
        {step === 1 && (
          <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-xl">Step 1: Biometrics & BMI</CardTitle>
              <CardDescription>Enter your height and weight to calculate your Body Mass Index.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  min="50"
                  max="250"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  min="20"
                  max="300"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                />
              </div>

              {/* Live calculated BMI card */}
              <div className="p-4 rounded-2xl bg-secondary/50 border border-secondary flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-medium">Calculated BMI</div>
                  <div className="text-3xl font-bold text-foreground">{bmi}</div>
                </div>
                <Badge variant="secondary" className="text-sm font-semibold bg-background">
                  {bmiCategory}
                </Badge>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)} className="gap-2">
                  Continue to Symptoms
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: SYMPTOMS & LIFESTYLE */}
        {step === 2 && (
          <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-xl">Step 2: Symptoms & Daily Habits</CardTitle>
              <CardDescription>Select any recent observations or wellness concerns.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Current Symptoms or Sensations</Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SYMPTOMS.map((item) => {
                    const isSelected = selectedSymptoms.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleSymptom(item)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="sleep">Sleep (Hours/Night)</Label>
                  <Input
                    id="sleep"
                    type="number"
                    min="3"
                    max="14"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity">Physical Activity</Label>
                  <select
                    id="activity"
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="Sedentary">Sedentary</option>
                    <option value="Light">Light</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Active">Active</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="water">Water (Liters/Day)</Label>
                  <Input
                    id="water"
                    type="number"
                    min="0.5"
                    max="6"
                    step="0.5"
                    value={waterLiters}
                    onChange={(e) => setWaterLiters(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="gap-2">
                  Review AI Analysis
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: REVIEW & CONFIRM */}
        {step === 3 && (
          <Card className="shadow-card border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary font-medium text-sm">
                <Sparkles className="w-4 h-4" />
                <span>AI Insights Generated</span>
              </div>
              <CardTitle className="text-xl">Step 3: Verification & Save</CardTitle>
              <CardDescription>Review your assessment summary before saving to your profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const analysis = calculateAnalysis();
                return (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Categorical Risk Indicator:</span>
                        <Badge
                          className={
                            analysis.riskLevel === "Low"
                              ? "bg-emerald-100 text-emerald-800"
                              : analysis.riskLevel === "Medium"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }
                        >
                          {analysis.riskLevel} Risk
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground/90">{analysis.summary}</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">Personalized Recommendations:</h4>
                      <ul className="space-y-1.5">
                        {analysis.recommendations.map((rec, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-primary font-bold">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Disclaimer:</strong> This is not a medical diagnosis. If you are experiencing severe symptoms, please consult a certified healthcare professional immediately.
                </span>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)} disabled={isSubmitting} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Edit Inputs
                </Button>
                <Button onClick={handleFinish} disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? "Saving..." : "Save Assessment"}
                  <CheckCircle2 className="w-4 h-4" />
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
