import React from "react";
import { ShieldAlert } from "lucide-react";

export const DisclaimerBar: React.FC = () => {
  return (
    <div
      role="note"
      aria-label="Medical disclaimer"
      className="bg-muted/70 border-b border-border/60 px-4 py-2 text-xs text-muted-foreground flex items-center justify-center gap-2 text-center"
    >
      <ShieldAlert className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
      <span>
        <strong>AI Wellness Assistant:</strong> This is not a medical diagnosis. For health concerns or medication questions, always consult a qualified healthcare professional.
      </span>
    </div>
  );
};
