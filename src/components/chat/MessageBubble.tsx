import React, { useState } from "react";
import { ChatMessage, RiskLevel } from "@/types/chat";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  User,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access error handled silently
    }
  };

  const renderRiskBadge = (risk?: RiskLevel | null) => {
    if (!risk) return null;

    switch (risk) {
      case "Low":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-2xs gap-1 py-0 px-2 font-medium">
            <ShieldCheck className="w-3 h-3 text-emerald-600" aria-hidden="true" />
            <span>Low Risk</span>
          </Badge>
        );
      case "Medium":
        return (
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-2xs gap-1 py-0 px-2 font-medium">
            <AlertCircle className="w-3 h-3 text-amber-600" aria-hidden="true" />
            <span>Medium Risk</span>
          </Badge>
        );
      case "High":
        return (
          <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-2xs gap-1 py-0 px-2 font-medium">
            <AlertTriangle className="w-3 h-3 text-rose-600" aria-hidden="true" />
            <span>High Risk</span>
          </Badge>
        );
      default:
        return null;
    }
  };

  const isEmergency = Boolean(message.metadata?.emergency);

  return (
    <div
      className={cn(
        "flex w-full gap-3 py-2 animate-in fade-in slide-in-from-bottom-1 duration-200",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
          <Heart className="w-4 h-4 text-primary" aria-hidden="true" />
        </div>
      )}

      <div
        className={cn(
          "relative group max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-2xs transition-all",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-xs"
            : isEmergency
            ? "bg-rose-500/10 border border-rose-500/40 rounded-tl-xs"
            : "bg-card border border-border/70 rounded-tl-xs"
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-current/10">
          <span className="text-xs font-semibold opacity-90">
            {isUser ? "You" : "Health Companion"}
          </span>

          <div className="flex items-center gap-2">
            {!isUser && renderRiskBadge(message.metadata?.risk_level)}
            {!isUser && (
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy message"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-primary rounded text-muted-foreground"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Content safely rendered as plain text with preserved whitespace */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-normal">
          {message.content}
        </p>

        {/* Optional Extracted Symptoms Tags */}
        {!isUser && message.metadata?.extracted?.symptoms && message.metadata.extracted.symptoms.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border/40 flex flex-wrap items-center gap-1.5 text-2xs">
            <span className="text-muted-foreground font-medium">Noted symptoms:</span>
            {message.metadata.extracted.symptoms.map((symptom, idx) => (
              <span
                key={`${symptom}-${idx}`}
                className="bg-muted px-2 py-0.5 rounded-full text-foreground/80 font-medium"
              >
                {symptom}
              </span>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-muted border border-border/60 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
          <User className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};
