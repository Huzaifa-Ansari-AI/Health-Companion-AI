// Milestone 4: FamilyHistorySection Component
// Manages family health background for risk factor awareness with suggestions.

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfileFamilyHistory } from "@/types/profile";
import { addFamilyHistory, deleteFamilyHistory } from "@/services/profileService";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Info, Users } from "lucide-react";

interface FamilyHistorySectionProps {
  userId: string;
  isDemo: boolean;
  familyHistory: ProfileFamilyHistory[];
  onChanged: (updated: ProfileFamilyHistory[]) => void;
}

const COMMON_FAMILY_SUGGESTIONS = [
  "Heart Disease",
  "Type 2 Diabetes",
  "High Blood Pressure",
  "Stroke",
  "Glaucoma",
  "Osteoporosis",
  "Colon Cancer",
  "Depression",
];

const COMMON_RELATIONS = [
  "Mother",
  "Father",
  "Sister",
  "Brother",
  "Maternal Grandparent",
  "Paternal Grandparent",
  "Aunt / Uncle",
  "Other First-degree Relative",
];

export const FamilyHistorySection: React.FC<FamilyHistorySectionProps> = ({
  userId,
  isDemo,
  familyHistory,
  onChanged,
}) => {
  const { toast } = useToast();
  const [conditionName, setConditionName] = useState("");
  const [relation, setRelation] = useState("Mother");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conditionName.trim() || !relation.trim()) return;

    setIsAdding(true);
    try {
      const created = await addFamilyHistory(
        userId,
        {
          condition_name: conditionName.trim(),
          relation: relation.trim(),
        },
        isDemo
      );
      onChanged([created, ...familyHistory]);
      setConditionName("");
      toast({
        title: "Family History Added",
        description: `${created.condition_name} (${created.relation}) recorded.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Failed to add",
        description: err instanceof Error ? err.message : "Error saving entry.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setDeletingId(id);
    try {
      await deleteFamilyHistory(id, userId, isDemo);
      onChanged(familyHistory.filter((f) => f.id !== id));
      toast({
        title: "Entry Removed",
        description: `${name} removed from family history.`,
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
      {/* Informational Guidance Note */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex items-start gap-2.5 text-xs text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <span className="text-2xs leading-relaxed">
          <strong>Non-Medical Record Notice:</strong> Used only to make AI guidance more relevant (e.g. general cardiovascular or metabolic awareness), only if you allow it. Not a medical record.
        </span>
      </div>

      {/* Add Family History Form */}
      <form onSubmit={handleAdd} className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="family-condition" className="text-xs">
              Condition <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="family-condition"
              placeholder="e.g. Heart Disease"
              value={conditionName}
              onChange={(e) => setConditionName(e.target.value)}
              className="rounded-xl h-9 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="family-relation" className="text-xs">
              Relation <span className="text-rose-500">*</span>
            </Label>
            <Select value={relation} onValueChange={setRelation}>
              <SelectTrigger id="family-relation" className="rounded-xl h-9 text-xs">
                <SelectValue placeholder="Relation" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {COMMON_RELATIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="space-y-1.5 pt-1">
          <span className="text-2xs text-muted-foreground block">Quick suggestions (click to fill):</span>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_FAMILY_SUGGESTIONS.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setConditionName(item)}
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
            disabled={!conditionName.trim() || isAdding}
            className="gap-1.5 rounded-xl text-xs h-8"
          >
            {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Add Family History</span>
          </Button>
        </div>
      </form>

      {/* Family History List */}
      {familyHistory.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground">
          No family health history recorded.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {familyHistory.map((f) => (
            <div
              key={f.id}
              className="p-3 rounded-xl bg-card border border-border/60 flex items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5">
                <span className="font-medium text-foreground block">{f.condition_name}</span>
                <span className="text-2xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{f.relation}</span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(f.id, f.condition_name)}
                disabled={deletingId === f.id}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0 rounded-lg"
                aria-label={`Remove family condition ${f.condition_name}`}
              >
                {deletingId === f.id ? (
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
