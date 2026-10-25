import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ChatSession, ChatMessage, ChatRole, RiskLevel, ChatConsultResponse, HealthAssessmentSummary } from "@/types/chat";
import { detectEmergency, EMERGENCY_DISCLAIMER_MESSAGE } from "@/lib/emergencyDetector";
import { hasConsent } from "./privacyService";
import { parseEdgeFunctionError, getCategoryDetails, AiErrorCategory } from "./aiErrorHelper";

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

/**
 * Sends a message in a chat session.
 * Evaluates emergency detection FIRST. In Demo mode, returns safe mock guidance.
 * In production, invokes the Supabase Edge Function 'chat-consult'.
 */
const GREETING_OR_COURTESY_PATTERNS = [
  /^(?:assalam|as-salam|salaam|walaikum|wa-alaikum)\b/i,
  /\b(?:assalam\s*o\s*alaikum|assalamualaikum)\b/i,
  /^(?:hello|hi|hey|greetings|dear)\b/i,
  /\b(?:good\s*(?:morning|afternoon|evening|day|night))\b/i,
  /\b(?:my\s*name\s*is|i\s*am\s+[a-z]+)\b/i,
  /\b(?:how\s*(?:are\s*you|r\s*u))\b/i,
  /\b(?:shukriya|thanks|thank\s*you)\b/i,
  /\b(?:nice\s*to\s*meet\s*you)\b/i,
  /\b(?:kya\s*haal\s*hai|kaise\s*ho)\b/i,
];

export function isGreetingOrCourtesy(text: string): boolean {
  if (!text || typeof text !== "string") return true;
  const clean = text.trim();
  if (clean.length < 2) return true;
  return GREETING_OR_COURTESY_PATTERNS.some((pattern) => pattern.test(clean));
}

const SUGGESTION_CHIP_PATTERNS = [
  /^(?:check\s+a\s+symptom|advice\s+on\s+sleep|help\s+with\s+stress|a\s+bit\s+of\s+both)$/i,
  /^(?:frequent\s+headaches|sleep\s+issues|digestive\s+problems|fatigue|stress\s+and\s+anxiety)$/i,
  /^(?:i\s+want\s+advice\s+on\s+sleep\s+or\s+stress|general\s+wellness\s+inquiry)$/i,
  /^(?:who\s+are\s+you|what\s+is\s+my\s+name|what\s+is\s+your\s+name|what\s+can\s+you\s+do|tell\s+me\s+about\s+yourself(?:\s+and\s+your\s+features)?)$/i,
];

export function isSuggestionChipOrMetaQuery(text: string): boolean {
  if (!text || typeof text !== "string") return true;
  const clean = text.trim();
  return SUGGESTION_CHIP_PATTERNS.some((pattern) => pattern.test(clean));
}

export function isNonSymptomMessage(text: string): boolean {
  return isGreetingOrCourtesy(text) || isSuggestionChipOrMetaQuery(text);
}


export async function sendChatMessage(
  sessionId: string,
  userId: string,
  content: string,
  isDemo = false
): Promise<ChatConsultResponse> {
  const trimmed = content.trim().slice(0, 2000);
  if (!trimmed) {
    throw new Error("Message cannot be empty");
  }

  // 1. Client-Side Emergency Check
  const emergencyCheck = detectEmergency(trimmed);
  if (emergencyCheck.isEmergency) {
    const isTerminalDistress = emergencyCheck.matchedCategory === "Critical/Terminal Distress & Severe Oncology";

    const emergencyResponse: ChatConsultResponse = {
      reply: emergencyCheck.emergencyAdvice || EMERGENCY_DISCLAIMER_MESSAGE,
      suggested_title: isTerminalDistress ? "Oncology & Palliative Care" : "Emergency Consultation",
      risk_level: isTerminalDistress ? null : "High",
      emergency: true,
      suggested_replies: isTerminalDistress
        ? [
            "How can palliative care help?",
            "Questions for the oncology team",
            "Managing daily comfort & pain",
          ]
        : [
            "I am calling emergency services",
            "I am heading to the nearest ER",
            "What can I do while waiting?",
          ],
      extracted: {
        symptoms: [emergencyCheck.triggerPhrase || (isTerminalDistress ? "Advanced oncology / serious illness" : "emergency symptom")],
        duration: isTerminalDistress ? "Advanced / Ongoing" : "Immediate",
        intensity: "Severe",
        lifestyle: isTerminalDistress ? "Palliative and oncology team support" : "",
      },
    };

    // Save user message
    await saveChatMessage(
      {
        session_id: sessionId,
        user_id: userId,
        role: "user",
        content: trimmed,
      },
      isDemo
    );

    // Save assistant emergency message
    await saveChatMessage(
      {
        session_id: sessionId,
        user_id: userId,
        role: "assistant",
        content: emergencyResponse.reply,
        metadata: {
          emergency: true,
          risk_level: emergencyResponse.risk_level,
          suggested_replies: emergencyResponse.suggested_replies,
          extracted: emergencyResponse.extracted,
        },
      },
      isDemo
    );

    // Elevate session risk level to High for acute emergencies, or update title for terminal distress
    if (!isTerminalDistress) {
      await updateChatSession(sessionId, { risk_level: "High" }, isDemo);
    } else {
      await updateChatSession(sessionId, { title: "Oncology & Palliative Care" }, isDemo);
    }

    return emergencyResponse;
  }

  // 2. Demo Mode Simulation (No real external AI calls, safe structured guidance)
  if (isDemo || !isSupabaseConfigured) {
    const isPersonalized = await hasConsent(userId, "ai_profile_context", isDemo).catch(() => false);

    await saveChatMessage(
      {
        session_id: sessionId,
        user_id: userId,
        role: "user",
        content: trimmed,
      },
      isDemo
    );

    const isNonSymptom = isNonSymptomMessage(trimmed);
    const demoSymptoms = isNonSymptom ? [] : [trimmed.slice(0, 30)];
    const suggestedTitle = isNonSymptom
      ? "General Wellness Consultation"
      : `${trimmed.slice(0, 24).replace(/[^\w\s]/g, "").trim()} Consultation`;

    const replyPrefix = isPersonalized
      ? "[Demo AI - Personalized with your health profile] "
      : "[Demo AI] ";

    const replyText = isNonSymptom
      ? `${replyPrefix}Hello! Welcome to Afiyat AI. How can I assist with your health and wellness goals today?`
      : `${replyPrefix}Thank you for describing your symptoms. In this demo mode, I can provide general lifestyle wellness guidance: remember to maintain steady hydration, prioritize restful sleep, and avoid strenuous strain. How long have you been experiencing this?`;

    const mockResponse: ChatConsultResponse = {
      reply: replyText,
      suggested_title: suggestedTitle,
      risk_level: isNonSymptom ? null : "Low",
      emergency: false,
      suggested_replies: isNonSymptom
        ? ["I have a fever", "Frequent headaches", "Poor sleep quality", "Digestive discomfort"]
        : ["Started today", "A few days", "Mild intensity", "Associated with stress"],
      extracted: {
        symptoms: demoSymptoms,
        duration: isNonSymptom ? "" : "recent",
        intensity: isNonSymptom ? "" : "mild",
        lifestyle: "hydration and rest recommended",
      },
      personalized: isPersonalized,
    };

    await saveChatMessage(
      {
        session_id: sessionId,
        user_id: userId,
        role: "assistant",
        content: mockResponse.reply,
        metadata: {
          emergency: false,
          risk_level: mockResponse.risk_level,
          suggested_replies: mockResponse.suggested_replies,
          extracted: mockResponse.extracted,
          personalized: isPersonalized,
        },
      },
      isDemo
    );

    if (mockResponse.risk_level) {
      await updateChatSession(sessionId, { risk_level: mockResponse.risk_level }, isDemo);
    }

    const existingSessions = getDemoSessions();
    const cur = existingSessions.find((s) => s.id === sessionId);
    if (cur && (cur.title === "New Health Consultation" || cur.title === "New Consultation")) {
      await updateChatSession(sessionId, { title: suggestedTitle }, isDemo);
    }

    return mockResponse;
  }

  // 3. Supabase Edge Function: chat-consult (throws explicit error on failure, no silent fake mock)
  try {
    const { data, error } = await supabase.functions.invoke("chat-consult", {
      body: {
        session_id: sessionId,
        message: trimmed,
      },
    });

    if (error) {
      const parsed = await parseEdgeFunctionError(error, data);
      throw new Error(`AI is temporarily unavailable: ${parsed.userMessage}`);
    }

    if (data?.error) {
      const parsed = await parseEdgeFunctionError(null, data);
      throw new Error(`AI is temporarily unavailable: ${parsed.userMessage}`);
    }

    if (!data || !data.reply) {
      throw new Error("AI is temporarily unavailable: empty response from consultation service.");
    }

    return data as ChatConsultResponse;
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to communicate with AI consultation engine";
    throw new Error(message);
  }
}

export interface AiDiagnosticResult {
  ok: boolean;
  provider?: string;
  model?: string;
  latencyMs?: number;
  message: string;
  category?: AiErrorCategory;
  resolution?: string;
  details?: string;
}

/**
 * Runs a server-side connectivity diagnostic test against the AI provider.
 */
export async function checkAiHealth(isDemo = false): Promise<AiDiagnosticResult> {
  if (isDemo) {
    return {
      ok: true,
      provider: "demo-simulator",
      model: "mock-wellness-engine",
      latencyMs: 10,
      message: "Running in Demo Mode: Local simulated guidance is active.",
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("chat-consult", {
      body: { action: "diagnose" },
    });

    if (error) {
      const parsed = await parseEdgeFunctionError(error, data);
      return {
        ok: false,
        provider: "gemini",
        model: parsed.model || "gemini-3.5-flash",
        latencyMs: parsed.latencyMs || 0,
        category: parsed.category,
        message: parsed.userMessage,
        resolution: parsed.resolution,
        details: parsed.details,
      };
    }

    if (data?.ok === false) {
      const category = data.category || "internal";
      const catDetails = getCategoryDetails(category, data.model);
      return {
        ok: false,
        provider: data.provider || "gemini",
        model: data.model || "gemini-3.5-flash",
        latencyMs: data.latencyMs || 0,
        category,
        message: data.message || catDetails.userMessage,
        resolution: data.resolution || catDetails.resolution,
        details: data.details,
      };
    }

    return {
      ok: true,
      provider: data?.provider || "gemini",
      model: data?.model || "gemini-3.5-flash",
      latencyMs: data?.latencyMs || 0,
      message: data?.message || "AI connection verified successfully.",
    };
  } catch (err: unknown) {
    const parsed = await parseEdgeFunctionError(err);
    return {
      ok: false,
      provider: "gemini",
      model: parsed.model || "gemini-1.5-flash",
      latencyMs: parsed.latencyMs || 0,
      category: parsed.category,
      message: parsed.userMessage,
      resolution: parsed.resolution,
    };
  }
}

/**
 * Synthesizes a structured Health Assessment Summary from a consultation session.
 * In production, requests AI synthesis from Supabase Edge Function 'chat-consult' (action: summarize).
 * Never classifies chips or greetings as symptoms, and handles insufficient symptom input cleanly.
 */
export async function generateHealthSummary(
  sessionId: string,
  userId: string,
  isDemo = false
): Promise<HealthAssessmentSummary> {
  // Production LLM Synthesis Path
  if (!isDemo && isSupabaseConfigured) {
    const { data, error } = await supabase.functions.invoke("chat-consult", {
      body: {
        action: "summarize",
        session_id: sessionId,
      },
    });

    if (error) {
      const parsed = await parseEdgeFunctionError(error, data);
      throw new Error(`Health summary generation failed: ${parsed.userMessage}`);
    }

    if (data?.error) {
      const parsed = await parseEdgeFunctionError(null, data);
      throw new Error(`Health summary generation failed: ${parsed.userMessage}`);
    }

    if (!data) {
      throw new Error("Empty response received from health summary generator.");
    }

    const summaryData = data as HealthAssessmentSummary;
    const hasSufficient =
      summaryData.has_sufficient_info ?? (summaryData.symptoms && summaryData.symptoms.length > 0);

    return {
      ...summaryData,
      has_sufficient_info: hasSufficient,
      risk_level: hasSufficient ? summaryData.risk_level : null,
      disclaimer:
        summaryData.disclaimer ||
        "This is not a medical diagnosis. It is general wellness guidance. Please consult a qualified healthcare professional.",
    };
  }

  // Demo / Offline Simulation Path
  const messages = await loadChatMessages(sessionId, true);
  const session = await getChatSession(sessionId, userId, true);

  const userMessages = messages.filter((m) => m.role === "user");
  const assistantMessages = messages.filter((m) => m.role === "assistant");

  // Collect genuine symptoms extracted by assistant, ignoring chips & greetings
  const symptomsSet = new Set<string>();
  let duration = "";
  let intensity = "";
  const lifestyleFactorsSet = new Set<string>();

  for (const msg of [...assistantMessages].reverse()) {
    if (msg.metadata?.extracted?.symptoms) {
      msg.metadata.extracted.symptoms.forEach((s) => {
        if (s && s.trim() && !isNonSymptomMessage(s)) {
          symptomsSet.add(s.trim());
        }
      });
    }
    if (msg.metadata?.extracted?.duration && !duration) {
      duration = msg.metadata.extracted.duration;
    }
    if (msg.metadata?.extracted?.intensity && !intensity) {
      intensity = msg.metadata.extracted.intensity;
    }
    if (msg.metadata?.extracted?.lifestyle) {
      lifestyleFactorsSet.add(msg.metadata.extracted.lifestyle);
    }
  }

  // Check for substantive user message that isn't a chip, greeting, or meta inquiry
  const substantiveUserMsgs = userMessages.filter(
    (m) => m.content && m.content.trim().length > 3 && !isNonSymptomMessage(m.content)
  );

  if (symptomsSet.size === 0 && substantiveUserMsgs.length > 0) {
    symptomsSet.add(substantiveUserMsgs[0].content.slice(0, 50));
  }

  // If still no real symptoms discussed, return insufficient information state
  if (symptomsSet.size === 0) {
    return {
      has_sufficient_info: false,
      symptoms: [],
      duration: "",
      intensity: "",
      lifestyle_factors: [],
      risk_level: null,
      summary:
        "No specific symptoms were reported during this consultation. Tell the AI more about your symptoms to generate a summary.",
      recommendations: [
        "Describe specific physical symptoms you are experiencing, such as headache, fever, or joint pain.",
        "Mention how long you have felt them and their intensity (mild, moderate, or severe).",
      ],
      doctor_questions: [],
      disclaimer:
        "This is not a medical diagnosis. It is general wellness guidance. Please consult a qualified healthcare professional.",
    };
  }

  const symptomsList = Array.from(symptomsSet);
  const risk_level: RiskLevel | null = session?.risk_level || "Low";

  const recommendations: string[] = [
    "Maintain consistent hydration with at least 2 liters of water daily.",
    "Prioritize 7-9 hours of restful, uninterrupted sleep nightly.",
    "Avoid strenuous physical exertion while symptoms are active.",
  ];

  if (risk_level === "High" || risk_level === "Medium") {
    recommendations.unshift(
      "Schedule a comprehensive medical evaluation with your primary care physician."
    );
  }

  const doctor_questions: string[] = [
    "How long do these symptoms typically take to resolve on their own?",
    "Are there any specific diagnostic tests or lab screenings you recommend for my situation?",
    "What specific warning signs should prompt me to seek urgent emergency care?",
    "Could my current sleep patterns or stress levels be contributing to this?",
  ];

  const summary = `Based on your consultation, you reported experiencing ${symptomsList.join(", ")}${
    duration ? ` for approximately ${duration}` : ""
  }${intensity ? ` with ${intensity} intensity` : ""}. Your overall wellness risk indicator is categorized as ${risk_level}.`;

  return {
    has_sufficient_info: true,
    symptoms: symptomsList,
    duration: duration || "Recent onset",
    intensity: intensity || "Mild to moderate",
    lifestyle_factors: Array.from(lifestyleFactorsSet),
    risk_level,
    summary,
    recommendations,
    doctor_questions,
    disclaimer:
      "This is not a medical diagnosis. It is general wellness guidance. Please consult a qualified healthcare professional.",
  };
}



