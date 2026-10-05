import React, { useEffect, useRef } from "react";
import { ChatMessage } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { EmergencyBanner } from "./EmergencyBanner";
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  isEmergencyActive?: boolean;
  emergencyCategory?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  error,
  onRetry,
  isEmergencyActive = false,
  emergencyCategory,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom smoothly on message updates
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bottomRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [messages, isLoading]);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-atomic="false"
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar"
    >
      {/* Prominent Emergency Warning if triggered */}
      {isEmergencyActive && (
        <div className="sticky top-0 z-20 pb-2">
          <EmergencyBanner category={emergencyCategory} />
        </div>
      )}

      {/* Empty State */}
      {messages.length === 0 && !isLoading && (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground max-w-md mx-auto my-auto">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3 shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-foreground text-base">Your Health Consultation</h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            I am here to help you explore your symptoms and formulate clear wellness notes. Type a question or select a suggestion chip below.
          </p>
        </div>
      )}

      {/* Render Conversation Messages */}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Typing Indicator */}
      {isLoading && (
        <div className="py-2">
          <TypingIndicator />
        </div>
      )}

      {/* Error State with Retry Button */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs gap-3 my-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-7 px-2.5 text-xs gap-1 border-destructive/30 hover:bg-destructive/10 text-destructive"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </Button>
          )}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
