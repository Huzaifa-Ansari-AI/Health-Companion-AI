import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, CornerDownLeft } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isEmergencyActive?: boolean;
}

const MAX_CHAR_COUNT = 2000;

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Describe your symptoms, how long you've felt them, or lifestyle habits...",
  isEmergencyActive = false,
}) => {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height based on content up to 160px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [content]);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed);
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const remainingChars = MAX_CHAR_COUNT - content.length;
  const isNearLimit = remainingChars <= 200;

  return (
    <div className="w-full bg-card border-t border-border/70 p-3 sm:p-4 transition-colors">
      {isEmergencyActive && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
          <span>⚠️ Emergency advice displayed above. If in immediate danger, please dial 911.</span>
        </div>
      )}

      <div className="relative flex flex-col rounded-2xl border border-input/80 bg-background shadow-xs focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CHAR_COUNT))}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          aria-label="Type your health symptoms"
          className="w-full resize-none border-0 bg-transparent px-4 pt-3 pb-8 text-sm focus:outline-hidden placeholder:text-muted-foreground/70 min-h-[44px] max-h-[160px] leading-relaxed"
        />

        <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-border/20">
          <span
            className={`text-2xs font-mono transition-colors ${
              isNearLimit ? "text-amber-600 font-bold" : "text-muted-foreground/60"
            }`}
          >
            {content.length}/{MAX_CHAR_COUNT}
          </span>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-2xs text-muted-foreground/70">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-3xs font-mono border">Enter</kbd> to send,
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-3xs font-mono border">Shift + Enter</kbd> for newline
            </span>

            <Button
              type="button"
              size="sm"
              disabled={disabled || !content.trim()}
              onClick={handleSend}
              className="h-8 px-3 rounded-xl gap-1.5 font-medium shadow-2xs"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
