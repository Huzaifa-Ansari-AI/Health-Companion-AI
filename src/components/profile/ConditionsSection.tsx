// Milestone 4: ConditionsSection Component
// Manages ongoing or managed health conditions with status tags and suggestion chips.

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfileCondition, ConditionStatus } from "@/types/profile";
import { addCondition, deleteCondition } from "@/services/profileService";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Info } from "lucide-react";

interface ConditionsSectionProps {
  userId: string;
  isDemo: boolean;
  conditions: ProfileCondition[];
  onChanged: (updated: ProfileCondition[]) => void;
}

const COMMON_CONDITIONS_SUGGESTIONS = [
  "Asthma",
  "Hypertension",
  "Type 2 Diabetes",
  "Migraine",
  "Eczema",
  "GERD / Acid Reflux",
  "Hypothyroidism",
  "High Cholesterol",
  "Irritable Bowel Syndrome",
];

export const ConditionsSection: React.FC<ConditionsSectionProps> = ({
  userId,
  isDemo,
  conditions,
  onChanged,
}) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<ConditionStatus>("active");
  const [sinceYear, setSinceYear] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedYear = sinceYear ? parseInt(sinceYear, 10) : null;
    if (parsedYear && (parsedYear < 1900 || parsedYear > new Date().getFullYear())) {
      toast({
        title: "Invalid Year",
        description: "Year must be between 1900 and current year.",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      const created = await addCondition(
        userId,
        {
          name: name.trim(),
          status,
          since_year: parsedYear,
        },
        isDemo
      );
      onChanged([created, ...conditions]);
      setName("");
      setSinceYear("");
      toast({
        title: "Condition Recorded",
        description: `${created.name} added to your health background.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Failed to add",
        description: err instanceof Error ? err.message : "Error saving condition.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, conditionName: string) => {
    setDeletingId(id);
    try {
      await deleteCondition(id, userId, isDemo);
      onChanged(conditions.filter((c) => c.id !== id));
      toast({
        title: "Condition Removed",
        description: `${conditionName} was removed from your profile.`,
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

  const getStatusBadge = (st: ConditionStatus) => {
    switch (st) {
      case "active":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-2xs">Active</Badge>;
      case "managed":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-2xs">Managed</Badge>;
      case "past":
        return <Badge variant="outline" className="text-2xs text-muted-foreground">Past / Resolved</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Informational Guidance Note */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex items-start gap-2.5 text-xs text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <span className="text-2xs leading-relaxed">
          <strong>Non-Medical Record Notice:</strong> Used only to make AI guidance more relevant (e.g. contextualizing symptoms), only if you allow it. Not a medical record.
        </span>
      </div>

      {/* Add Condition Form */}
      <form onSubmit={handleAdd} className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="condition-name" className="text-xs">
              Condition Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="condition-name"
              placeholder="e.g. Asthma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl h-9 text-xs"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="condition-status" className="text-xs">
              Status
            </Label>
            <Select value={status} onValueChange={(val) => setStatus(val as ConditionStatus)}>
              <SelectTrigger id="condition-status" className="rounded-xl h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="active">Active (currently symptomatic)</SelectItem>
                <SelectItem value="managed">Managed (controlled with lifestyle/care)</SelectItem>
                <SelectItem value="past">Past / Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="condition-year" className="text-xs">
              Diagnosed Year <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="condition-year"
              type="number"
              placeholder="e.g. 2019"
              min="1900"
              max={new Date().getFullYear()}
              value={sinceYear}
              onChange={(e) => setSinceYear(e.target.value)}
              className="rounded-xl h-9 text-xs"
            />
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="space-y-1.5 pt-1">
          <span className="text-2xs text-muted-foreground block">Quick suggestions (click to fill):</span>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_CONDITIONS_SUGGESTIONS.map((item) => (
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
            <span>Add Condition</span>
          </Button>
        </div>
      </form>

      {/* Conditions List */}
      {conditions.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground">
          No chronic or active health conditions recorded.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {conditions.map((c) => (
            <div
              key={c.id}
              className="p-3 rounded-xl bg-card border border-border/60 flex items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{c.name}</span>
                  {getStatusBadge(c.status)}
                </div>
                {c.since_year && (
                  <p className="text-2xs text-muted-foreground">
                    Since: {c.since_year}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(c.id, c.name)}
                disabled={deletingId === c.id}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0 rounded-lg"
                aria-label={`Remove condition ${c.name}`}
              >
                {deletingId === c.id ? (
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
