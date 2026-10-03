// Supabase Edge Function: generate-doctor-questions
// Milestone 2 - Dynamic Health Reports Doctor Discussion Generator
// Generates 4-6 non-diagnostic questions for the patient to ask a physician.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestPayload {
  symptoms?: string[];
  riskLevel?: "Low" | "Medium" | "High";
  bmiCategory?: string;
  lifestyle?: {
    sleepHours?: number;
    activityLevel?: string;
    waterLiters?: number;
  };
}

function getSafeFallbackQuestions(riskLevel: string, symptoms: string[]): string[] {
  const primarySymptom = symptoms.length > 0 ? symptoms.slice(0, 2).join(" and ") : "general wellness";

  if (riskLevel === "Low") {
    return [
      "Are there any age-appropriate preventive health screenings I should schedule this year?",
      "What dietary or sleep modifications would best support my energy and wellness?",
      "Are my current physical activity habits optimal for long-term cardiovascular health?",
      "Should we monitor any specific routine biomarkers based on my personal family background?",
    ];
  }

  return [
    `Could my reported symptom of ${primarySymptom} indicate an underlying issue worth evaluating?`,
    "What diagnostic tests, routine blood panels, or physical exams do you recommend?",
    "Are there specific warning signs or changes in severity that should prompt immediate medical follow-up?",
    "What evidence-based lifestyle or nutritional adjustments should I prioritize before our next check-in?",
    "How often would you suggest I schedule routine follow-up check-ins for these concerns?",
  ];
}

serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. JWT Verification
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
      return new Response(JSON.stringify({ error: "Unauthorized session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse & sanitize payload
    const payload: RequestPayload = await req.json();
    const symptoms = Array.isArray(payload.symptoms)
      ? payload.symptoms.filter((s): s is string => typeof s === "string").slice(0, 5)
      : [];
    const riskLevel = payload.riskLevel || "Low";
    const bmiCategory = payload.bmiCategory || "Normal weight";

    // 3. Fallback baseline questions
    const fallbackQuestions = getSafeFallbackQuestions(riskLevel, symptoms);

    // 4. Optional AI Provider Generation
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");

    if (!geminiKey && !openAiKey) {
      return new Response(JSON.stringify({ questions: fallbackQuestions }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side AI generation logic if key exists
    const prompt = `You are a medical safety assistant. Generate 4 to 6 concise questions that a patient can take to their physician regarding their recent wellness evaluation.
Patient Symptoms: ${symptoms.length > 0 ? symptoms.join(", ") : "None reported"}
Evaluated Risk: ${riskLevel}
BMI Category: ${bmiCategory}

STRICT SAFETY RULES:
- NEVER diagnose any illness.
- NEVER suggest any prescription, over-the-counter medicine, or dosages.
- Output ONLY valid JSON in this exact structure:
{
  "questions": [
    "Question 1",
    "Question 2",
    "Question 3",
    "Question 4"
  ]
}`;

    let aiQuestions: string[] | null = null;

    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
            }),
          }
        );
        if (response.ok) {
          const resData = await response.json();
          const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed.questions) && parsed.questions.length >= 2) {
              aiQuestions = parsed.questions.slice(0, 6);
            }
          }
        }
      } catch {
        // Fall back gracefully
      }
    }

    const finalQuestions = aiQuestions || fallbackQuestions;

    return new Response(JSON.stringify({ questions: finalQuestions }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
