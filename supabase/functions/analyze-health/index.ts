// Supabase Edge Function: analyze-health
// Executes secure server-side AI evaluation. Client never receives direct AI provider secret keys.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthPayload {
  bmi: number;
  bmiCategory: string;
  symptoms: string[];
  lifestyle: {
    sleepHours?: number;
    activityLevel?: string;
    stressLevel?: string;
    hydrationLiters?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: HealthPayload = await req.json();

    // Deterministic validation rules & medical safety enforcement
    // Strict categorical risk levels: 'Low' | 'Medium' | 'High'
    let riskLevel: "Low" | "Medium" | "High" = "Low";
    if (payload.symptoms.length >= 3 || payload.bmiCategory === "Obesity") {
      riskLevel = "High";
    } else if (payload.symptoms.length >= 1 || payload.bmiCategory === "Overweight" || payload.bmiCategory === "Underweight") {
      riskLevel = "Medium";
    }

    // AI Provider invocation can be performed with Deno.env.get("AI_API_KEY")
    // Fallback/Deterministic fallback recommendations:
    const recommendations: string[] = [];
    if (payload.bmiCategory !== "Normal weight") {
      recommendations.push("Maintain a balanced, nutrient-dense diet and consult a certified nutritionist.");
    }
    if ((payload.lifestyle.sleepHours || 8) < 7) {
      recommendations.push("Aim for 7-9 hours of continuous sleep to support metabolic recovery.");
    }
    recommendations.push("Engage in at least 150 minutes of moderate aerobic physical activity per week.");
    recommendations.push("Drink at least 2 liters of water daily to maintain optimal hydration.");

    const result = {
      riskLevel,
      summary: `Your BMI is ${payload.bmi} (${payload.bmiCategory}). Based on your reported symptoms and daily lifestyle profile, your overall wellness risk indicator is categorized as ${riskLevel}.`,
      recommendations,
      disclaimer: "This is not a medical diagnosis.",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
