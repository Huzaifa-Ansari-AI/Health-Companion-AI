// Supabase Edge Function: chat-consult
// Milestone 1 - Interactive AI Symptom Consultation Chatbot Engine
// Enforces JWT verification, rate limiting, emergency detection, untrusted input sanitization,
// structured AI consultation, real-time connectivity diagnostics, and AI summary synthesis.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { detectEmergency, EMERGENCY_DISCLAIMER_MESSAGE } from "../_shared/emergencyDetector.ts";
import { buildConsultSystemPrompt } from "../_shared/prompts/consultPrompt.ts";
import {
  invokeLLM,
  invokeConsultSummary,
  LLMMessage,
  ValidatedConsultOutput,
  testAiConnection,
  AiServiceError,
} from "../_shared/aiAdapter.ts";
import { formatProfileContext } from "../_shared/profileContextBuilder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiting map: user_id -> timestamp array
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 25; // 25 requests per minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(userId, validTimestamps);
  return true;
}

serve(async (req: Request) => {
  // 1. CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. JWT Verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: "auth_invalid",
          category: "auth_invalid",
          message: "Missing authorization header",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "auth_invalid",
          category: "auth_invalid",
          message: "Unauthorized: Invalid or expired token",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse payload
    const body = await req.json().catch(() => ({}));

    // Diagnostic Action: allows verified users to test AI provider connectivity
    if (body?.action === "diagnose") {
      const diagnosticResult = await testAiConnection();
      return new Response(JSON.stringify(diagnosticResult), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate Limit Enforcement
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({
          error: "rate_limited",
          category: "rate_limited",
          message: "Rate limit exceeded. Please wait a minute before sending more messages.",
          retry_after: 60,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Summarize Action: Generates AI-synthesized Health Assessment Summary from consultation transcript
    if (body?.action === "summarize") {
      const sessionId = body?.session_id;
      if (!sessionId || typeof sessionId !== "string") {
        return new Response(
          JSON.stringify({
            error: "bad_request",
            category: "bad_request",
            message: "Invalid or missing session_id",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Fetch chat transcript for this session
      const { data: messages, error: msgErr } = await supabaseClient
        .from("chat_messages")
        .select("role, content, metadata, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (msgErr || !messages || messages.length === 0) {
        return new Response(
          JSON.stringify({
            has_sufficient_info: false,
            symptoms: [],
            duration: "",
            intensity: "",
            likely_conditions: [],
            lifestyle_factors: [],
            risk_level: null,
            summary: "No consultation messages found for this session.",
            recommendations: [],
            doctor_questions: [],
            red_flags: [],
            disclaimer:
              "This is not a medical diagnosis. It is general wellness guidance. Please consult a qualified healthcare professional.",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Non-symptom classifier for filtering greetings, chips, and meta questions
      const isNonSymptom = (text: string): boolean => {
        const clean = text.toLowerCase().trim();
        if (clean.length < 3) return true;
        const nonSymptomPatterns = [
          "hi",
          "hello",
          "hey",
          "assalam",
          "assalamualaikum",
          "aoa",
          "salam",
          "good morning",
          "good evening",
          "good afternoon",
          "thank you",
          "thanks",
          "shukriya",
          "who are you",
          "what is my name",
          "what is your name",
          "tell me about yourself",
          "tell me about yourself and your features",
          "what can you do",
          "help",
          "check a symptom",
          "advice on sleep",
          "help with stress",
          "a bit of both",
          "i want advice on sleep or stress",
          "frequent headaches",
          "sleep issues",
          "digestive problems",
          "fatigue",
          "stress and anxiety",
          "general wellness inquiry",
        ];
        return nonSymptomPatterns.some(
          (p) => clean === p || clean.startsWith(p + " ") || clean.endsWith(" " + p)
        );
      };

      const substantiveUserMsgs = messages.filter(
        (m: { role: string; content: string }) => m.role === "user" && !isNonSymptom(m.content)
      );

      // If user never described real symptoms, return insufficient information state
      if (substantiveUserMsgs.length === 0) {
        return new Response(
          JSON.stringify({
            has_sufficient_info: false,
            symptoms: [],
            duration: "",
            intensity: "",
            likely_conditions: [],
            lifestyle_factors: [],
            risk_level: null,
            summary:
              "No specific symptoms were reported during this consultation. Tell the AI more about your symptoms to generate a summary.",
            recommendations: [
              "Describe specific physical symptoms you are experiencing, such as headache, fever, or joint pain.",
              "Mention how long you have felt them and their intensity (mild, moderate, or severe).",
            ],
            doctor_questions: [],
            red_flags: [],
            disclaimer:
              "This is not a medical diagnosis. It is general wellness guidance. Please consult a qualified healthcare professional.",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Load profile context (if consent granted)
      let profileContextPrompt = "";
      try {
        const { data: consentRecords } = await supabaseClient
          .from("privacy_consents")
          .select("consent_type, granted")
          .eq("user_id", user.id)
          .eq("consent_type", "ai_profile_context")
          .order("created_at", { ascending: false })
          .limit(1);

        if (consentRecords && consentRecords[0]?.granted) {
          const [profileRes, allergiesRes, conditionsRes, medsRes, familyRes] =
            await Promise.all([
              supabaseClient
                .from("health_profiles")
                .select("age, gender, date_of_birth")
                .eq("user_id", user.id)
                .maybeSingle(),
              supabaseClient
                .from("profile_allergies")
                .select("name, severity")
                .eq("user_id", user.id),
              supabaseClient
                .from("profile_conditions")
                .select("name, status")
                .eq("user_id", user.id)
                .neq("status", "past"),
              supabaseClient
                .from("profile_medications")
                .select("name")
                .eq("user_id", user.id)
                .eq("is_current", true),
              supabaseClient
                .from("profile_family_history")
                .select("condition_name, relation")
                .eq("user_id", user.id),
            ]);

          profileContextPrompt = formatProfileContext({
            age: profileRes?.data?.age,
            gender: profileRes?.data?.gender,
            date_of_birth: profileRes?.data?.date_of_birth,
            allergies: allergiesRes?.data || [],
            conditions: conditionsRes?.data || [],
            medications: medsRes?.data || [],
            familyHistory: familyRes?.data || [],
          });
        }
      } catch {
        // Safe non-blocking fallback
      }

      const transcript = messages
        .map(
          (m: { role: string; content: string }) =>
            `${m.role === "user" ? "Patient" : "AI Assistant"}: ${m.content}`
        )
        .join("\n\n");

      const summaryOutput = await invokeConsultSummary(transcript, profileContextPrompt);

      return new Response(JSON.stringify(summaryOutput), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Request Payload Validation (Regular Chat Message)
    const sessionId = body?.session_id;
    const rawMessage = body?.message;

    if (!sessionId || typeof sessionId !== "string") {
      return new Response(
        JSON.stringify({
          error: "bad_request",
          category: "bad_request",
          message: "Invalid or missing session_id",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!rawMessage || typeof rawMessage !== "string") {
      return new Response(
        JSON.stringify({
          error: "bad_request",
          category: "bad_request",
          message: "Invalid or missing message",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Sanitize and limit input length (max 2000 characters)
    const sanitizedMessage = rawMessage.trim().slice(0, 2000);
    if (sanitizedMessage.length === 0) {
      return new Response(
        JSON.stringify({
          error: "bad_request",
          category: "bad_request",
          message: "Message cannot be empty",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Emergency Detection Layer (Evaluated BEFORE any LLM call)
    const emergencyCheck = detectEmergency(sanitizedMessage);

    if (emergencyCheck.isEmergency) {
      const isTerminalDistress =
        emergencyCheck.matchedCategory ===
        "Critical/Terminal Distress & Severe Oncology";

      const emergencyReply: ValidatedConsultOutput = {
        reply: emergencyCheck.emergencyAdvice || EMERGENCY_DISCLAIMER_MESSAGE,
        suggested_title: isTerminalDistress
          ? "Oncology & Palliative Care"
          : "Emergency Consultation",
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
          symptoms: [
            emergencyCheck.triggerPhrase ||
              (isTerminalDistress
                ? "Advanced oncology / serious illness"
                : "emergency symptom"),
          ],
          duration: isTerminalDistress ? "Advanced / Ongoing" : "Immediate",
          intensity: "Severe",
          lifestyle: isTerminalDistress
            ? "Palliative and oncology team support"
            : "",
        },
      };

      // Persist user and emergency assistant messages
      await supabaseClient.from("chat_messages").insert([
        {
          session_id: sessionId,
          user_id: user.id,
          role: "user",
          content: sanitizedMessage,
          metadata: {},
        },
        {
          session_id: sessionId,
          user_id: user.id,
          role: "assistant",
          content: emergencyReply.reply,
          metadata: {
            emergency: true,
            risk_level: emergencyReply.risk_level,
            suggested_replies: emergencyReply.suggested_replies,
            matched_category: emergencyCheck.matchedCategory,
          },
        },
      ]);

      // Elevate session risk level to High for acute emergencies, or update title for terminal distress
      if (!isTerminalDistress) {
        await supabaseClient
          .from("chat_sessions")
          .update({ risk_level: "High", updated_at: new Date().toISOString() })
          .eq("id", sessionId);
      } else {
        await supabaseClient
          .from("chat_sessions")
          .update({
            title: "Oncology & Palliative Care",
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId);
      }

      return new Response(JSON.stringify(emergencyReply), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Persist user message
    await supabaseClient.from("chat_messages").insert([
      {
        session_id: sessionId,
        user_id: user.id,
        role: "user",
        content: sanitizedMessage,
        metadata: {},
      },
    ]);

    // 7. Load rolling history for conversation context (up to 16 messages)
    const { data: previousMessages } = await supabaseClient
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(16);

    const rawHistory = previousMessages || [];
    let contextMessages: LLMMessage[] = [];

    if (rawHistory.length <= 8) {
      contextMessages = rawHistory.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    } else {
      const older = rawHistory.slice(0, rawHistory.length - 6);
      const recent = rawHistory.slice(rawHistory.length - 6);
      const condensedSummary = older
        .map(
          (m: { role: string; content: string }) =>
            `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 120)}`
        )
        .join(" | ");

      contextMessages = [
        {
          role: "user",
          content: `[Previous conversation summary: ${condensedSummary}]`,
        },
        {
          role: "assistant",
          content:
            "I understand the prior context of our consultation. Let's continue.",
        },
        ...recent.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];
    }

    // 8. Consent-guarded Health Profile Personalization Context (Milestone 4)
    let profileContextPrompt = "";
    let isPersonalized = false;

    try {
      const { data: consentRecords } = await supabaseClient
        .from("privacy_consents")
        .select("consent_type, granted, created_at")
        .eq("user_id", user.id)
        .eq("consent_type", "ai_profile_context")
        .order("created_at", { ascending: false })
        .limit(1);

      const hasConsent = Boolean(
        consentRecords && consentRecords.length > 0 && consentRecords[0].granted
      );

      if (hasConsent) {
        const [profileRes, allergiesRes, conditionsRes, medsRes, familyRes] =
          await Promise.all([
            supabaseClient
              .from("health_profiles")
              .select("age, gender, date_of_birth")
              .eq("user_id", user.id)
              .maybeSingle(),
            supabaseClient
              .from("profile_allergies")
              .select("name, severity")
              .eq("user_id", user.id),
            supabaseClient
              .from("profile_conditions")
              .select("name, status")
              .eq("user_id", user.id)
              .neq("status", "past"),
            supabaseClient
              .from("profile_medications")
              .select("name")
              .eq("user_id", user.id)
              .eq("is_current", true),
            supabaseClient
              .from("profile_family_history")
              .select("condition_name, relation")
              .eq("user_id", user.id),
          ]);

        profileContextPrompt = formatProfileContext({
          age: profileRes?.data?.age,
          gender: profileRes?.data?.gender,
          date_of_birth: profileRes?.data?.date_of_birth,
          allergies: allergiesRes?.data || [],
          conditions: conditionsRes?.data || [],
          medications: medsRes?.data || [],
          familyHistory: familyRes?.data || [],
        });

        if (profileContextPrompt) {
          isPersonalized = true;
        }
      }
    } catch {
      // Non-blocking: fail safely to generic consultation if profile loading errors
    }

    const systemPrompt = buildConsultSystemPrompt(profileContextPrompt);

    // 9. Invoke AI via Provider Adapter
    const aiOutput = await invokeLLM(systemPrompt, contextMessages);
    aiOutput.personalized = isPersonalized;

    // 10. Persist Assistant Response
    await supabaseClient.from("chat_messages").insert([
      {
        session_id: sessionId,
        user_id: user.id,
        role: "assistant",
        content: aiOutput.reply,
        metadata: {
          emergency: aiOutput.emergency,
          risk_level: aiOutput.risk_level,
          suggested_replies: aiOutput.suggested_replies,
          extracted: aiOutput.extracted,
          personalized: isPersonalized,
        },
      },
    ]);

    // Update session risk level if evaluated
    if (aiOutput.risk_level) {
      await supabaseClient
        .from("chat_sessions")
        .update({
          risk_level: aiOutput.risk_level,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    }

    // Auto-update session title if suggested and session has default title
    if (aiOutput.suggested_title && aiOutput.suggested_title.trim().length > 0) {
      const cleanTitle = aiOutput.suggested_title
        .trim()
        .replace(/^["']|["']$/g, "")
        .slice(0, 50);
      if (cleanTitle && cleanTitle.toLowerCase() !== "health consultation") {
        const { data: currentSession } = await supabaseClient
          .from("chat_sessions")
          .select("title")
          .eq("id", sessionId)
          .maybeSingle();

        if (
          !currentSession?.title ||
          currentSession.title === "New Health Consultation" ||
          currentSession.title === "New Consultation" ||
          currentSession.title.trim() === ""
        ) {
          await supabaseClient
            .from("chat_sessions")
            .update({ title: cleanTitle, updated_at: new Date().toISOString() })
            .eq("id", sessionId);
        }
      }
    }

    return new Response(JSON.stringify(aiOutput), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    if (err instanceof AiServiceError) {
      return new Response(
        JSON.stringify({
          error: err.category,
          category: err.category,
          message: err.userMessage,
          details: err.message,
          retry_after: err.retryAfter,
          model: err.model,
          latencyMs: err.latencyMs,
        }),
        {
          status: err.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const message =
      err instanceof Error ? err.message : "Internal consultation engine error";
    return new Response(
      JSON.stringify({
        error: "internal",
        category: "internal",
        message:
          "The AI consultation service is temporarily unavailable. Please verify the AI configuration or retry shortly.",
        details: message,
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
