// Milestone 4: MedicationsSection Component
// Context-only medication list with strict non-prescriptive disclaimers (NO interaction checks or dose advice).

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ProfileMedication } from "@/types/profile";
import { addMedication, deleteMedication } from "@/services/profileService";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Pill, ShieldAlert, AlertTriangle } from "lucide-react";

interface MedicationsSectionProps {
  userId: string;
  isDemo: boolean;
  medications: ProfileMedication[];
  onChanged: (updated: ProfileMedication[]) => void;
}

const COMMON_MED_SUGGESTIONS = [
  "Albuterol Inhaler",
  "Lisinopril",
  "Metformin",
  "Levothyroxine",
  "Atorvastatin",
  "Omeprazole",
  "Cetirizine",
  "Daily Multivitamin",
  "Vitamin D3 Supplement",
];

export const MedicationsSection: React.FC<MedicationsSectionProps> = ({
  userId,
  isDemo,
  medications,
  onChanged,
}) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [doseText, setDoseText] = useState("");
  const [frequencyText, setFrequencyText] = useState("");
  const [isCurrent, setIsCurrent] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsAdding(true);
    try {
      const created = await addMedication(
        userId,
        {
          name: name.trim(),
          dose_text: doseText.trim() || null,
          frequency_text: frequencyText.trim() || null,
          is_current: isCurrent,
        },
        isDemo
      );
      onChanged([created, ...medications]);
      setName("");
      setDoseText("");
      setFrequencyText("");
      setIsCurrent(true);
      toast({
        title: "Medication Added",
        description: `${created.name} recorded for background context.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Failed to add",
        description: err instanceof Error ? err.message : "Error saving medication.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, medName: string) => {
    setDeletingId(id);
    try {
      await deleteMedication(id, userId, isDemo);
      onChanged(medications.filter((m) => m.id !== id));
      toast({
        title: "Medication Removed",
        description: `${medName} removed from your list.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Failed to delete",
        description: err instanceof Error ? err.message : "Error deleting entry.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* MANDATORY MEDICAL SAFETY DISCLAIMER */}
      <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 dark:bg-amber-950/30 dark:border-amber-900/60 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-2xs leading-relaxed">
          <strong className="font-semibold block text-xs">
            Context Only — Non-Prescriptive & Non-Diagnostic
          </strong>
          <p>
            This is a private text note list for conversational context only. Health Companion AI <strong>never</strong> prescribes medications, evaluates dosages, checks drug interactions, or advises stopping/changing any medication.
          </p>
          <p className="font-medium text-amber-800 dark:text-amber-300">
            Always consult your prescribing physician or licensed pharmacist for any medication questions.
          </p>
        </div>
      </div>

      {/* Add Medication Form */}
      <form onSubmit={handleAdd} className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="med-name" className="text-xs">
              Medication Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="med-name"
              placeholder="e.g. Albuterol Inhaler"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl h-9 text-xs"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="med-dose" className="text-xs">
              Dose Note <span className="text-muted-foreground font-normal">(Optional context)</span>
            </Label>
            <Input
              id="med-dose"
              placeholder="e.g. 10 mg or 2 puffs"
              value={doseText}
              onChange={(e) => setDoseText(e.target.value)}
              className="rounded-xl h-9 text-xs"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="med-freq" className="text-xs">
              Frequency <span className="text-muted-foreground font-normal">(Optional context)</span>
            </Label>
            <Input
              id="med-freq"
              placeholder="e.g. Once daily in morning"
              value={frequencyText}
              onChange={(e) => setFrequencyText(e.target.value)}
              className="rounded-xl h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="med-current"
              checked={isCurrent}
              onCheckedChange={(checked) => setIsCurrent(checked === true)}
            />
            <Label htmlFor="med-current" className="text-2xs text-muted-foreground cursor-pointer select-none">
              Currently taking this medication
            </Label>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={!name.trim() || isAdding}
            className="gap-1.5 rounded-xl text-xs h-8"
          >
            {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Add to Context List</span>
          </Button>
        </div>

        {/* Suggestion Chips */}
        <div className="space-y-1.5 pt-1 border-t border-border/40">
          <span className="text-2xs text-muted-foreground block">Quick common examples:</span>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_MED_SUGGESTIONS.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setName(item)}
                className="text-2xs px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-border/40 text-muted-foreground cursor-pointer"
              >
                + {item}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Medications List */}
      {medications.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground">
          No medications recorded. Add any active medications if you wish to provide background context.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {medications.map((m) => (
            <div
              key={m.id}
              className="p-3 rounded-xl bg-card border border-border/60 flex items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Pill className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-medium text-foreground">{m.name}</span>
                  {m.is_current ? (
                    <Badge variant="outline" className="text-2xs text-emerald-700 dark:text-emerald-400 border-emerald-300">Current</Badge>
                  ) : (
                    <Badge variant="outline" className="text-2xs text-muted-foreground">Past</Badge>
                  )}
                </div>
                {(m.dose_text || m.frequency_text) && (
                  <p className="text-2xs text-muted-foreground pl-5.5">
                    {[m.dose_text, m.frequency_text].filter(Boolean).join(" • ")}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(m.id, m.name)}
                disabled={deletingId === m.id}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0 rounded-lg"
                aria-label={`Remove medication ${m.name}`}
              >
                {deletingId === m.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
