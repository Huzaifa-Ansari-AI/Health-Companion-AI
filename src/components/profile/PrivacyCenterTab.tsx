// Milestone 4: Privacy Center Component
// Features: Granular consent toggles (opt-in), audit history, JSON data export, and cascade account deletion.
// Strict compliance: Never claims HIPAA/GDPR "compliance" or certification — uses "privacy-focused and aligned with good privacy practices".

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  getUserConsents,
  updateConsent,
  getConsentAuditHistory,
  exportUserData,
  deleteUserDataCascade,
} from "@/services/privacyService";
import {
  ConsentType,
  CONSENT_TYPES,
  CONSENT_DEFINITIONS,
  UserConsentsMap,
  PrivacyConsentRecord,
} from "@/types/privacy";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  Download,
  Trash2,
  History,
  AlertTriangle,
  Loader2,
  Lock,
  Info,
  CheckCircle2,
} from "lucide-react";

interface PrivacyCenterTabProps {
  userId: string;
  isDemo: boolean;
}

export const PrivacyCenterTab: React.FC<PrivacyCenterTabProps> = ({ userId, isDemo }) => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [consents, setConsents] = useState<UserConsentsMap | null>(null);
  const [auditLog, setAuditLog] = useState<PrivacyConsentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingType, setUpdatingType] = useState<ConsentType | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPrivacyData = React.useCallback(async () => {
    try {
      const [consentsMap, auditRecords] = await Promise.all([
        getUserConsents(userId, isDemo),
        getConsentAuditHistory(userId, isDemo),
      ]);
      setConsents(consentsMap);
      setAuditLog(auditRecords);
    } catch (err: unknown) {
      toast({
        title: "Privacy Data Error",
        description: err instanceof Error ? err.message : "Failed to load consents.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, isDemo, toast]);

  useEffect(() => {
    loadPrivacyData();
  }, [loadPrivacyData]);

  const handleToggleConsent = async (type: ConsentType, newGranted: boolean) => {
    setUpdatingType(type);
    try {
      const updatedRecord = await updateConsent(
        userId,
        { consent_type: type, granted: newGranted },
        isDemo
      );

      // Optimistic state update
      setConsents((prev) =>
        prev
          ? {
              ...prev,
              [type]: {
                granted: newGranted,
                updatedAt: updatedRecord.created_at,
                policyVersion: updatedRecord.policy_version,
              },
            }
          : prev
      );

      // Prepend to audit log
      setAuditLog((prev) => [updatedRecord, ...prev]);

      toast({
        title: newGranted ? "Consent Granted" : "Consent Revoked",
        description: `${CONSENT_DEFINITIONS[type].title} has been ${
          newGranted ? "enabled" : "turned off"
        }.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Consent Update Failed",
        description: err instanceof Error ? err.message : "Error saving preference.",
        variant: "destructive",
      });
    } finally {
      setUpdatingType(null);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await exportUserData(userId, isDemo);
      toast({
        title: "Data Export Complete",
        description: "Your complete health archive has been exported to JSON and downloaded.",
      });
    } catch (err: unknown) {
      toast({
        title: "Export Failed",
        description: err instanceof Error ? err.message : "Could not compile data archive.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmDeletion = async () => {
    if (deleteConfirmationText.trim() !== "DELETE MY DATA") {
      toast({
        title: "Confirmation Mismatch",
        description: "Please type DELETE MY DATA exactly to confirm.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteUserDataCascade(userId, isDemo);
      toast({
        title: "Account & Data Permanently Deleted",
        description: "All your personal records, assessments, check-ins, and chats have been erased.",
      });
      setDeleteModalOpen(false);
      await signOut();
      navigate("/");
    } catch (err: unknown) {
      toast({
        title: "Deletion Error",
        description: err instanceof Error ? err.message : "Error purging user records.",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  if (isLoading || !consents) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs">Loading privacy preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Card */}
      <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-2xs">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">
                  Privacy-Focused Architecture
                </h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Health Companion AI is designed to align with good privacy practices. All consents are
                strictly opt-in (disabled by default). You can grant or revoke permission for each feature
                at any time.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-primary/10">
            <Badge variant="outline" className="text-2xs bg-background/60 gap-1 border-primary/20">
              <Lock className="w-2.5 h-2.5 text-primary" />
              Row-Level Security (RLS)
            </Badge>
            <Badge variant="outline" className="text-2xs bg-background/60 gap-1 border-primary/20">
              <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
              Strict Opt-In Defaults
            </Badge>
            <Badge variant="outline" className="text-2xs bg-background/60 gap-1 border-primary/20">
              <Info className="w-2.5 h-2.5 text-primary" />
              Data Minimization
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 2. Granular Consent Controls */}
      <Card className="rounded-2xl border-border/70 shadow-2xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Granular Feature Permissions</span>
            <Badge variant="secondary" className="text-2xs font-normal">
              5 Controls
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Toggle specific capabilities on or off. Changes take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          {CONSENT_TYPES.map((type) => {
            const def = CONSENT_DEFINITIONS[type];
            const state = consents[type];
            const isGranted = state?.granted ?? false;
            const isBusy = updatingType === type;

            return (
              <div
                key={type}
                className="p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-card/90 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{def.title}</span>
                      {isGranted ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-2xs py-0 px-1.5 font-medium">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-2xs py-0 px-1.5 font-normal text-muted-foreground">
                          Paused
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{def.shortDescription}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                    <Switch
                      checked={isGranted}
                      disabled={isBusy}
                      onCheckedChange={(val) => handleToggleConsent(type, val)}
                      aria-label={`Toggle ${def.title}`}
                    />
                  </div>
                </div>

                {/* Collapsible Details */}
                <Accordion type="single" collapsible className="w-full text-xs border-t border-border/30 pt-1">
                  <AccordionItem value={`item-${type}`} className="border-none">
                    <AccordionTrigger className="py-1 text-2xs text-muted-foreground hover:text-foreground">
                      <span>View purpose & revocation impact</span>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-1 space-y-2 text-2xs text-muted-foreground leading-relaxed">
                      <div>
                        <strong className="text-foreground">How it works: </strong>
                        {def.fullExplanation}
                      </div>
                      <div>
                        <strong className="text-foreground">Why needed: </strong>
                        {def.whyNeeded}
                      </div>
                      <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                        <strong className="text-foreground">If turned off: </strong>
                        {def.revocationImpact}
                      </div>
                      {state?.updatedAt && (
                        <div className="text-3xs text-muted-foreground/60 pt-1">
                          Last updated: {new Date(state.updatedAt).toLocaleString()} (Policy v{state.policyVersion})
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 3. Consent Audit Log */}
      <Card className="rounded-2xl border-border/70 shadow-2xs">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="audit-log" className="border-none">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <History className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <h3 className="text-xs font-semibold text-foreground">Consent Audit History</h3>
                  <p className="text-2xs text-muted-foreground font-normal">
                    Append-only timestamped record of every permission grant and revocation ({auditLog.length} events)
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4 pt-1">
              {auditLog.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No consent changes recorded yet.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto rounded-xl border border-border/50 divide-y divide-border/30 text-2xs">
                  {auditLog.map((log) => (
                    <div key={log.id} className="p-2.5 flex items-center justify-between gap-2 bg-card/40">
                      <div className="min-w-0">
                        <span className="font-medium text-foreground">
                          {CONSENT_DEFINITIONS[log.consent_type]?.title || log.consent_type}
                        </span>
                        <div className="text-3xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()} • Policy v{log.policy_version}
                        </div>
                      </div>
                      <Badge
                        variant={log.granted ? "default" : "outline"}
                        className={`text-3xs shrink-0 ${
                          log.granted
                            ? "bg-emerald-600 text-white"
                            : "text-muted-foreground"
                        }`}
                      >
                        {log.granted ? "Granted" : "Revoked"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      {/* 4. Comprehensive Data Export Card */}
      <Card className="rounded-2xl border-border/70 shadow-2xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            <span>Data Portability & Export</span>
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Download a complete, machine-readable JSON copy of all personal records, vitals assessments, daily
            check-ins, consultation chat transcripts, and consent logs stored in Health Companion AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportData}
            disabled={isExporting}
            className="rounded-xl text-xs gap-2 border-border/80 hover:bg-primary/5 hover:text-primary"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isExporting ? "Compiling Archive..." : "Export Complete Data (JSON)"}</span>
          </Button>
        </CardContent>
      </Card>

      {/* 5. Danger Zone: Permanent Account & Data Deletion */}
      <Card className="rounded-2xl border-destructive/30 bg-destructive/5 shadow-2xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span>Danger Zone: Permanent Account & Data Deletion</span>
          </CardTitle>
          <CardDescription className="text-xs text-destructive/80 leading-relaxed">
            Permanently erase your account and all associated health records, assessments, check-ins, chats,
            and background history. This action is irreversible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              setDeleteConfirmationText("");
              setDeleteModalOpen(true);
            }}
            className="rounded-xl text-xs gap-1.5 shadow-2xs font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete All My Data & Account</span>
          </Button>
        </CardContent>
      </Card>

      {/* 6. Deletion Confirmation Dialog */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <span>Confirm Permanent Deletion</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 space-y-2">
              <span>
                This will permanently delete your account and cascade-delete every piece of your data:
              </span>
              <ul className="list-disc pl-5 space-y-1 text-2xs text-muted-foreground pt-1">
                <li>Patient health profile (allergies, conditions, medications)</li>
                <li>All BMI assessments and lifestyle reports</li>
                <li>Daily health check-in tracking history & streaks</li>
                <li>All consultation chat sessions & transcripts</li>
                <li>All active doctor share links</li>
              </ul>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs font-medium text-foreground">
              To proceed, please type <span className="font-mono text-destructive font-bold">DELETE MY DATA</span> below:
            </p>
            <Input
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="DELETE MY DATA"
              className="rounded-xl text-xs border-destructive/40 focus-visible:ring-destructive font-mono"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeletion}
              disabled={deleteConfirmationText.trim() !== "DELETE MY DATA" || isDeleting}
              className="rounded-xl text-xs gap-1.5"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>{isDeleting ? "Erasing Data..." : "Permanently Delete Everything"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
