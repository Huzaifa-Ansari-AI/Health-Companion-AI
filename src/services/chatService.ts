import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ChatSession, ChatMessage, ChatRole, RiskLevel } from "@/types/chat";

const DEMO_SESSIONS_KEY = "healthai_demo_chat_sessions";
const DEMO_MESSAGES_KEY = "healthai_demo_chat_messages";

const DEFAULT_DEMO_SESSION_ID = "demo-session-default";

const INITIAL_DEMO_SESSIONS: ChatSession[] = [
  {
    id: DEFAULT_DEMO_SESSION_ID,
    user_id: "demo-user-id",
    title: "General Wellness Check-in",
    status: "active",
    risk_level: "Low",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_DEMO_MESSAGES: ChatMessage[] = [
  {
    id: "demo-msg-1",
    session_id: DEFAULT_DEMO_SESSION_ID,
    user_id: "demo-user-id",
    role: "assistant",
    content: "Hello! I am your AI Health & Wellness Companion. I can help explore your symptoms and suggest practical lifestyle steps. Remember: I am an AI, not a doctor. How are you feeling today?",
    metadata: {
      risk_level: "Low",
      suggested_replies: ["Frequent headaches", "Poor sleep quality", "Occasional fatigue", "Digestive discomfort"],
    },
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

function getDemoSessions(): ChatSession[] {
  const raw = localStorage.getItem(DEMO_SESSIONS_KEY);
  if (!raw) {
    localStorage.setItem(DEMO_SESSIONS_KEY, JSON.stringify(INITIAL_DEMO_SESSIONS));
    return INITIAL_DEMO_SESSIONS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_SESSIONS;
  }
}

function setDemoSessions(sessions: ChatSession[]): void {
  localStorage.setItem(DEMO_SESSIONS_KEY, JSON.stringify(sessions));
}

function getDemoMessages(): ChatMessage[] {
  const raw = localStorage.getItem(DEMO_MESSAGES_KEY);
  if (!raw) {
    localStorage.setItem(DEMO_MESSAGES_KEY, JSON.stringify(INITIAL_DEMO_MESSAGES));
    return INITIAL_DEMO_MESSAGES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_MESSAGES;
  }
}

function setDemoMessages(messages: ChatMessage[]): void {
  localStorage.setItem(DEMO_MESSAGES_KEY, JSON.stringify(messages));
}

/**
 * Creates a new chat session.
 */
export async function createChatSession(
  userId: string,
  title = "New Health Consultation",
  isDemo = false
): Promise<ChatSession> {
  if (isDemo || !isSupabaseConfigured) {
    const newSession: ChatSession = {
      id: `demo-session-${Date.now()}`,
      user_id: userId,
      title,
      status: "active",
      risk_level: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const current = getDemoSessions();
    setDemoSessions([newSession, ...current]);
    return newSession;
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert([
      {
        user_id: userId,
        title,
        status: "active",
        risk_level: null,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ChatSession;
}

/**
 * Lists all chat sessions for a specific user, sorted newest first.
 */
export async function listChatSessions(
  userId: string,
  isDemo = false
): Promise<ChatSession[]> {
  if (isDemo || !isSupabaseConfigured) {
    const sessions = getDemoSessions();
    return sessions.filter((s) => s.user_id === userId || userId === "demo-user-id");
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as ChatSession[];
}

/**
 * Retrieves a single chat session by ID.
 */
export async function getChatSession(
  sessionId: string,
  userId: string,
  isDemo = false
): Promise<ChatSession | null> {
  if (isDemo || !isSupabaseConfigured) {
    const sessions = getDemoSessions();
    return sessions.find((s) => s.id === sessionId) || null;
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ChatSession) || null;
}

/**
 * Updates a chat session (e.g. title, risk_level, status).
 */
export async function updateChatSession(
  sessionId: string,
  updates: Partial<Pick<ChatSession, "title" | "status" | "risk_level">>,
  isDemo = false
): Promise<ChatSession> {
  const now = new Date().toISOString();

  if (isDemo || !isSupabaseConfigured) {
    const sessions = getDemoSessions();
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index === -1) {
      throw new Error("Chat session not found");
    }
    const updated: ChatSession = {
      ...sessions[index],
      ...updates,
      updated_at: now,
    };
    sessions[index] = updated;
    setDemoSessions([...sessions]);
    return updated;
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .update({
      ...updates,
      updated_at: now,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ChatSession;
}

/**
 * Deletes a chat session (and cascading messages via FK/RLS).
 */
export async function deleteChatSession(
  sessionId: string,
  isDemo = false
): Promise<void> {
  if (isDemo || !isSupabaseConfigured) {
    const sessions = getDemoSessions().filter((s) => s.id !== sessionId);
    setDemoSessions(sessions);
    const messages = getDemoMessages().filter((m) => m.session_id !== sessionId);
    setDemoMessages(messages);
    return;
  }

  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    throw error;
  }
}

/**
 * Loads all messages for a specific session, sorted chronologically.
 */
export async function loadChatMessages(
  sessionId: string,
  isDemo = false
): Promise<ChatMessage[]> {
  if (isDemo || !isSupabaseConfigured) {
    const messages = getDemoMessages();
    return messages.filter((m) => m.session_id === sessionId);
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []) as ChatMessage[];
}

/**
 * Saves a new chat message to a session.
 */
export async function saveChatMessage(
  message: {
    session_id: string;
    user_id: string;
    role: ChatRole;
    content: string;
    metadata?: ChatMessage["metadata"];
  },
  isDemo = false
): Promise<ChatMessage> {
  const fullMessage: ChatMessage = {
    ...message,
    id: isDemo || !isSupabaseConfigured ? `demo-msg-${Date.now()}` : "",
    created_at: new Date().toISOString(),
  };

  if (isDemo || !isSupabaseConfigured) {
    const current = getDemoMessages();
    setDemoMessages([...current, fullMessage]);
    return fullMessage;
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert([
      {
        session_id: message.session_id,
        user_id: message.user_id,
        role: message.role,
        content: message.content,
        metadata: message.metadata || {},
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ChatMessage;
}
