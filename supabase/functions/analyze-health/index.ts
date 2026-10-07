// Supabase Edge Function: analyze-health (Milestone 4.5)
// Executes LLM-driven dynamic health risk evaluation across metabolic, cardiovascular,
// respiratory, oncological, and lifestyle recovery domains.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { invokeHealthAnalysis } from "../_shared/aiAdapter.ts";
import { detectEmergency, EMERGENCY_DISCLAIMER_MESSAGE } from "../_shared/emergencyDetector.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Authentication Verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Extract & Normalize Assessment Payload
    const payload = await req.json();

    // 4. Deterministic Medical Red Flag Emergency Screening
    const symptomsText = Array.isArray(payload.symptoms) ? payload.symptoms.join(", ") : "";
    const emergencyCheck = detectEmergency(symptomsText);

    // 5. Invoke LLM via Shared Adapter
    const analysis = await invokeHealthAnalysis(JSON.stringify(payload));

    // If deterministic red flags were detected, elevate overall risk to High if not already
    if (emergencyCheck.isEmergency) {
      analysis.overall_risk_level = "High";
      if (!analysis.recommendations.some((r: string) => r.includes("emergency") || r.includes("immediate"))) {
        analysis.recommendations.unshift(
          "⚠️ Immediate medical attention recommended: reported symptoms indicate acute red flags."
        );
      }
    }

    return new Response(JSON.stringify(analysis), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        error: "AI_UNAVAILABLE",
        message: "The AI assessment analysis engine is temporarily unavailable.",
        details: message,
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
