// Milestone 4: Profile Completeness Progress Card
// Gentle, non-judgmental wellness motivation without guilt mechanics.

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2, CircleDashed } from "lucide-react";
import { ComprehensiveHealthProfile } from "@/types/profile";
import { calculateProfileCompleteness } from "@/services/profileService";

interface ProfileCompletenessCardProps {
  data: ComprehensiveHealthProfile;
  onSelectTab?: (tab: string) => void;
}

export const ProfileCompletenessCard: React.FC<ProfileCompletenessCardProps> = ({
  data,
}) => {
  const { score, completedSections, missingSections } = calculateProfileCompleteness(data);

  const getStatusBadge = () => {
    if (score === 100) {
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-medium">
          Comprehensive Profile
        </Badge>
      );
    }
    if (score >= 60) {
      return (
        <Badge className="bg-teal-100 text-teal-800 border-teal-300 font-medium">
          Well Personalized
        </Badge>
      );
    }
    if (score > 0) {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-medium">
          Getting Started
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Optional Details
      </Badge>
    );
  };

  return (
    <Card className="rounded-2xl border-border/70 shadow-2xs bg-gradient-to-br from-card via-card to-primary/5">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-base">
                  Profile Personalization
                </h3>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Optional background context to make AI consultation more relevant.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-2xl font-bold text-foreground font-mono">
              {score}%
            </span>
            <span className="text-xs text-muted-foreground block">
              {completedSections.length} of 5 sections
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <Progress value={score} className="h-2 rounded-full" />
          <div className="flex items-center justify-between text-2xs text-muted-foreground">
            <span>Take your time—everything here is completely optional</span>
            <span>{score === 100 ? "All set!" : `${missingSections.length} sections unrecorded`}</span>
          </div>
        </div>

        {/* Badges Breakdown */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40 text-xs">
          {["Demographics", "Allergies", "Health Conditions", "Family History", "Medications"].map(
            (sec) => {
              const isCompleted = completedSections.includes(sec);
              return (
                <div
                  key={sec}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-medium border ${
                    isCompleted
                      ? "bg-emerald-50/80 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-muted/40 text-muted-foreground border-border/50"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <CircleDashed className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                  )}
                  <span>{sec}</span>
                </div>
              );
            }
          )}
        </div>
      </CardContent>
    </Card>
  );
};
