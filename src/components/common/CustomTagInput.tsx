import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface CustomTagInputProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  maxTags?: number;
  badgeVariantClassName?: string;
}

/**
 * Reusable dynamic multi-tag input system.
 * Supports adding items via "+" button and Enter key,
 * with duplicate prevention and removable badge chips.
 */
export const CustomTagInput: React.FC<CustomTagInputProps> = ({
  tags,
  onAddTag,
  onRemoveTag,
  placeholder = "Type and press Enter or + to add...",
  id,
  disabled = false,
  maxTags = 15,
  badgeVariantClassName = "bg-teal-50 text-teal-900 border-teal-300 dark:bg-teal-950/40 dark:text-teal-200",
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || disabled) return;
    if (tags.length >= maxTags) return;
    // Prevent duplicate entries case-insensitively
    if (!tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      onAddTag(trimmed);
    }
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length >= maxTags ? `Maximum ${maxTags} entries reached` : placeholder}
          disabled={disabled || tags.length >= maxTags}
          className="h-10 text-xs rounded-xl border-slate-300 focus:border-teal-500 focus:ring-teal-500"
        />
        <Button
          type="button"
          onClick={handleAdd}
          disabled={disabled || !inputValue.trim() || tags.length >= maxTags}
          size="sm"
          className="h-10 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shrink-0 shadow-2xs"
          title="Add entry"
          aria-label="Add entry"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={`text-xs pl-2.5 pr-1.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 ${badgeVariantClassName}`}
            >
              <span className="truncate max-w-[220px]">{tag}</span>
              <button
                type="button"
                onClick={() => onRemoveTag(tag)}
                disabled={disabled}
                className="hover:opacity-75 p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title={`Remove ${tag}`}
                aria-label={`Remove ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
