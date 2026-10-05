// Milestone 4: AllergiesSection Component
// Manages known allergies with autocomplete suggestion chips, severity tags, and deletion.

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfileAllergy, AllergySeverity } from "@/types/profile";
import { addAllergy, deleteAllergy } from "@/services/profileService";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Plus, Trash2, Loader2, Info } from "lucide-react";

interface AllergiesSectionProps {
  userId: string;
  isDemo: boolean;
  allergies: ProfileAllergy[];
  onChanged: (updated: ProfileAllergy[]) => void;
}

const COMMON_ALLERGY_SUGGESTIONS = [
  "Penicillin",
  "Sulfa drugs",
  "Peanuts",
  "Tree nuts",
  "Shellfish",
  "Pollen / Hay Fever",
  "Dust Mites",
  "Latex",
  "Aspirin / NSAIDs",
  "Dairy / Lactose",
];

export const AllergiesSection: React.FC<AllergiesSectionProps> = ({
  userId,
  isDemo,
  allergies,
  onChanged,
}) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [reaction, setReaction] = useState("");
  const [severity, setSeverity] = useState<AllergySeverity>("moderate");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsAdding(true);
    try {
      const created = await addAllergy(
        userId,
        {
          name: name.trim(),
          reaction: reaction.trim() || null,
          severity,
        },
        isDemo
      );
      onChanged([created, ...allergies]);
      setName("");
      setReaction("");
      toast({
        title: "Allergy Added",
        description: `${created.name} recorded in background context.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Failed to add",
        description: err instanceof Error ? err.message : "Error saving allergy.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, allergyName: string) => {
    setDeletingId(id);
    try {
      await deleteAllergy(id, userId, isDemo);
      onChanged(allergies.filter((a) => a.id !== id));
      toast({
        title: "Allergy Removed",
        description: `${allergyName} was removed from your profile.`,
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

  const getSeverityBadge = (sev: AllergySeverity | null) => {
    switch (sev) {
      case "severe":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-2xs">Severe</Badge>;
      case "moderate":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-2xs">Moderate</Badge>;
      case "mild":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-2xs">Mild</Badge>;
      default:
        return <Badge variant="outline" className="text-2xs">Unspecified</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Informational Guidance Note */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex items-start gap-2.5 text-xs text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <span className="text-2xs leading-relaxed">
          <strong>Non-Medical Record Notice:</strong> Used only to make AI guidance more relevant (e.g. avoiding allergen suggestions in lifestyle tips), only if you allow it. Not a medical record.
        </span>
      </div>

      {/* Add Allergy Form */}
      <form onSubmit={handleAdd} className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="allergy-name" className="text-xs">
              Allergy Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="allergy-name"
              placeholder="e.g. Penicillin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl h-9 text-xs"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="allergy-reaction" className="text-xs">
              Reaction (Optional)
            </Label>
            <Input
              id="allergy-reaction"
              placeholder="e.g. Hives, swelling"
              value={reaction}
              onChange={(e) => setReaction(e.target.value)}
              className="rounded-xl h-9 text-xs"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="allergy-severity" className="text-xs">
              Severity
            </Label>
            <Select value={severity} onValueChange={(val) => setSeverity(val as AllergySeverity)}>
              <SelectTrigger id="allergy-severity" className="rounded-xl h-9 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="mild">Mild (minor rash, sneezing)</SelectItem>
                <SelectItem value="moderate">Moderate (hives, digestive distress)</SelectItem>
                <SelectItem value="severe">Severe (anaphylaxis concern)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Autocomplete Suggestion Chips */}
        <div className="space-y-1.5 pt-1">
          <span className="text-2xs text-muted-foreground block">Quick suggestions (click to fill):</span>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_ALLERGY_SUGGESTIONS.map((item) => (
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

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            size="sm"
            disabled={!name.trim() || isAdding}
            className="gap-1.5 rounded-xl text-xs h-8"
          >
            {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Add Allergy</span>
          </Button>
        </div>
      </form>

      {/* Allergies List */}
      {allergies.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground">
          No allergies recorded yet. Add any if applicable.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {allergies.map((a) => (
            <div
              key={a.id}
              className="p-3 rounded-xl bg-card border border-border/60 flex items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{a.name}</span>
                  {getSeverityBadge(a.severity)}
                </div>
                {a.reaction && (
                  <p className="text-2xs text-muted-foreground">
                    Reaction: {a.reaction}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(a.id, a.name)}
                disabled={deletingId === a.id}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0 rounded-lg"
                aria-label={`Remove allergy ${a.name}`}
              >
                {deletingId === a.id ? (
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
