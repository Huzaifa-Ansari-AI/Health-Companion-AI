// Milestone 2: Complete Profile Details Modal
// Prompts user for optional demographics (age, gender, date of birth) before viewing or exporting reports.

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfileDemographics } from "@/types/report";
import { updateProfileDemographics } from "@/services/reportService";
import { UserCheck, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CompleteDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  initialData?: ProfileDemographics | null;
  isDemo?: boolean;
  onSaved: (updated: ProfileDemographics) => void;
}

export const CompleteDetailsDialog: React.FC<CompleteDetailsDialogProps> = ({
  open,
  onOpenChange,
  userId,
  initialData,
  isDemo = false,
  onSaved,
}) => {
  const { toast } = useToast();
  const [fullName, setFullName] = useState(initialData?.full_name || "");
  const [age, setAge] = useState(initialData?.age ? String(initialData.age) : "");
  const [gender, setGender] = useState(initialData?.gender || "");
  const [dob, setDob] = useState(initialData?.date_of_birth || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedAge = age ? parseInt(age, 10) : null;
      const demographics: ProfileDemographics = {
        full_name: fullName.trim() || null,
        age: parsedAge && parsedAge > 0 && parsedAge <= 120 ? parsedAge : null,
        gender: gender || null,
        date_of_birth: dob || null,
      };

      const updated = await updateProfileDemographics(userId, demographics, isDemo);
      toast({
        title: "Details updated",
        description: "Your report demographics have been saved.",
      });
      onSaved(updated);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update details.";
      toast({
        title: "Update failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <UserCheck className="w-5 h-5 text-primary" />
          </div>
          <DialogTitle>Complete Your Report Details</DialogTitle>
          <DialogDescription>
            Personalize your health & wellness summary. These details appear on your report for clarity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="report-fullname">Full Name</Label>
            <Input
              id="report-fullname"
              placeholder="e.g. Alex Morgan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="report-age">Age (years)</Label>
              <Input
                id="report-age"
                type="number"
                min="1"
                max="120"
                placeholder="e.g. 32"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="report-gender">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Non-binary">Non-binary</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-dob">Date of Birth (optional)</Label>
            <Input
              id="report-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Shield className="w-4 h-4 text-primary shrink-0" />
            <span>Missing fields will safely appear as &ldquo;Not provided&rdquo; on the report.</span>
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save & Update Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
