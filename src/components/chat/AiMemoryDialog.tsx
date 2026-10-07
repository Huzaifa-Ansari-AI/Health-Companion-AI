import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
  Brain,
  ShieldCheck,
  ShieldAlert,
  User,
  Heart,
  Pill,
  AlertTriangle,
  Users,
  ExternalLink,
  Sparkles,
  Lock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserConsents } from "@/services/privacyService";
import { getComprehensiveProfile } from "@/services/profileService";

interface AiMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDemo?: boolean;
}

export const AiMemoryDialog: React.FC<AiMemoryDialogProps> = ({
  open,
  onOpenChange,
  isDemo = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: consents, isLoading: isConsentsLoading } = useQuery({
    queryKey: ["privacy-consents", user?.id, isDemo],
    queryFn: async () => {
      if (!user) return null;
      return getUserConsents(user.id, isDemo);
    },
    enabled: Boolean(user && open),
  });

  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ["health-profile-comprehensive", user?.id, isDemo],
    queryFn: async () => {
      if (!user) return null;
      return getComprehensiveProfile(user.id, isDemo);
    },
    enabled: Boolean(user && open),
  });

  const isConsentGranted = Boolean(consents?.ai_profile_context?.granted);
  const isLoading = isConsentsLoading || isProfileLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1.5 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                What the AI Knows About Me
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Granular transparency into the health profile context provided to the consultation AI.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-3 space-y-4 text-xs sm:text-sm">
          {/* Status Banner */}
          <div className="p-3 rounded-xl border flex items-center justify-between gap-3 bg-card shadow-2xs">
            <div className="flex items-center gap-2.5">
              {isConsentGranted ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div>
                <p className="font-medium text-foreground">
                  {isConsentGranted
                    ? "Personalization Active"
                    : "Personalization Disabled"}
                </p>
                <p className="text-2xs text-muted-foreground">
                  {isConsentGranted
                    ? "AI receives your sanitized health profile context for more relevant guidance."
                    : "AI operates in generic mode with zero health profile access."}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                isConsentGranted
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
              }
            >
              {isConsentGranted ? "Granted" : "Opted Out"}
            </Badge>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
              Loading memory & consent records...
            </div>
          ) : !isConsentGranted ? (
            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/30 text-center space-y-2">
              <Lock className="w-6 h-6 mx-auto text-muted-foreground" />
              <p className="font-medium text-foreground text-xs">Profile Context is Withheld</p>
              <p className="text-2xs text-muted-foreground max-w-sm mx-auto">
                In strict accordance with privacy-first standards, no demographic or medical history
                is shared with the AI. You can grant access anytime in the Privacy Center.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Shared Attributes
              </p>

              {/* Grid of Profile Data Shared */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* Demographics */}
                <div className="p-2.5 rounded-lg border bg-card/60 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>Demographics</span>
                  </div>
                  <p className="text-2xs text-muted-foreground">
                    {profileData?.profile?.age
                      ? `Age: ${profileData.profile.age} • Gender: ${profileData.profile.gender || "Not specified"}`
                      : "None specified"}
                  </p>
                </div>

                {/* Conditions */}
                <div className="p-2.5 rounded-lg border bg-card/60 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>Conditions</span>
                  </div>
                  <p className="text-2xs text-muted-foreground truncate">
                    {profileData?.conditions && profileData.conditions.length > 0
                      ? profileData.conditions.map((c) => c.name).join(", ")
                      : "None recorded"}
                  </p>
                </div>

                {/* Allergies */}
                <div className="p-2.5 rounded-lg border bg-card/60 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Allergies</span>
                  </div>
                  <p className="text-2xs text-muted-foreground truncate">
                    {profileData?.allergies && profileData.allergies.length > 0
                      ? profileData.allergies.map((a) => a.name).join(", ")
                      : "None recorded"}
                  </p>
                </div>

                {/* Medications */}
                <div className="p-2.5 rounded-lg border bg-card/60 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Pill className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Medications</span>
                  </div>
                  <p className="text-2xs text-muted-foreground truncate">
                    {profileData?.medications && profileData.medications.length > 0
                      ? profileData.medications.map((m) => m.name).join(", ")
                      : "None recorded"}
                  </p>
                </div>

                {/* Family History */}
                <div className="p-2.5 rounded-lg border bg-card/60 space-y-1 sm:col-span-2">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Users className="w-3.5 h-3.5 text-teal-600" />
                    <span>Family Medical History</span>
                  </div>
                  <p className="text-2xs text-muted-foreground truncate">
                    {profileData?.familyHistory && profileData.familyHistory.length > 0
                      ? profileData.familyHistory.map((f) => `${f.condition_name} (${f.relation})`).join(", ")
                      : "None recorded"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Guarantee Box */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1 text-2xs">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Sparkles className="w-3 h-3" />
              <span>Data Minimization & Privacy Protection</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Your name, email, credentials, and uploaded files are <strong>never</strong> transmitted
              to AI models. Consultation context is processed strictly server-side through Supabase Edge
              Functions without client key exposure and is never used to train public models.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              navigate("/profile?tab=privacy");
            }}
            className="w-full sm:w-auto text-xs gap-1.5 rounded-xl"
          >
            <span>Manage in Privacy Center</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs rounded-xl"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
