import React, { useState } from "react";
import { HealthAssessmentSummary, RiskLevel } from "@/types/chat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  LayoutDashboard,
  HelpCircle,
  Sparkles,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HealthSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: HealthAssessmentSummary | null;
  isLoading: boolean;
  onSave: () => Promise<void>;
  isAlreadySaved?: boolean;
}

export const HealthSummaryDialog: React.FC<HealthSummaryDialogProps> = ({
  open,
  onOpenChange,
  summary,
  isLoading,
  onSave,
  isAlreadySaved = false,
}) => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  if (!summary) return null;

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
      setJustSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  const renderRiskBadge = (risk: RiskLevel | null | undefined) => {
    switch (risk) {
      case "Low":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 gap-1.5 px-2.5 py-0.5 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Low Risk Indicator</span>
          </Badge>
        );
      case "Medium":
        return (
          <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 gap-1.5 px-2.5 py-0.5 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Medium Risk Indicator</span>
          </Badge>
        );
      case "High":
        return (
          <Badge className="bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30 gap-1.5 px-2.5 py-0.5 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>High Risk Indicator</span>
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="text-muted-foreground border-border/80 gap-1.5 px-2.5 py-0.5 text-xs font-medium"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Not assessed</span>
          </Badge>
        );
    }
  };

  const hasSufficient =
    summary.has_sufficient_info !== false && summary.symptoms && summary.symptoms.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl no-scrollbar">
        <DialogHeader className="space-y-2 border-b pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-bold">Health Assessment Summary</DialogTitle>
            </div>
            {renderRiskBadge(hasSufficient ? summary.risk_level : null)}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Synthesized from your interactive AI consultation. Review your notes and recommendations before saving to your personal dashboard.
          </DialogDescription>
        </DialogHeader>

        {!hasSufficient ? (
          /* Insufficient Symptoms State */
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h4 className="font-semibold text-sm text-foreground">Tell the AI more about your symptoms to generate a summary</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {summary.summary || "No specific symptoms were reported during this consultation. Share details about how you are feeling to receive tailored insights."}
              </p>
            </div>
            <div className="text-xs bg-muted/40 p-4 rounded-xl border border-border/60 max-w-md mx-auto text-left space-y-2 text-muted-foreground">
              <span className="font-medium text-foreground block">Helpful details to share in chat:</span>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Specific physical symptoms (e.g. tension headache, cough, fatigue)</li>
                <li>How long you have felt them (e.g. 2 days, 1 week)</li>
                <li>Intensity level (mild, moderate, or severe)</li>
              </ul>
            </div>
          </div>
        ) : (
          /* Detailed AI Synthesis Content */
          <div className="space-y-5 py-3 text-sm">
            {/* Summary Paragraph */}
            <div className="bg-muted/40 p-4 rounded-xl border border-border/60">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Consultation Synthesis
              </h4>
              <p className="text-foreground leading-relaxed text-xs sm:text-sm">{summary.summary}</p>
            </div>

            {/* Reported Symptoms & Profile */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Reported Symptoms & Timeline
              </h4>
              <div className="flex flex-wrap gap-2 mb-2">
                {summary.symptoms.map((symptom, idx) => (
                  <span
                    key={`${symptom}-${idx}`}
                    className="bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full text-xs font-medium"
                  >
                    {symptom}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2 bg-card p-3 rounded-xl border border-border/60">
                <div>
                  <span className="font-medium text-foreground">Reported Duration: </span>
                  <span>{summary.duration || "Not specified"}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Estimated Intensity: </span>
                  <span>{summary.intensity || "Not specified"}</span>
                </div>
              </div>
            </div>

            {/* Likely Conditions / Possibilities to Discuss */}
            {summary.likely_conditions && summary.likely_conditions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-primary" />
                  <span>Considerations to Discuss With a Doctor</span>
                </h4>
                <ul className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border/50">
                  {summary.likely_conditions.map((item, idx) => (
                    <li key={idx} className="text-xs sm:text-sm text-foreground/90 flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Lifestyle Recommendations */}
            {summary.recommendations && summary.recommendations.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Non-Prescriptive Lifestyle Guidance
                </h4>
                <ul className="space-y-1.5">
                  {summary.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-foreground/90">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Questions to ask doctor */}
            {summary.doctor_questions && summary.doctor_questions.length > 0 && (
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  <span>Questions to Ask Your Doctor</span>
                </h4>
                <ul className="space-y-2">
                  {summary.doctor_questions.map((q, idx) => (
                    <li key={idx} className="text-xs sm:text-sm text-foreground/90 flex items-start gap-2">
                      <span className="font-mono text-xs text-primary font-bold">{idx + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Medical Disclaimer */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Mandatory Disclaimer:</strong> {summary.disclaimer}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t">
          {hasSufficient && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs rounded-xl"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Print Summary</span>
            </Button>
          )}

          {!hasSufficient ? (
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl"
            >
              Continue Consultation
            </Button>
          ) : isAlreadySaved || justSaved ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Saved to Dashboard
              </span>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/dashboard");
                }}
                className="gap-1.5 text-xs rounded-xl shadow-2xs"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Go to Dashboard</span>
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={isSaving || isLoading}
              onClick={handleConfirmSave}
              className="gap-1.5 text-xs rounded-xl shadow-2xs font-medium"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Confirm & Save to Dashboard"}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
