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

  const renderRiskBadge = (risk: RiskLevel) => {
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
    }
  };

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
            {renderRiskBadge(summary.risk_level)}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Synthesized from your interactive AI consultation. Review your notes and recommendations before saving to your personal dashboard.
          </DialogDescription>
        </DialogHeader>

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
                <span>{summary.duration}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Estimated Intensity: </span>
                <span>{summary.intensity}</span>
              </div>
            </div>
          </div>

          {/* Lifestyle Recommendations */}
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

          {/* Questions to ask doctor */}
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

          {/* Medical Disclaimer */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Mandatory Disclaimer:</strong> {summary.disclaimer}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t">
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

          {isAlreadySaved || justSaved ? (
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
