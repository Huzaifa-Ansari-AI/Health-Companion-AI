import React, { useState } from "react";
import { ChatSession } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionListProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  disabled?: boolean;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  disabled = false,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const startEditing = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const saveEdit = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const trimmed = editTitle.trim();
    if (trimmed) {
      onRenameSession(sessionId, trimmed);
    }
    setEditingId(null);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const renderRiskIndicator = (risk: ChatSession["risk_level"]) => {
    if (!risk) return null;
    switch (risk) {
      case "Low":
        return (
          <Badge variant="outline" className="text-3xs py-0 px-1.5 border-emerald-500/30 text-emerald-600 gap-0.5">
            <ShieldCheck className="w-2.5 h-2.5" />
            <span>Low</span>
          </Badge>
        );
      case "Medium":
        return (
          <Badge variant="outline" className="text-3xs py-0 px-1.5 border-amber-500/30 text-amber-600 gap-0.5">
            <AlertCircle className="w-2.5 h-2.5" />
            <span>Med</span>
          </Badge>
        );
      case "High":
        return (
          <Badge variant="outline" className="text-3xs py-0 px-1.5 border-rose-500/30 text-rose-600 gap-0.5">
            <AlertTriangle className="w-2.5 h-2.5" />
            <span>High</span>
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-xs border-r border-border/70 p-3 select-none">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
          Consultations
        </h2>
        <Button
          type="button"
          size="sm"
          onClick={onNewSession}
          disabled={disabled}
          className="h-8 gap-1.5 rounded-xl px-3 font-medium text-xs shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-1 no-scrollbar">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No consultations yet. Click &quot;New Chat&quot; to begin.
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const isEditing = editingId === session.id;

            return (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectSession(session.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectSession(session.id);
                  }
                }}
                className={cn(
                  "group relative flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left text-xs transition-all cursor-pointer border",
                  isActive
                    ? "bg-primary/10 border-primary/30 text-primary font-medium shadow-2xs"
                    : "border-transparent hover:bg-muted/60 text-foreground/80 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />

                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-background border border-input rounded px-1.5 py-0.5 text-xs focus:outline-hidden"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate block flex-1">{session.title}</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isEditing && renderRiskIndicator(session.risk_level)}

                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => saveEdit(e, session.id)}
                        className="p-1 hover:text-primary rounded"
                        title="Save"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="p-1 hover:text-muted-foreground rounded"
                        title="Cancel"
                      >
                        <X className="w-3 h-3 text-rose-500" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => startEditing(e, session)}
                        className="p-1 hover:text-primary text-muted-foreground rounded"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="p-1 hover:text-rose-600 text-muted-foreground rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
