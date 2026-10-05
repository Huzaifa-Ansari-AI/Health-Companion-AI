// Milestone 4: BasicDetailsTab Component
// Manages age, birth date, gender (with 'Prefer not to say'), and timezone preferences.

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HealthProfile, HealthProfileInput } from "@/types/profile";
import { upsertHealthProfile } from "@/services/profileService";
import { useToast } from "@/hooks/use-toast";
import { User, ShieldCheck, Clock, Save, Loader2 } from "lucide-react";

interface BasicDetailsTabProps {
  userId: string;
  isDemo: boolean;
  initialProfile: HealthProfile | null;
  onSaved: (updated: HealthProfile) => void;
}

export const BasicDetailsTab: React.FC<BasicDetailsTabProps> = ({
  userId,
  isDemo,
  initialProfile,
  onSaved,
}) => {
  const { toast } = useToast();
  const [age, setAge] = useState<string>(
    initialProfile?.age ? String(initialProfile.age) : ""
  );
  const [dateOfBirth, setDateOfBirth] = useState<string>(
    initialProfile?.date_of_birth ?? ""
  );
  const [gender, setGender] = useState<string>(
    initialProfile?.gender ?? "Prefer not to say"
  );
  const [timeZone, setTimeZone] = useState<string>(
    initialProfile?.time_zone ??
      (typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "UTC")
  );
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const parsedAge = age ? parseInt(age, 10) : null;
    if (parsedAge !== null && (isNaN(parsedAge) || parsedAge < 18 || parsedAge > 120)) {
      setValidationError("Age must be between 18 and 120 years.");
      return;
    }

    setIsSaving(true);
    try {
      const input: HealthProfileInput = {
        age: parsedAge,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        time_zone: timeZone || "UTC",
      };

      const updated = await upsertHealthProfile(userId, input, isDemo);
      onSaved(updated);
      toast({
        title: "Demographics Saved",
        description: "Your basic profile details have been updated safely.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile.";
      setValidationError(message);
      toast({
        title: "Update Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl border-border/80 shadow-2xs">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-lg">Basic Demographics</CardTitle>
            <CardDescription className="text-xs">
              General background details used for age-appropriate wellness insights.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {validationError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20">
              {validationError}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Age Field */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-age" className="text-xs font-medium">
                Age (Years) <span className="text-muted-foreground font-normal">(Min 18)</span>
              </Label>
              <Input
                id="profile-age"
                type="number"
                min="18"
                max="120"
                placeholder="e.g. 29"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="rounded-xl h-10"
              />
              <p className="text-2xs text-muted-foreground">
                Health Companion AI is designed for adults aged 18 and older.
              </p>
            </div>

            {/* Date of Birth Field */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-dob" className="text-xs font-medium">
                Date of Birth <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="profile-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="rounded-xl h-10"
              />
              <p className="text-2xs text-muted-foreground">
                Exact date is stored securely and never transmitted directly to AI models.
              </p>
            </div>

            {/* Gender Field */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-gender" className="text-xs font-medium">
                Gender Identity
              </Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="profile-gender" className="rounded-xl h-10">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Non-binary">Non-binary</SelectItem>
                  <SelectItem value="Self-describe">Self-describe / Other</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timezone Field */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-tz" className="text-xs font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Timezone</span>
              </Label>
              <Input
                id="profile-tz"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                placeholder="e.g. America/New_York or UTC"
                className="rounded-xl h-10 font-mono text-xs"
              />
              <p className="text-2xs text-muted-foreground">
                Used to correctly align your daily habit streaks with calendar midnight.
              </p>
            </div>
          </div>

          {/* Privacy Note Banner */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 flex items-start gap-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed text-2xs">
              <strong className="text-foreground">Privacy Protection:</strong> Demographics are private to your account. When AI context is enabled, only your general age bracket (e.g. &ldquo;Adult 25-34&rdquo;) is shared to prevent identification.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSaving} className="gap-2 rounded-xl">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Basic Details</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
