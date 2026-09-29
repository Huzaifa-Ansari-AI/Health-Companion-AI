import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  listChatSessions,
  createChatSession,
  loadChatMessages,
  deleteChatSession,
  updateChatSession,
  sendChatMessage,
} from "@/services/chatService";
import { ChatSession, ChatMessage } from "@/types/chat";
import { DisclaimerBar } from "@/components/chat/DisclaimerBar";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { QuickReplyChips } from "@/components/chat/QuickReplyChips";
import { SessionList } from "@/components/chat/SessionList";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Heart,
  ArrowLeft,
  Menu,
  FileText,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Chat: React.FC = () => {
  const { user, isDemo } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    searchParams.get("session") || null
  );
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // 1. Query: List Sessions
  const {
    data: sessions = [],
    isLoading: isSessionsLoading,
  } = useQuery<ChatSession[]>({
    queryKey: ["chat-sessions", user?.id, isDemo],
    queryFn: async () => {
      if (!user) return [];
      return listChatSessions(user.id, isDemo);
    },
    enabled: Boolean(user),
  });

  // Automatically select first session or trigger creation if empty
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
      setSearchParams({ session: sessions[0].id });
    }
  }, [sessions, activeSessionId, setSearchParams]);

  // 2. Query: Load Messages for active session
  const {
    data: messages = [],
    isLoading: isMessagesLoading,
  } = useQuery<ChatMessage[]>({
    queryKey: ["chat-messages", activeSessionId, isDemo],
    queryFn: async () => {
      if (!activeSessionId) return [];
      return loadChatMessages(activeSessionId, isDemo);
    },
    enabled: Boolean(activeSessionId),
  });

  // 3. Mutation: Create Session
  const createSessionMutation = useMutation({
    mutationFn: async (title?: string) => {
      if (!user) throw new Error("User not authenticated");
      return createChatSession(user.id, title || "New Health Consultation", isDemo);
    },
    onSuccess: (newSession) => {
      queryClient.setQueryData<ChatSession[]>(["chat-sessions", user?.id, isDemo], (old = []) => [
        newSession,
        ...old,
      ]);
      setActiveSessionId(newSession.id);
      setSearchParams({ session: newSession.id });
      setMobileDrawerOpen(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to create session";
      toast({ title: "Session error", description: message, variant: "destructive" });
    },
  });

  // 4. Mutation: Delete Session
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await deleteChatSession(sessionId, isDemo);
      return sessionId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<ChatSession[]>(["chat-sessions", user?.id, isDemo], (old = []) =>
        old.filter((s) => s.id !== deletedId)
      );
      if (activeSessionId === deletedId) {
        const remaining = sessions.filter((s) => s.id !== deletedId);
        const nextId = remaining.length > 0 ? remaining[0].id : null;
        setActiveSessionId(nextId);
        if (nextId) setSearchParams({ session: nextId });
        else setSearchParams({});
      }
      toast({ title: "Consultation deleted" });
    },
  });

  // 5. Mutation: Rename Session
  const renameSessionMutation = useMutation({
    mutationFn: async ({ sessionId, newTitle }: { sessionId: string; newTitle: string }) => {
      return updateChatSession(sessionId, { title: newTitle }, isDemo);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ChatSession[]>(["chat-sessions", user?.id, isDemo], (old = []) =>
        old.map((s) => (s.id === updated.id ? updated : s))
      );
    },
  });

  // 6. Mutation: Send Message
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error("Please log in to chat");

      let currentSessionId = activeSessionId;
      if (!currentSessionId) {
        // Auto-create session if none active
        const created = await createChatSession(user.id, "Health Consultation", isDemo);
        currentSessionId = created.id;
        setActiveSessionId(created.id);
        setSearchParams({ session: created.id });
      }

      setLastError(null);
      setLastFailedMessage(null);
      return sendChatMessage(currentSessionId, user.id, text, isDemo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", activeSessionId, isDemo] });
      queryClient.invalidateQueries({ queryKey: ["chat-sessions", user?.id, isDemo] });
    },
    onError: (err: unknown, variables: string) => {
      const message = err instanceof Error ? err.message : "Failed to send message";
      setLastError(message);
      setLastFailedMessage(variables);
      toast({ title: "Failed to send", description: message, variant: "destructive" });
    },
  });

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setSearchParams({ session: sessionId });
    setMobileDrawerOpen(false);
    setLastError(null);
  };

  const handleNewSession = () => {
    createSessionMutation.mutate("New Health Consultation");
  };

  const handleSendMessage = (text: string) => {
    sendMessageMutation.mutate(text);
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      sendMessageMutation.mutate(lastFailedMessage);
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // Check if an emergency warning was detected in the active consultation
  const isEmergencyActive =
    activeSession?.risk_level === "High" &&
    messages.some((m) => m.role === "assistant" && m.metadata?.emergency);

  // Last assistant reply suggestion chips
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const suggestions = lastAssistantMessage?.metadata?.suggested_replies;

  return (
    <div className="flex h-screen w-full flex-col bg-muted/20 overflow-hidden">
      {/* 1. Medical Disclaimer Bar (Visible at top) */}
      <DisclaimerBar />

      {/* 2. Top Chat Header */}
      <header className="h-14 border-b border-border/70 bg-card/80 backdrop-blur-xs px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground -ml-1 rounded-xl"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Dashboard</span>
          </Button>

          <div className="h-4 w-px bg-border/60 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Heart className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-semibold truncate max-w-[180px] sm:max-w-[320px]">
                {activeSession ? activeSession.title : "Health Consultation"}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Generate Summary CTA for Phase 4 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast({
                title: "Report Generation Ready",
                description: "Review and save your Health Assessment Summary.",
              });
            }}
            disabled={messages.length < 2}
            className="h-8 gap-1.5 text-xs rounded-xl shadow-2xs font-normal"
          >
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Health Summary</span>
          </Button>

          {/* Mobile Drawer Trigger for Sessions */}
          <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-xl md:hidden shrink-0"
                aria-label="Open sessions sidebar"
              >
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SessionList
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelectSession={handleSelectSession}
                onNewSession={handleNewSession}
                onDeleteSession={(id) => deleteSessionMutation.mutate(id)}
                onRenameSession={(id, title) => renameSessionMutation.mutate({ sessionId: id, newTitle: title })}
                disabled={createSessionMutation.isPending}
              />
            </SheetContent>
          </Sheet>

          {/* New Chat desktop shortcut */}
          <Button
            size="sm"
            onClick={handleNewSession}
            disabled={createSessionMutation.isPending}
            className="h-8 gap-1.5 rounded-xl px-2.5 text-xs shadow-2xs hidden md:flex font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </Button>
        </div>
      </header>

      {/* 3. Main Body: Sidebar + Chat Stream */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar (hidden on mobile) */}
        <aside className="hidden md:block w-72 h-full shrink-0">
          <SessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={(id) => deleteSessionMutation.mutate(id)}
            onRenameSession={(id, title) => renameSessionMutation.mutate({ sessionId: id, newTitle: title })}
            disabled={createSessionMutation.isPending || isSessionsLoading}
          />
        </aside>

        {/* Chat Window */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
          <MessageList
            messages={messages}
            isLoading={sendMessageMutation.isPending || (isMessagesLoading && messages.length === 0)}
            error={lastError}
            onRetry={lastFailedMessage ? handleRetry : undefined}
            isEmergencyActive={isEmergencyActive}
            emergencyCategory="Acute Symptoms"
          />

          {/* Quick-Reply Chips */}
          <div className="px-3 bg-background/80 backdrop-blur-xs border-t border-border/30">
            <QuickReplyChips
              suggestions={suggestions}
              onSelect={handleSendMessage}
              disabled={sendMessageMutation.isPending || isEmergencyActive}
            />
          </div>

          {/* Input Box */}
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={sendMessageMutation.isPending}
            isEmergencyActive={isEmergencyActive}
          />
        </main>
      </div>
    </div>
  );
};

export default Chat;
