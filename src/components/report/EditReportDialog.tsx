// EditReportDialog Component
// Allows patient to edit all report sections to make it personalized and doctor-ready.

import React, { useState, useEffect } from "react";
import { ReportData, ReportEditPayload, SymptomTimelineItem } from "@/types/report";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Loader2,
  Edit3,
  Activity,
  Heart,
  Sparkles,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportData;
  onSave: (edits: ReportEditPayload) => Promise<void>;
}

export const EditReportDialog: React.FC<EditReportDialogProps> = ({
  open,
  onOpenChange,
  report,
  onSave,
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [primaryConcern, setPrimaryConcern] = useState("");
  const [timeline, setTimeline] = useState<SymptomTimelineItem[]>([]);
  const [sleepHours, setSleepHours] = useState("");
  const [hydrationLiters, setHydrationLiters] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [riskReason, setRiskReason] = useState("");
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [doctorQuestions, setDoctorQuestions] = useState<string[]>([]);

  // Temporary new item inputs
  const [newSymptom, setNewSymptom] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newIntensity, setNewIntensity] = useState("");
  const [newRec, setNewRec] = useState("");
  const [newQuestion, setNewQuestion] = useState("");

  // Sync initial state when modal opens
  useEffect(() => {
    if (open && report) {
      setPrimaryConcern(report.symptoms.primaryConcern || "");
      setTimeline(
        report.symptoms.timeline && report.symptoms.timeline.length > 0
          ? [...report.symptoms.timeline]
          : [{ symptom: "General wellness check", duration: "Recent", intensity: "Mild", order: 1 }]
      );
      setSleepHours(report.lifestyle.sleepHours || "7 hrs/night");
      setHydrationLiters(report.lifestyle.hydrationLiters || "2.0 L/day");
      setActivityLevel(report.lifestyle.activityLevel || "Moderate");
      setRiskReason(report.risk.reason || "");
      setRecommendations(
        report.recommendations.items && report.recommendations.items.length > 0
          ? [...report.recommendations.items]
          : ["Maintain regular physical movement."]
      );
      setDoctorQuestions(
        report.doctorQuestions.questions && report.doctorQuestions.questions.length >= 2
          ? [...report.doctorQuestions.questions]
          : [
              "Are there any age-appropriate preventive screenings recommended?",
              "What lifestyle adjustments should I prioritize next?",
            ]
      );
    }
  }, [open, report]);

  // Symptom timeline handlers
  const handleAddSymptom = () => {
    if (!newSymptom.trim()) return;
    const newItem: SymptomTimelineItem = {
      symptom: newSymptom.trim(),
      duration: newDuration.trim() || "Noted by patient",
      intensity: newIntensity.trim() || "Self-reported",
      order: timeline.length + 1,
    };
    setTimeline([...timeline, newItem]);
    setNewSymptom("");
    setNewDuration("");
    setNewIntensity("");
  };

  const handleRemoveSymptom = (index: number) => {
    if (timeline.length <= 1) {
      toast({
        title: "At least one symptom required",
        description: "Your report must have at least one reported symptom or general check note.",
        variant: "destructive",
      });
      return;
    }
    const updated = timeline
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, order: idx + 1 }));
    setTimeline(updated);
  };

  const handleUpdateSymptom = (index: number, field: keyof SymptomTimelineItem, value: string) => {
    const updated = [...timeline];
    updated[index] = { ...updated[index], [field]: value };
    setTimeline(updated);
  };

  // Recommendation handlers
  const handleAddRec = () => {
    if (!newRec.trim()) return;
    setRecommendations([...recommendations, newRec.trim()]);
    setNewRec("");
  };

  const handleRemoveRec = (index: number) => {
    if (recommendations.length <= 1) {
      toast({
        title: "At least one recommendation required",
        description: "A wellness summary must include at least one lifestyle observation.",
        variant: "destructive",
      });
      return;
    }
    setRecommendations(recommendations.filter((_, i) => i !== index));
  };

  const handleUpdateRec = (index: number, value: string) => {
    const updated = [...recommendations];
    updated[index] = value;
    setRecommendations(updated);
  };

  // Doctor question handlers
  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    setDoctorQuestions([...doctorQuestions, newQuestion.trim()]);
    setNewQuestion("");
  };

  const handleRemoveQuestion = (index: number) => {
    if (doctorQuestions.length <= 2) {
      toast({
        title: "At least two doctor questions required",
        description: "The clinical discussion section requires at least 2 questions.",
        variant: "destructive",
      });
      return;
    }
    setDoctorQuestions(doctorQuestions.filter((_, i) => i !== index));
  };

  const handleUpdateQuestion = (index: number, value: string) => {
    const updated = [...doctorQuestions];
    updated[index] = value;
    setDoctorQuestions(updated);
  };

  // Save handler
  const handleSave = async () => {
    if (timeline.length === 0) {
      toast({
        title: "Validation error",
        description: "Please include at least one symptom or health note.",
        variant: "destructive",
      });
      return;
    }
    if (recommendations.length === 0) {
      toast({
        title: "Validation error",
        description: "Please include at least one recommendation.",
        variant: "destructive",
      });
      return;
    }
    if (doctorQuestions.length < 2) {
      toast({
        title: "Validation error",
        description: "Please include at least two doctor discussion questions.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const edits: ReportEditPayload = {
        primaryConcern: primaryConcern.trim() || timeline[0]?.symptom || "General health consultation",
        timeline,
        sleepHours: sleepHours.trim(),
        hydrationLiters: hydrationLiters.trim(),
        activityLevel: activityLevel.trim(),
        riskReason: riskReason.trim(),
        recommendations: recommendations.map((r) => r.trim()).filter(Boolean),
        doctorQuestions: doctorQuestions.map((q) => q.trim()).filter(Boolean),
      };

      await onSave(edits);
      toast({
        title: "Report Edits Saved",
        description: "Your personalized modifications have been saved to your report and doctor exports.",
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save edits.";
      toast({
        title: "Error saving edits",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 rounded-2xl overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">Edit Health Report</DialogTitle>
              <DialogDescription className="text-xs">
                Refine symptoms, vitals, and discussion points to ensure a doctor-ready clinical handover.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Tabs defaultValue="symptoms" className="w-full">
            <TabsList className="grid grid-cols-4 w-full h-9 mb-4">
              <TabsTrigger value="symptoms" className="text-xs gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Symptoms</span>
              </TabsTrigger>
              <TabsTrigger value="lifestyle" className="text-xs gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lifestyle</span>
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs gap-1.5">
                <Heart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Assessment</span>
              </TabsTrigger>
              <TabsTrigger value="questions" className="text-xs gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Doctor Qs</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: SYMPTOMS & TIMELINE */}
            <TabsContent value="symptoms" className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="primary-concern" className="text-xs font-semibold">
                  Primary Health Concern / Chief Complaint
                </Label>
                <Input
                  id="primary-concern"
                  value={primaryConcern}
                  onChange={(e) => setPrimaryConcern(e.target.value)}
                  placeholder="e.g. Lower back stiffness, seasonal migraine"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Symptoms Timeline</Label>
                  <span className="text-2xs text-muted-foreground">{timeline.length} recorded</span>
                </div>

                <div className="space-y-2">
                  {timeline.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-border/70 bg-muted/20 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-2xs font-bold text-primary font-mono">#{idx + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveSymptom(idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input
                          value={item.symptom}
                          onChange={(e) => handleUpdateSymptom(idx, "symptom", e.target.value)}
                          placeholder="Symptom name"
                          className="h-8 text-xs rounded-lg"
                        />
                        <Input
                          value={item.duration}
                          onChange={(e) => handleUpdateSymptom(idx, "duration", e.target.value)}
                          placeholder="Duration (e.g. 3 days)"
                          className="h-8 text-xs rounded-lg"
                        />
                        <Input
                          value={item.intensity}
                          onChange={(e) => handleUpdateSymptom(idx, "intensity", e.target.value)}
                          placeholder="Intensity (e.g. Moderate)"
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add new symptom line */}
                <div className="p-3 rounded-xl border border-dashed border-border bg-card space-y-2">
                  <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Add Symptom
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      value={newSymptom}
                      onChange={(e) => setNewSymptom(e.target.value)}
                      placeholder="New symptom"
                      className="h-8 text-xs rounded-lg"
                    />
                    <Input
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                      placeholder="Duration"
                      className="h-8 text-xs rounded-lg"
                    />
                    <Input
                      value={newIntensity}
                      onChange={(e) => setNewIntensity(e.target.value)}
                      placeholder="Intensity"
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSymptom}
                    disabled={!newSymptom.trim()}
                    className="w-full h-8 text-xs rounded-lg gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Timeline</span>
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: LIFESTYLE & HABITS */}
            <TabsContent value="lifestyle" className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-sleep" className="text-xs font-semibold">
                    Sleep Duration / Night
                  </Label>
                  <Input
                    id="edit-sleep"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value)}
                    placeholder="e.g. 7.5 hrs/night"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-hydration" className="text-xs font-semibold">
                    Daily Hydration
                  </Label>
                  <Input
                    id="edit-hydration"
                    value={hydrationLiters}
                    onChange={(e) => setHydrationLiters(e.target.value)}
                    placeholder="e.g. 2.0 L/day"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-activity" className="text-xs font-semibold">
                  Physical Activity Profile
                </Label>
                <Input
                  id="edit-activity"
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                  placeholder="e.g. Moderately Active, 3 workouts/week"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </TabsContent>

            {/* TAB 3: ASSESSMENT NOTES */}
            <TabsContent value="notes" className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="edit-risk-reason" className="text-xs font-semibold">
                  Personalized Clinical Summary & Notes
                </Label>
                <Textarea
                  id="edit-risk-reason"
                  rows={5}
                  value={riskReason}
                  onChange={(e) => setRiskReason(e.target.value)}
                  placeholder="Enter summary notes or clarifications for your physician..."
                  className="text-xs rounded-xl leading-relaxed resize-y"
                />
                <p className="text-2xs text-muted-foreground">
                  Provide context regarding when symptoms occur, potential workplace stressors, or relevant family history.
                </p>
              </div>
            </TabsContent>

            {/* TAB 4: RECOMMENDATIONS & DOCTOR QUESTIONS */}
            <TabsContent value="questions" className="space-y-5 pt-1">
              {/* Recommendations */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Lifestyle Observations & Actions</Label>
                <div className="space-y-1.5">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={rec}
                        onChange={(e) => handleUpdateRec(idx, e.target.value)}
                        className="h-8 text-xs rounded-lg flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleRemoveRec(idx)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <Input
                    value={newRec}
                    onChange={(e) => setNewRec(e.target.value)}
                    placeholder="New lifestyle observation..."
                    className="h-8 text-xs rounded-lg flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddRec}
                    disabled={!newRec.trim()}
                    className="h-8 text-xs rounded-lg gap-1 shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>

              {/* Doctor Discussion Questions */}
              <div className="space-y-2 pt-2 border-t border-border/70">
                <Label className="text-xs font-semibold">Questions for Your Doctor</Label>
                <div className="space-y-1.5">
                  {doctorQuestions.map((q, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-2xs font-bold text-primary font-mono w-4 shrink-0">
                        {idx + 1}.
                      </span>
                      <Input
                        value={q}
                        onChange={(e) => handleUpdateQuestion(idx, e.target.value)}
                        className="h-8 text-xs rounded-lg flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleRemoveQuestion(idx)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <Input
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="New question for doctor..."
                    className="h-8 text-xs rounded-lg flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddQuestion}
                    disabled={!newQuestion.trim()}
                    className="h-8 text-xs rounded-lg gap-1 shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="p-4 bg-muted/20 border-t border-border/70 flex sm:justify-between items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="text-xs rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs rounded-xl gap-1.5 shadow-2xs"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Edits...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save Report Changes</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default EditReportDialog;
