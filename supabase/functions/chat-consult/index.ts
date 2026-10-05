// Supabase Edge Function: chat-consult
// Milestone 1 - Interactive AI Symptom Consultation Chatbot Engine
// Enforces JWT verification, rate limiting, emergency detection, untrusted input sanitization, and structured AI response.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { detectEmergency, EMERGENCY_DISCLAIMER_MESSAGE } from "../_shared/emergencyDetector.ts";
import { buildConsultSystemPrompt } from "../_shared/prompts/consultPrompt.ts";
import { invokeLLM, LLMMessage, ValidatedConsultOutput } from "../_shared/aiAdapter.ts";
import { formatProfileContext } from "../_shared/profileContextBuilder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiting map: user_id -> timestamp array
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;

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
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Rate Limit Enforcement
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a minute before sending more messages." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Request Payload Validation
    const body = await req.json();
    const sessionId = body?.session_id;
    const rawMessage = body?.message;

    if (!sessionId || typeof sessionId !== "string") {
      return new Response(JSON.stringify({ error: "Invalid or missing session_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!rawMessage || typeof rawMessage !== "string") {
      return new Response(JSON.stringify({ error: "Invalid or missing message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize and limit input length (max 2000 characters)
    const sanitizedMessage = rawMessage.trim().slice(0, 2000);
    if (sanitizedMessage.length === 0) {
      return new Response(JSON.stringify({ error: "Message cannot be empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Emergency Detection Layer (Evaluated BEFORE any LLM call)
    const emergencyCheck = detectEmergency(sanitizedMessage);

    if (emergencyCheck.isEmergency) {
      const emergencyReply: ValidatedConsultOutput = {
        reply: EMERGENCY_DISCLAIMER_MESSAGE,
        risk_level: "High",
        emergency: true,
        suggested_replies: [
          "I am calling emergency services",
          "I am heading to the nearest ER",
          "What can I do while waiting?",
        ],
        extracted: {
          symptoms: [emergencyCheck.triggerPhrase || "emergency symptom"],
          duration: "Immediate",
          intensity: "Severe",
          lifestyle: "",
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
            risk_level: "High",
            suggested_replies: emergencyReply.suggested_replies,
            matched_category: emergencyCheck.matchedCategory,
          },
        },
      ]);

      // Elevate session risk level to High
      await supabaseClient
        .from("chat_sessions")
        .update({ risk_level: "High", updated_at: new Date().toISOString() })
        .eq("id", sessionId);

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

    // 7. Load last 10 messages for conversation context
    const { data: previousMessages } = await supabaseClient
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(10);

    const contextMessages: LLMMessage[] = (previousMessages || []).map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

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

      const hasConsent = Boolean(consentRecords && consentRecords.length > 0 && consentRecords[0].granted);

      if (hasConsent) {
        const [profileRes, allergiesRes, conditionsRes, medsRes, familyRes] = await Promise.all([
          supabaseClient.from("health_profiles").select("age, gender, date_of_birth").eq("user_id", user.id).maybeSingle(),
          supabaseClient.from("profile_allergies").select("name, severity").eq("user_id", user.id),
          supabaseClient.from("profile_conditions").select("name, status").eq("user_id", user.id).neq("status", "past"),
          supabaseClient.from("profile_medications").select("name").eq("user_id", user.id).eq("is_current", true),
          supabaseClient.from("profile_family_history").select("condition_name, relation").eq("user_id", user.id),
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
        .update({ risk_level: aiOutput.risk_level, updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    return new Response(JSON.stringify(aiOutput), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal consultation engine error";
    return new Response(
      JSON.stringify({
        error: message,
        fallback: {
          reply:
            "I experienced a temporary connection issue. Please tell me about your symptoms again, or consult a qualified doctor if you feel unwell.",
          risk_level: "Low",
          emergency: false,
          suggested_replies: ["Mild headache", "Fatigue", "Poor sleep"],
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
