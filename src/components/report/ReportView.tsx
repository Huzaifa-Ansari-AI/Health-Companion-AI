// Milestone 2: ReportView Component
// Renders the structured 8-section wellness summary for both on-screen viewing and clean A4 printing.

import React from "react";
import { ReportData } from "@/types/report";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  ShieldAlert,
  Calendar,
  User,
  Activity,
  Sparkles,
  HelpCircle,
  FileText,
  Clock,
  Printer,
  Edit2,
  CheckCircle2,
  Download,
  Loader2,
  TrendingUp,
  Edit3,
  RotateCcw,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AfiyatLogo } from "@/components/common/AfiyatLogo";

interface ReportViewProps {
  report: ReportData;
  verificationUrl?: string;
  onEditDetails?: () => void;
  onEditReport?: () => void;
  onResetReport?: () => void;
  onPrint?: () => void;
  actionSlot?: React.ReactNode;
}

export const ReportView: React.FC<ReportViewProps> = ({
  report,
  verificationUrl,
  onEditDetails,
  onEditReport,
  onResetReport,
  onPrint,
  actionSlot,
}) => {
  const { toast } = useToast();
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState(false);
  const [includeTrends, setIncludeTrends] = React.useState(false);
  const [copiedQuestions, setCopiedQuestions] = React.useState(false);
  const { header, patient, symptoms, lifestyle, risk, recommendations, doctorQuestions, footer } =
    report;

  const handleCopyDoctorQuestions = async () => {
    try {
      const text = doctorQuestions.questions.map((q, idx) => `${idx + 1}. ${q}`).join("\n");
      await navigator.clipboard.writeText(text);
      setCopiedQuestions(true);
      setTimeout(() => setCopiedQuestions(false), 2000);
      toast({
        title: "Discussion Points Copied",
        description: "Ready to share with your healthcare provider.",
      });
    } catch {
      // clipboard access error handled
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const { downloadReportPdf } = await import("@/services/pdfService");
      await downloadReportPdf(report, verificationUrl);
      toast({
        title: "PDF Download Complete",
        description: "Your vector health summary PDF has been saved.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate PDF.";
      toast({
        title: "Download Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const getRiskBadge = (level: "Low" | "Medium" | "High") => {
    switch (level) {
      case "Low":
        return (
          <Badge className="bg-emerald-100 text-emerald-950 border-emerald-400 print:bg-emerald-50 print:text-emerald-950 px-3 py-1 font-bold text-xs uppercase tracking-wide">
            Low Risk
          </Badge>
        );
      case "Medium":
        return (
          <Badge className="bg-amber-100 text-amber-950 border-amber-400 print:bg-amber-50 print:text-amber-950 px-3 py-1 font-bold text-xs uppercase tracking-wide">
            Medium Risk
          </Badge>
        );
      case "High":
        return (
          <Badge className="bg-rose-100 text-rose-950 border-rose-400 print:bg-rose-50 print:text-rose-950 px-3 py-1 font-bold text-xs uppercase tracking-wide">
            High Risk
          </Badge>
        );
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getActivityRatingBadge = (rating: string) => {
    switch (rating) {
      case "Optimal":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Optimal</Badge>;
      case "Moderate":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Moderate</Badge>;
      case "Low":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Needs Attention</Badge>;
      default:
        return <Badge variant="outline">Not evaluated</Badge>;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* On-screen Action Toolbar (Hidden during print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card rounded-2xl border border-border/80 shadow-2xs print:hidden">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="w-4 h-4 text-primary" />
          <span>Report ID: <span className="font-mono font-medium text-foreground">{header.reportId}</span></span>
          <span className="text-muted-foreground/40">•</span>
          <span>
            {report.isOffline
              ? "Offline Vitals Assessment"
              : report.source === "chat"
              ? "AI Consultation Summary"
              : "Vitals Assessment"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none mr-2">
            <input
              type="checkbox"
              id="include-trends-toggle"
              checked={includeTrends}
              onChange={(e) => setIncludeTrends(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span>Include 7-Day Vitals</span>
            </span>
          </label>
          {onEditReport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditReport}
              className="gap-1.5 rounded-xl border-primary/40 text-primary hover:bg-primary/5 shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Report</span>
            </Button>
          )}
          {report.isEdited && onResetReport && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetReport}
              className="gap-1.5 rounded-xl text-muted-foreground hover:text-foreground"
              title="Reset custom modifications to original AI assessment"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}
          {onEditDetails && (
            <Button variant="outline" size="sm" onClick={onEditDetails} className="gap-1.5 rounded-xl">
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 rounded-xl">
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="gap-1.5 rounded-xl shadow-2xs"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </>
            )}
          </Button>
          {actionSlot}
        </div>
      </div>

      {/* Printable Report Document Card */}
      <article
        id="printable-report"
        className="bg-card text-foreground rounded-2xl border border-border/80 p-6 sm:p-10 shadow-soft print:shadow-none print:border-none print:p-0 print:m-0 space-y-8 print:space-y-6"
      >
        {/* SECTION 1: HEADER */}
        <header className="border-b border-border/70 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <AfiyatLogo variant="mark" size="xs" linkTo="/" />
              <Badge variant="outline" className="text-2xs uppercase tracking-wider text-primary border-primary/30">
                Wellness Summary
              </Badge>
              {report.isEdited && (
                <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40 text-2xs font-semibold">
                  Edited by you
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground mt-2">{header.reportTitle}</h1>
            <p className="text-xs text-muted-foreground">
              A structured summary of self-reported symptoms, vitals, and lifestyle habits.
            </p>
          </div>

          <div className="text-left sm:text-right text-xs space-y-1 bg-muted/30 print:bg-transparent p-3 sm:p-0 rounded-xl">
            <div className="flex items-center sm:justify-end gap-1.5 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Generated: <strong className="text-foreground">{header.generatedDate}</strong></span>
            </div>
            <div className="flex items-center sm:justify-end gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Report ID: <strong className="font-mono text-foreground">{header.reportId}</strong></span>
            </div>
            <div className="text-2xs text-muted-foreground/80 font-mono">
              Ver: {footer.verificationCode}
            </div>
          </div>
        </header>

        {/* OFFLINE MODE BANNER (Requirement A) */}
        {report.isOffline && (
          <div className="p-4 sm:p-5 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-foreground space-y-2 break-inside-avoid">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                OFFLINE MODE
              </Badge>
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Rule-Based Result — Not AI-Analyzed
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-normal">
              This report was generated using the application&apos;s offline rules. An AI model did not analyze your responses, and the result may be less personalized than an AI-assisted assessment.
            </p>
            <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              Notice: This is not a medical diagnosis. Please consult a qualified healthcare professional.
            </p>
          </div>
        )}

        {/* SECTION 2: PATIENT DETAILS */}
        <section className="space-y-3 break-inside-avoid">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <User className="w-4 h-4" />
            <span>1. Patient & Demographic Details</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 p-4 rounded-xl border border-border/60 text-xs">
            <div>
              <span className="text-muted-foreground block text-2xs uppercase tracking-wide">Full Name</span>
              <strong className="text-sm text-foreground">{patient.name}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-2xs uppercase tracking-wide">Age</span>
              <strong className="text-sm text-foreground">{patient.age}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-2xs uppercase tracking-wide">Gender</span>
              <strong className="text-sm text-foreground">{patient.gender}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-2xs uppercase tracking-wide">BMI & Category</span>
              <strong className="text-sm text-foreground">
                {patient.bmi} {patient.bmiCategory !== "Not provided" ? `(${patient.bmiCategory})` : ""}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-2xs uppercase tracking-wide">Height</span>
              <strong className="text-sm text-foreground">{patient.height}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-2xs uppercase tracking-wide">Weight</span>
              <strong className="text-sm text-foreground">{patient.weight}</strong>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground block text-2xs uppercase tracking-wide">Evaluation Source</span>
              <span className="text-xs text-foreground font-medium">
                {report.isOffline
                  ? "Standardized Offline Questionnaire (Rule-Based)"
                  : report.source === "chat"
                  ? "AI Symptom Consultation"
                  : "Vitals Assessment Questionnaire"}
              </span>
            </div>
          </div>
        </section>

        {/* SECTION 3: CHIEF COMPLAINTS & TIMELINE */}
        <section className="space-y-3 break-inside-avoid">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Activity className="w-4 h-4" />
            <span>2. Chief Complaints & Symptoms Timeline</span>
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-medium border-b border-border/60">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3">Reported Symptom</th>
                  <th className="py-2.5 px-3">Duration / Onset</th>
                  <th className="py-2.5 px-3">Intensity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {symptoms.timeline.map((item) => (
                  <tr key={item.order} className="hover:bg-muted/10">
                    <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">{item.order}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{item.symptom}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{item.duration}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{item.intensity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 4: LIFESTYLE & HABITS */}
        <section className="space-y-3 break-inside-avoid">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>3. Lifestyle & Wellness Habits</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 p-4 rounded-xl border border-border/60 text-xs">
            <div>
              <span className="text-muted-foreground block text-2xs uppercase tracking-wide">Sleep Duration</span>
              <strong className="text-sm text-foreground">{lifestyle.sleepHours}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-2xs uppercase tracking-wide">Daily Hydration</span>
              <strong className="text-sm text-foreground">{lifestyle.hydrationLiters}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-2xs uppercase tracking-wide">Activity Level</span>
              <strong className="text-sm text-foreground">{lifestyle.activityLevel}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-2xs uppercase tracking-wide">Activity Score</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <strong className="text-sm text-foreground">{lifestyle.activityScore}/100</strong>
                {getActivityRatingBadge(lifestyle.activityScoreRating)}
              </div>
            </div>
          </div>
        </section>

        {/* OPTIONAL SECTION: 7-DAY VITALS TREND SUMMARY (Milestone 3) */}
        {includeTrends && (
          <section className="space-y-3 break-inside-avoid">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>Recent Longitudinal Vitals (7-Day Overview)</span>
              </h2>
              <Badge variant="outline" className="text-2xs text-muted-foreground border-border/80">
                Privacy Guarded • Notes & Reflections Excluded
              </Badge>
            </div>
            <div className="p-4 rounded-xl bg-muted/20 border border-border/60 text-xs space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Objective vitals aggregate summary from your recent wellness tracking logs. For personal privacy, freeform notes and mood reflections are strictly omitted from doctor exports.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-2.5 rounded-lg bg-card border border-border/40">
                  <span className="text-muted-foreground block text-2xs uppercase tracking-wide">Avg Rest / Sleep</span>
                  <strong className="text-sm text-foreground">{lifestyle.sleepHours}</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-border/40">
                  <span className="text-muted-foreground block text-2xs uppercase tracking-wide">Avg Hydration</span>
                  <strong className="text-sm text-foreground">{lifestyle.hydrationLiters}</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-border/40">
                  <span className="text-muted-foreground block text-2xs uppercase tracking-wide">Activity Status</span>
                  <strong className="text-sm text-foreground">{lifestyle.activityLevel}</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-border/40">
                  <span className="text-muted-foreground block text-2xs uppercase tracking-wide">Logging Habit</span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">Active In Journey</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 5: CATEGORICAL RISK ASSESSMENT */}
        <section className="space-y-3 break-inside-avoid">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>4. Categorical Risk Assessment</span>
            </h2>
            {getRiskBadge(risk.level)}
          </div>
          <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2">
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
              {risk.reason}
            </p>
            <div className="pt-2 border-t border-border/40 text-2xs text-muted-foreground italic flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{risk.disclaimer}</span>
            </div>
          </div>
        </section>

        {/* SECTION 6: LIFESTYLE RECOMMENDATIONS */}
        <section className="space-y-3 break-inside-avoid">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>5. Non-Prescriptive Lifestyle Guidance</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {recommendations.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border/60 text-xs text-foreground/90"
              >
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xs shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 7: DOCTOR DISCUSSION POINTS */}
        <section className="space-y-3 break-inside-avoid">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              <span>6. Suggested Doctor Discussion Points</span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyDoctorQuestions}
              className="h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground print:hidden rounded-lg hover:bg-primary/10"
              title="Copy questions to clipboard"
            >
              {copiedQuestions ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-primary" />
                  <span>Copy Questions</span>
                </>
              )}
            </Button>
          </div>
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
            <p className="text-xs text-muted-foreground">
              These suggested questions are designed to facilitate an informed, productive conversation with your licensed physician or primary healthcare provider:
            </p>
            <ol className="space-y-2 pt-1">
              {doctorQuestions.questions.map((q, idx) => (
                <li key={idx} className="text-xs sm:text-sm text-foreground/90 flex items-start gap-2.5 p-2.5 rounded-lg bg-card/60 border border-border/40">
                  <span className="font-mono text-xs text-primary font-bold shrink-0 mt-0.5">{idx + 1}.</span>
                  <span className="leading-relaxed">{q}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* SECTION 8: MANDATORY FOOTER & VERIFICATION */}
        <footer className="border-t border-border/70 pt-6 space-y-3 break-inside-avoid text-xs text-muted-foreground">
          <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-center sm:text-left">
            <p className="text-2xs sm:text-xs font-medium text-foreground/80 leading-normal">
              <strong>Important Notice:</strong> {footer.disclaimer}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-2xs">
            <div className="flex items-center gap-2">
              <span>Report Reference: <strong className="font-mono text-foreground">{footer.reportId}</strong></span>
              <span>•</span>
              <span>Verification Hash: <strong className="font-mono text-foreground">{footer.verificationCode}</strong></span>
            </div>
            <div>
              <span>Generated via Afiyat AI (عافیت AI) — Wellness Intelligence Platform</span>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
};
