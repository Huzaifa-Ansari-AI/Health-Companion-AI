// AI Provider Adapter for Supabase Edge Functions
// Supports Google Gemini and OpenAI with strict JSON output validation, timeouts, diagnostics, and explicit error handling.

import { z } from "https://esm.sh/zod@3.22.4";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ValidatedConsultOutput {
  reply: string;
  suggested_title?: string | null;
  risk_level: "Low" | "Medium" | "High" | null;
  emergency: boolean;
  suggested_replies: string[];
  extracted: {
    symptoms?: string[];
    duration?: string;
    intensity?: string;
    lifestyle?: string;
  };
  personalized?: boolean;
}

export interface AiDiagnosticResult {
  ok: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  message: string;
}

// Zod Schema for strict consultation output validation
export const ConsultOutputSchema = z.object({
  reply: z.string().trim().min(1, "Reply cannot be empty"),
  suggested_title: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val ?? null),
  risk_level: z
    .enum(["Low", "Medium", "High"])
    .nullable()
    .optional()
    .transform((val) => val ?? null),
  emergency: z.boolean().default(false),
  suggested_replies: z
    .array(z.string())
    .default([])
    .transform((arr) => arr.slice(0, 4)),
  extracted: z
    .object({
      symptoms: z.array(z.string()).default([]),
      duration: z.string().default(""),
      intensity: z.string().default(""),
      lifestyle: z.string().default(""),
    })
    .default({
      symptoms: [],
      duration: "",
      intensity: "",
      lifestyle: "",
    }),
});

/**
 * Resolves the configured Gemini API key from environment secrets.
 * Prioritizes GEMINI_API_KEY, falling back to legacy AI_API_KEY.
 */
export function getGeminiApiKey(): string | null {
  return Deno.env.get("GEMINI_API_KEY") || Deno.env.get("AI_API_KEY") || null;
}

/**
 * Resolves the configured Gemini model name.
 * Defaults to 'gemini-1.5-flash'. Can be customized via GEMINI_MODEL secret (e.g. 'gemini-2.0-flash').
 */
export function getGeminiModel(): string {
  return Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";
}

/**
 * Resolves OpenAI API key if configured.
 */
export function getOpenAiApiKey(): string | null {
  return Deno.env.get("OPENAI_API_KEY") || null;
}

/**
 * Validates and normalizes raw JSON output from any LLM provider via Zod.
 */
export function validateAndNormalizeOutput(rawJson: unknown): ValidatedConsultOutput | null {
  if (!rawJson || typeof rawJson !== "object") return null;

  const parsed = ConsultOutputSchema.safeParse(rawJson);
  if (!parsed.success) {
    return null;
  }

  const { data } = parsed;
  return {
    reply: data.reply.trim(),
    risk_level: data.risk_level,
    emergency: data.emergency,
    suggested_replies: data.suggested_replies.slice(0, 4),
    extracted: {
      symptoms: data.extracted.symptoms.map((s) => s.trim()).filter(Boolean),
      duration: data.extracted.duration.trim(),
      intensity: data.extracted.intensity.trim(),
      lifestyle: data.extracted.lifestyle.trim(),
    },
  };
}

/**
 * Calls Google Gemini API with structured JSON output mode.
 */
async function callGemini(
  apiKey: string,
  systemPrompt: string,
  messages: LLMMessage[],
  model = getGeminiModel()
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
  messages: LLMMessage[],
  model = "gpt-4o-mini"
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
      model,
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
 * Runs a lightweight connectivity diagnostic test to verify the AI provider is configured and responding.
 */
export async function testAiConnection(): Promise<AiDiagnosticResult> {
  const provider = (Deno.env.get("AI_PROVIDER") || "gemini").toLowerCase();
  const start = Date.now();

  if (provider === "openai") {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
      return {
        ok: false,
        provider: "openai",
        model: "gpt-4o-mini",
        latencyMs: 0,
        message: "OPENAI_API_KEY secret is not set in Supabase Edge Functions.",
      };
    }
    try {
      await callOpenAI(
        apiKey,
        "Respond with JSON: {\"status\": \"ok\"}",
        [{ role: "user", content: "ping" }]
      );
      return {
        ok: true,
        provider: "openai",
        model: "gpt-4o-mini",
        latencyMs: Date.now() - start,
        message: "OpenAI connection verified successfully.",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        provider: "openai",
        model: "gpt-4o-mini",
        latencyMs: Date.now() - start,
        message: `OpenAI diagnostic error: ${msg}`,
      };
    }
  }

  // Gemini provider (default)
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();

  if (!apiKey) {
    return {
      ok: false,
      provider: "gemini",
      model,
      latencyMs: 0,
      message: "GEMINI_API_KEY secret is not set in Supabase Edge Functions. Please add it to your Supabase Project Secrets.",
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Respond with valid JSON: {\"status\": \"ok\"}" }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 50,
        },
      }),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        provider: "gemini",
        model,
        latencyMs,
        message: `Gemini API error [${response.status}]: ${errorText}`,
      };
    }

    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return {
        ok: false,
        provider: "gemini",
        model,
        latencyMs,
        message: "Gemini connected, but response text was empty.",
      };
    }

    return {
      ok: true,
      provider: "gemini",
      model,
      latencyMs,
      message: `Gemini connection verified successfully (${latencyMs}ms).`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      provider: "gemini",
      model,
      latencyMs,
      message: `Gemini connection attempt failed: ${msg}`,
    };
  }
}

/**
 * Dispatches LLM call through configured provider with automatic 1-retry and strict validation.
 * NEVER returns silent fake data when an error occurs — throws explicitly.
 */
export async function invokeLLM(
  systemPrompt: string,
  messages: LLMMessage[],
  providerOverride?: string,
  keyOverride?: string
): Promise<ValidatedConsultOutput> {
  const provider = (providerOverride || Deno.env.get("AI_PROVIDER") || "gemini").toLowerCase();
  const apiKey =
    keyOverride || (provider === "openai" ? getOpenAiApiKey() : getGeminiApiKey());

  if (!apiKey) {
    const secretName = provider === "openai" ? "OPENAI_API_KEY" : "GEMINI_API_KEY";
    throw new Error(
      `AI service error: ${secretName} is not configured in Supabase Edge Function secrets. Please configure it in your Supabase project settings.`
    );
  }

  let lastError: Error | null = null;

  // Attempt generation with 1 retry on parse failure or network timeout
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
      throw new Error("Model response failed structured consultation schema validation.");
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // If first attempt failed, retry once
      if (attempt === 0) continue;
    }
  }

  // Explicit failure: NO silent fallback to generic text!
  throw new Error(`AI generation error: ${lastError?.message || "Unknown model failure"}`);
}

