import React from "react";
import { Sparkles } from "lucide-react";

export const TypingIndicator: React.FC = () => {
  return (
    <div
      role="status"
      aria-label="Health Companion AI is thinking"
      className="flex items-center gap-3 p-3 max-w-[280px] rounded-2xl bg-card border border-border/70 shadow-xs text-muted-foreground animate-in fade-in duration-200"
    >
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-1.5 py-1">
        <span className="text-xs font-medium text-foreground/80 mr-1">Consulting</span>
        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" />
      </div>
    </div>
  );
};
