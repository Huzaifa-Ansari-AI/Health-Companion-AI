// AI Provider Adapter for Supabase Edge Functions
// Supports Google Gemini and OpenAI with strict JSON output validation, timeouts, and fallbacks.

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ValidatedConsultOutput {
  reply: string;
  risk_level: "Low" | "Medium" | "High" | null;
  emergency: boolean;
  suggested_replies: string[];
  extracted: {
    symptoms?: string[];
    duration?: string;
    intensity?: string;
    lifestyle?: string;
  };
}

export const SAFE_FALLBACK_OUTPUT: ValidatedConsultOutput = {
  reply:
    "Thank you for sharing your symptoms. To help provide you with the most relevant wellness guidance, could you tell me how long you've noticed this and whether it feels mild or more intense?",
  risk_level: "Low",
  emergency: false,
  suggested_replies: ["Started today", "A few days", "Over a week", "Mild intensity"],
  extracted: {
    symptoms: [],
    duration: "",
    intensity: "",
    lifestyle: "",
  },
};

/**
 * Validates and normalizes raw JSON output from any LLM provider.
 */
export function validateAndNormalizeOutput(rawJson: unknown): ValidatedConsultOutput | null {
  if (!rawJson || typeof rawJson !== "object") return null;

  const data = rawJson as Record<string, unknown>;

  if (typeof data.reply !== "string" || !data.reply.trim()) {
    return null;
  }

  let risk_level: "Low" | "Medium" | "High" | null = null;
  if (data.risk_level === "Low" || data.risk_level === "Medium" || data.risk_level === "High") {
    risk_level = data.risk_level;
  }

  const emergency = Boolean(data.emergency);

  let suggested_replies: string[] = [];
  if (Array.isArray(data.suggested_replies)) {
    suggested_replies = data.suggested_replies
      .filter((item): item is string => typeof item === "string")
      .slice(0, 4);
  }

  const rawExtracted = (typeof data.extracted === "object" && data.extracted !== null)
    ? (data.extracted as Record<string, unknown>)
    : {};

  const symptoms = Array.isArray(rawExtracted.symptoms)
    ? rawExtracted.symptoms.filter((s): s is string => typeof s === "string")
    : [];

  return {
    reply: data.reply.trim(),
    risk_level,
    emergency,
    suggested_replies,
    extracted: {
      symptoms,
      duration: typeof rawExtracted.duration === "string" ? rawExtracted.duration : "",
      intensity: typeof rawExtracted.intensity === "string" ? rawExtracted.intensity : "",
      lifestyle: typeof rawExtracted.lifestyle === "string" ? rawExtracted.lifestyle : "",
    },
  };
}

/**
 * Calls Gemini API with structured JSON output mode.
 */
async function callGemini(
  apiKey: string,
  systemPrompt: string,
  messages: LLMMessage[]
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error [${response.status}]: ${errorText}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No text returned by Gemini");
  }

  return text;
}

/**
 * Calls OpenAI API with JSON object response format.
 */
async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: LLMMessage[]
): Promise<string> {
  const url = "https://api.openai.com/v1/chat/completions";

  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: apiMessages,
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error [${response.status}]: ${errorText}`);
  }

  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("No text returned by OpenAI");
  }

  return text;
}

/**
 * Dispatches LLM call through configured provider with automatic retry and validation.
 */
export async function invokeLLM(
  systemPrompt: string,
  messages: LLMMessage[],
  providerOverride?: string,
  keyOverride?: string
): Promise<ValidatedConsultOutput> {
  const provider = (providerOverride || Deno.env.get("AI_PROVIDER") || "gemini").toLowerCase();
  const apiKey = keyOverride || Deno.env.get("AI_API_KEY");

  if (!apiKey) {
    // If no API key configured on the server, return safe fallback
    return SAFE_FALLBACK_OUTPUT;
  }

  // Attempt generation with 1 retry on parse failure
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let rawText = "";
      if (provider === "openai") {
        rawText = await callOpenAI(apiKey, systemPrompt, messages);
      } else {
        rawText = await callGemini(apiKey, systemPrompt, messages);
      }

      const parsed = JSON.parse(rawText);
      const validated = validateAndNormalizeOutput(parsed);
      if (validated) {
        return validated;
      }
    } catch {
      // If first attempt failed, retry once
      if (attempt === 0) continue;
    }
  }

  return SAFE_FALLBACK_OUTPUT;
}
