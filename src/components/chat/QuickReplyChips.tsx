import React from "react";
import { Button } from "@/components/ui/button";

const STARTER_SYMPTOM_CHIPS = [
  "Frequent headaches",
  "Sleep issues",
  "Digestive problems",
  "Fatigue",
  "Stress and anxiety",
];

interface QuickReplyChipsProps {
  suggestions?: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export const QuickReplyChips: React.FC<QuickReplyChipsProps> = ({
  suggestions,
  onSelect,
  disabled = false,
}) => {
  const chips = suggestions && suggestions.length > 0 ? suggestions : STARTER_SYMPTOM_CHIPS;

  return (
    <div
      role="group"
      aria-label="Suggested quick replies"
      className="flex items-center gap-2 overflow-x-auto py-2 px-1 no-scrollbar"
    >
      <span className="text-xs text-muted-foreground whitespace-nowrap font-medium pl-1">
        Suggestions:
      </span>
      {chips.map((chip, index) => (
        <Button
          key={`${chip}-${index}`}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onSelect(chip)}
          className="rounded-full text-xs h-7 px-3 bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors shrink-0 shadow-2xs font-normal"
        >
          {chip}
        </Button>
      ))}
    </div>
  );
};
