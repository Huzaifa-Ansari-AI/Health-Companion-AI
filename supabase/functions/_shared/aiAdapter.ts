// AI Provider Adapter for Supabase Edge Functions
// Supports Google Gemini and OpenAI with strict JSON validation, low-latency thinking config,
// exponential backoff/jitter retries, fallback model support, structured error mapping, and safe logging.

import { z } from "https://esm.sh/zod@3.22.4";
import { HEALTH_ANALYSIS_SYSTEM_PROMPT } from "./prompts/analysisPrompt.ts";
import { buildSummarySystemPrompt } from "./prompts/summaryPrompt.ts";

export type AiErrorCategory =
  | "key_missing"
  | "auth_invalid"
  | "model_not_found"
  | "rate_limited"
  | "timeout"
  | "upstream_unavailable"
  | "bad_request"
  | "internal";

export class AiServiceError extends Error {
  public readonly category: AiErrorCategory;
  public readonly status: number;
  public readonly retryAfter?: number;
  public readonly model?: string;
  public readonly userMessage: string;
  public readonly details?: string;
  public readonly latencyMs?: number;

  constructor(opts: {
    category: AiErrorCategory;
    message: string;
    userMessage?: string;
    status?: number;
    retryAfter?: number;
    model?: string;
    details?: string;
    latencyMs?: number;
  }) {
    super(opts.message);
    this.name = "AiServiceError";
    this.category = opts.category;
    this.status = opts.status ?? 500;
    this.retryAfter = opts.retryAfter;
    this.model = opts.model;
    this.userMessage = opts.userMessage ?? opts.message;
    this.details = opts.details;
    this.latencyMs = opts.latencyMs;
  }
}

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DynamicRiskIndicator {
  condition: string;
  risk_level: "Low" | "Medium" | "High";
  rationale: string;
  icon_name?: string;
}

export interface HealthAnalysisResult {
  overall_risk_level: "Low" | "Medium" | "High";
  summary: string;
  risks: DynamicRiskIndicator[];
  recommendations: string[];
  disclaimer: string;
}

export const HealthAnalysisSchema = z.object({
  overall_risk_level: z.enum(["Low", "Medium", "High"]).default("Low"),
  summary: z.string().trim().min(1, "Summary cannot be empty"),
  risks: z
    .array(
      z.object({
        condition: z.string().trim().min(1),
        risk_level: z.enum(["Low", "Medium", "High"]),
        rationale: z.string().trim().min(1),
        icon_name: z.string().optional().default("Activity"),
      })
    )
    .default([]),
  recommendations: z.array(z.string()).default([]),
  disclaimer: z
    .string()
    .default(
      "This is not a medical diagnosis. Please consult a qualified healthcare professional."
    ),
});

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

export interface HealthAssessmentSummaryOutput {
  has_sufficient_info: boolean;
  symptoms: string[];
  duration?: string;
  intensity?: string;
  likely_conditions: string[];
  lifestyle_factors: string[];
  risk_level: "Low" | "Medium" | "High" | null;
  summary: string;
  recommendations: string[];
  doctor_questions: string[];
  red_flags: string[];
  disclaimer: string;
}

export const HealthSummaryLlmSchema = z.object({
  has_sufficient_info: z.boolean().default(true),
  symptoms: z.array(z.string()).default([]),
  duration: z.string().default(""),
  intensity: z.string().default(""),
  likely_conditions: z.array(z.string()).default([]),
  lifestyle_factors: z.array(z.string()).default([]),
  risk_level: z
    .enum(["Low", "Medium", "High"])
    .nullable()
    .optional()
    .transform((val) => val ?? null),
  summary: z.string().trim().min(1, "Summary cannot be empty"),
  recommendations: z.array(z.string()).default([]),
  doctor_questions: z.array(z.string()).default([]),
  red_flags: z.array(z.string()).default([]),
  disclaimer: z
    .string()
    .default(
      "This is not a medical diagnosis. It is general wellness guidance. Please consult a qualified healthcare professional."
    ),
});

export interface AiDiagnosticResult {
  ok: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  message: string;
  category?: AiErrorCategory;
  resolution?: string;
  details?: string;
  availableModels?: string[];
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
 */
export function cleanModelName(rawModel: string): string {
  if (!rawModel) return "";
  let cleaned = rawModel.trim();
  cleaned = cleaned.replace(/^["']+|["']+$/g, "").trim();
  if (cleaned.startsWith("models/")) {
    cleaned = cleaned.slice(7).trim();
  }
  return cleaned;
}

export function getGeminiApiKey(): string | null {
  const key = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("AI_API_KEY") || null;
  if (!key) return null;
  const cleaned = key.trim().replace(/^["']+|["']+$/g, "").trim();
  return cleaned || null;
}

/**
 * Resolves the primary Gemini model name from environment.
 * Uses GEMINI_MODEL secret or defaults to active gemini-3.5-flash.
 */
export function getGeminiModel(): string {
  const raw = Deno.env.get("GEMINI_MODEL");
  const cleaned = cleanModelName(raw || "");
  return cleaned || "gemini-3.5-flash";
}

/**
 * Resolves the optional fallback Gemini model name from environment.
 */
export function getGeminiFallbackModel(): string | null {
  const raw = Deno.env.get("GEMINI_FALLBACK_MODEL");
  if (!raw) return "gemini-3.6-flash";
  const cleaned = cleanModelName(raw);
  return cleaned || "gemini-3.6-flash";
}

/**
 * Resolves OpenAI API key if configured.
 */
export function getOpenAiApiKey(): string | null {
  return Deno.env.get("OPENAI_API_KEY") || null;
}

/**
 * Safe server-side structured logging. Never outputs API keys, prompts, or personal health info.
 */
function logAiEvent(
  funcName: string,
  requestId: string,
  model: string,
  status: number | string,
  latencyMs: number,
  category?: string,
  details?: string
): void {
  const meta = [
    `[ai]`,
    `[${requestId}]`,
    `fn=${funcName}`,
    `model=${model}`,
    `status=${status}`,
    `latency=${latencyMs}ms`,
    category ? `category=${category}` : "",
    details ? `details="${details.slice(0, 100)}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  console.log(meta);
}

/**
 * Classifies an HTTP response error or thrown exception from Gemini into an AiErrorCategory.
 */
function classifyGeminiError(
  status: number,
  bodyText: string
): { category: AiErrorCategory; userMessage: string; retryAfter?: number } {
  const lower = bodyText.toLowerCase();

  // Rate limit / Quota
  if (status === 429 || lower.includes("resource_exhausted") || lower.includes("quota")) {
    // Attempt parsing retry-after delay if mentioned in error body
    return {
      category: "rate_limited",
      userMessage: "AI request rate limit reached. Please wait a moment before trying again.",
      retryAfter: 15,
    };
  }

  // Model not found or retired
  if (
    status === 404 ||
    lower.includes("not found") ||
    lower.includes("is not supported for generatecontent") ||
    lower.includes("unknown model")
  ) {
    return {
      category: "model_not_found",
      userMessage: "The configured AI model was not found or is no longer available. Please update GEMINI_MODEL in Supabase secrets.",
    };
  }

  // Invalid API key / Auth
  if (
    status === 401 ||
    status === 403 ||
    lower.includes("api_key_invalid") ||
    lower.includes("permission_denied")
  ) {
    return {
      category: "auth_invalid",
      userMessage: "AI API key is invalid or unauthorized. Please verify GEMINI_API_KEY in Supabase secrets.",
    };
  }

  // Invalid argument / Bad Request
  if (status === 400) {
    return {
      category: "bad_request",
      userMessage: "The AI request was rejected due to invalid parameters.",
    };
  }

  // Upstream Unavailable / Overload
  if (status >= 500 && status <= 504) {
    return {
      category: "upstream_unavailable",
      userMessage: "Google Gemini service is temporarily overloaded or unavailable. Please retry shortly.",
    };
  }

  return {
    category: "internal",
    userMessage: "Unexpected error communicating with Google Gemini service.",
  };
}

/**
 * Calls Google Gemini API with low-latency thinking config and strict timeouts.
 */
async function callGemini(
  apiKey: string,
  systemPrompt: string,
  messages: LLMMessage[],
  model: string,
  requestId: string,
  maxOutputTokens = 1024
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const start = Date.now();

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Helper: check if model supports thinkingConfig (e.g. Gemini 2.5/3.x or thinking-specific models)
  const supportsThinking = (m: string): boolean => {
    const lower = m.toLowerCase();
    return lower.includes("thinking") || lower.includes("gemini-2.5") || lower.includes("gemini-3.");
  };

  const generationConfig: Record<string, unknown> = {
    responseMimeType: "application/json",
    temperature: 0.3,
    maxOutputTokens,
  };

  if (supportsThinking(model)) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig,
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(25000), // 25 second server timeout
      body: JSON.stringify(payload),
    });
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout =
      (err instanceof Error && (err.name === "AbortError" || err.message.includes("timed out"))) ||
      String(err).includes("timed out");

    const category: AiErrorCategory = isTimeout ? "timeout" : "internal";
    logAiEvent("callGemini", requestId, model, isTimeout ? 504 : 500, latencyMs, category);

    throw new AiServiceError({
      category,
      status: isTimeout ? 504 : 500,
      model,
      latencyMs,
      message: isTimeout ? `Gemini request timed out after ${latencyMs}ms` : `Network error: ${String(err)}`,
      userMessage: isTimeout
        ? "AI request timed out. Please try again or check your connection."
        : "Failed to connect to the AI service.",
    });
  }

  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const errorText = await response.text();
    const classification = classifyGeminiError(response.status, errorText);

    // Parse retry-after header if present
    const headerRetryAfter = response.headers.get("retry-after");
    if (headerRetryAfter) {
      const parsedSec = parseInt(headerRetryAfter, 10);
      if (!isNaN(parsedSec) && parsedSec > 0) {
        classification.retryAfter = parsedSec;
      }
    }

    logAiEvent(
      "callGemini",
      requestId,
      model,
      response.status,
      latencyMs,
      classification.category,
      errorText
    );

    throw new AiServiceError({
      category: classification.category,
      status: response.status,
      retryAfter: classification.retryAfter,
      model,
      latencyMs,
      message: `Gemini API error [${response.status}]: ${errorText}`,
      userMessage: classification.userMessage,
      details: errorText,
    });
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    logAiEvent("callGemini", requestId, model, 200, latencyMs, "internal", "Empty response parts");
    throw new AiServiceError({
      category: "internal",
      status: 500,
      model,
      latencyMs,
      message: "Empty response text returned by Gemini",
      userMessage: "AI service returned an empty response. Please retry.",
    });
  }

  logAiEvent("callGemini", requestId, model, 200, latencyMs);
  return text;
}

/**
 * Calls OpenAI API with JSON object response format.
 */
async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: LLMMessage[],
  requestId: string,
  model = "gpt-4o-mini"
): Promise<string> {
  const url = "https://api.openai.com/v1/chat/completions";
  const start = Date.now();

  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model,
        messages: apiMessages,
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout =
      (err instanceof Error && (err.name === "AbortError" || err.message.includes("timed out"))) ||
      String(err).includes("timed out");

    throw new AiServiceError({
      category: isTimeout ? "timeout" : "internal",
      status: isTimeout ? 504 : 500,
      model,
      latencyMs,
      message: `OpenAI error: ${String(err)}`,
      userMessage: "AI request timed out or connection failed.",
    });
  }

  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const errorText = await response.text();
    const category: AiErrorCategory =
      response.status === 429
        ? "rate_limited"
        : response.status === 401 || response.status === 403
        ? "auth_invalid"
        : response.status >= 500
        ? "upstream_unavailable"
        : "bad_request";

    logAiEvent("callOpenAI", requestId, model, response.status, latencyMs, category);

    throw new AiServiceError({
      category,
      status: response.status,
      model,
      latencyMs,
      message: `OpenAI API error [${response.status}]: ${errorText}`,
      userMessage: "OpenAI service error.",
    });
  }

  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) {
    throw new AiServiceError({
      category: "internal",
      status: 500,
      model,
      latencyMs,
      message: "No text returned by OpenAI",
      userMessage: "AI service returned an empty response.",
    });
  }

  logAiEvent("callOpenAI", requestId, model, 200, latencyMs);
  return text;
}

/**
 * Executes an LLM call with exponential backoff & jitter for 429/5xx, and optional fallback model on failure.
 */
async function executeWithRetryAndFallback(
  requestId: string,
  systemPrompt: string,
  messages: LLMMessage[],
  maxOutputTokens = 1024
): Promise<string> {
  const provider = (Deno.env.get("AI_PROVIDER") || "gemini").toLowerCase();

  if (provider === "openai") {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
      throw new AiServiceError({
        category: "key_missing",
        status: 500,
        message: "OPENAI_API_KEY secret is not configured in Supabase Edge Functions.",
        userMessage: "AI configuration error: Missing OPENAI_API_KEY secret.",
      });
    }
    return callOpenAI(apiKey, systemPrompt, messages, requestId);
  }

  // Gemini Provider
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new AiServiceError({
      category: "key_missing",
      status: 500,
      message: "GEMINI_API_KEY secret is not configured in Supabase Edge Functions.",
      userMessage: "AI configuration error: GEMINI_API_KEY secret is missing in Supabase.",
    });
  }

  const primaryModel = getGeminiModel();
  const fallbackModel = getGeminiFallbackModel();

  // Try primary model with up to 2 retries (3 total attempts) for retryable errors (429, 5xx, timeout)
  let lastError: AiServiceError | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await callGemini(apiKey, systemPrompt, messages, primaryModel, requestId, maxOutputTokens);
    } catch (err: unknown) {
      if (err instanceof AiServiceError) {
        lastError = err;

        // Non-retryable on primary: model_not_found or auth_invalid
        if (err.category === "model_not_found" || err.category === "auth_invalid" || err.category === "bad_request") {
          break;
        }

        // Only retry on rate_limited, upstream_unavailable, or timeout
        if (attempt < 2 && (err.category === "rate_limited" || err.category === "upstream_unavailable" || err.category === "timeout")) {
          const delayMs = err.retryAfter
            ? Math.min(err.retryAfter * 1000, 5000)
            : Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 4000);

          logAiEvent("retry", requestId, primaryModel, `attempt_${attempt + 1}`, delayMs, err.category, "Backoff wait before retry");
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
      } else {
        throw err;
      }
    }
  }

  // Check if fallback model is configured and appropriate to use
  if (fallbackModel && fallbackModel !== primaryModel && lastError) {
    const isFallbackEligible =
      lastError.category === "model_not_found" ||
      lastError.category === "upstream_unavailable" ||
      lastError.category === "timeout" ||
      lastError.category === "rate_limited";

    if (isFallbackEligible) {
      logAiEvent("fallback", requestId, fallbackModel, "starting", 0, lastError.category, `Falling back from ${primaryModel}`);
      try {
        return await callGemini(apiKey, systemPrompt, messages, fallbackModel, requestId, maxOutputTokens);
      } catch (fallbackErr: unknown) {
        if (fallbackErr instanceof AiServiceError) {
          lastError = fallbackErr;
        }
      }
    }
  }

  throw lastError || new AiServiceError({
    category: "internal",
    status: 500,
    message: "AI request failed after retries.",
    userMessage: "AI request failed. Please retry shortly.",
  });
}

/**
 * Validates and normalizes raw JSON output from consultation LLM via Zod.
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
    suggested_title: data.suggested_title,
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
 * Runs a lightweight connectivity diagnostic test to verify the AI provider is configured and responding.
 */
export async function testAiConnection(): Promise<AiDiagnosticResult> {
  const provider = (Deno.env.get("AI_PROVIDER") || "gemini").toLowerCase();
  const start = Date.now();
  const requestId = crypto.randomUUID();

  if (provider === "openai") {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
      return {
        ok: false,
        provider: "openai",
        model: "gpt-4o-mini",
        latencyMs: 0,
        category: "key_missing",
        message: "OPENAI_API_KEY secret is not set in Supabase Edge Functions.",
        resolution: "Go to Supabase Project Dashboard > Edge Functions > Manage Secrets, and add secret OPENAI_API_KEY.",
      };
    }
    try {
      await callOpenAI(apiKey, 'Respond with JSON: {"status": "ok"}', [{ role: "user", content: "ping" }], requestId);
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
        category: "upstream_unavailable",
        message: `OpenAI diagnostic error: ${msg}`,
        resolution: "Please check OpenAI service status or API key validity.",
      };
    }
  }

  // Gemini Provider
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();

  if (!apiKey) {
    return {
      ok: false,
      provider: "gemini",
      model,
      latencyMs: 0,
      category: "key_missing",
      message: "GEMINI_API_KEY secret is not set in Supabase Edge Functions.",
      resolution: "Go to Supabase Project Dashboard > Edge Functions > Manage Secrets, and add secret GEMINI_API_KEY.",
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const diagSupportsThinking = (m: string): boolean => {
      const lower = m.toLowerCase();
      return lower.includes("thinking") || lower.includes("gemini-2.5") || lower.includes("gemini-3.");
    };

    const diagGenConfig: Record<string, unknown> = {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 60,
    };

    if (diagSupportsThinking(model)) {
      diagGenConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20000), // 20s diagnostic timeout
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: 'Respond with valid JSON: {"status": "ok"}' }] }],
        generationConfig: diagGenConfig,
      }),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const errorText = await response.text();
      const classified = classifyGeminiError(response.status, errorText);

      let resolution = "Please inspect Supabase function logs.";
      let discoveredModels: string[] | undefined = undefined;

      if (classified.category === "model_not_found") {
        try {
          const listRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
            { signal: AbortSignal.timeout(6000) }
          );
          if (listRes.ok) {
            const listJson = await listRes.json();
            const models = Array.isArray(listJson?.models)
              ? listJson.models
                  .map((m: { name?: string }) => (m.name || "").replace(/^models\//, ""))
                  .filter(Boolean)
              : [];
            if (models.length > 0) {
              discoveredModels = models;
              resolution = `Model '${model}' was not found. Your Google AI Studio API key supports: ${models.slice(0, 6).join(", ")}. Please update GEMINI_MODEL in Supabase secrets to one of these.`;
            }
          }
        } catch {
          // Keep default resolution if discovery fails
        }
        if (!discoveredModels) {
          resolution = `Model '${model}' not found or retired. Update GEMINI_MODEL in Supabase secrets to an active model (e.g. gemini-1.5-flash).`;
        }
      } else if (classified.category === "rate_limited") {
        resolution = "Google Gemini quota limit reached. Please wait a moment or check your Google AI Studio plan.";
      } else if (classified.category === "auth_invalid") {
        resolution = "Invalid API key. Check that your GEMINI_API_KEY secret in Supabase is valid.";
      } else if (classified.category === "upstream_unavailable") {
        resolution = "Google Gemini servers are temporarily overloaded. Please retry in a few moments.";
      }

      return {
        ok: false,
        provider: "gemini",
        model,
        latencyMs,
        category: classified.category,
        message: `Gemini API error [${response.status}]: ${classified.userMessage}`,
        resolution,
        details: errorText,
        availableModels: discoveredModels,
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
        category: "internal",
        message: "Gemini connected, but returned empty output text.",
        resolution: "Please test again. If this repeats, verify model parameters.",
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
    const isTimeout =
      (err instanceof Error && (err.name === "AbortError" || err.message.includes("timed out"))) ||
      String(err).includes("timed out");

    const category: AiErrorCategory = isTimeout ? "timeout" : "internal";
    const resolution = isTimeout
      ? "Gemini response exceeded 20 seconds. Model may be slow or overloaded; consider setting GEMINI_FALLBACK_MODEL."
      : "Check Supabase Edge Function logs and network connectivity.";

    return {
      ok: false,
      provider: "gemini",
      model,
      latencyMs,
      category,
      message: isTimeout
        ? `Gemini connection attempt timed out (${latencyMs}ms).`
        : `Gemini connection failed: ${err instanceof Error ? err.message : String(err)}`,
      resolution,
    };
  }
}

/**
 * Dispatches LLM call for interactive symptom chat.
 */
export async function invokeLLM(
  systemPrompt: string,
  messages: LLMMessage[]
): Promise<ValidatedConsultOutput> {
  const requestId = crypto.randomUUID();

  // Retry once on schema validation error
  for (let attempt = 0; attempt < 2; attempt++) {
    const rawText = await executeWithRetryAndFallback(requestId, systemPrompt, messages, 1024);

    try {
      const parsed = JSON.parse(rawText);
      const validated = validateAndNormalizeOutput(parsed);
      if (validated) {
        return validated;
      }
    } catch {
      // JSON parse error
    }

    if (attempt === 0) {
      logAiEvent("invokeLLM", requestId, getGeminiModel(), 200, 0, "internal", "Schema validation retry");
      continue;
    }
  }

  throw new AiServiceError({
    category: "internal",
    status: 500,
    model: getGeminiModel(),
    message: "Model response failed structured consultation schema validation.",
    userMessage: "The AI response could not be verified. Please retry your message.",
  });
}

/**
 * Synthesizes a structured Health Assessment Summary from consultation chat transcript via LLM.
 */
export async function invokeConsultSummary(
  consultContextJson: string,
  profileContextPrompt?: string
): Promise<HealthAssessmentSummaryOutput> {
  const requestId = crypto.randomUUID();
  const systemPrompt = buildSummarySystemPrompt(profileContextPrompt);

  const messages: LLMMessage[] = [
    {
      role: "user",
      content: `Synthesize the following consultation chat transcript into a structured Health Assessment Summary conforming strictly to the requested JSON schema:\n\n${consultContextJson}`,
    },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    const rawText = await executeWithRetryAndFallback(requestId, systemPrompt, messages, 2048);

    try {
      const parsed = JSON.parse(rawText);
      const validated = HealthSummaryLlmSchema.safeParse(parsed);
      if (validated.success) {
        return validated.data;
      }
    } catch {
      // JSON parse error
    }

    if (attempt === 0) {
      logAiEvent("invokeConsultSummary", requestId, getGeminiModel(), 200, 0, "internal", "Summary schema retry");
      continue;
    }
  }

  throw new AiServiceError({
    category: "internal",
    status: 500,
    model: getGeminiModel(),
    message: "AI health summary generation failed schema validation.",
    userMessage: "Failed to generate AI health summary. Please retry.",
  });
}

/**
 * Invokes LLM specifically for dynamic multi-system health risk assessment (Step 3).
 */
export async function invokeHealthAnalysis(
  userPayloadJson: string
): Promise<HealthAnalysisResult> {
  const requestId = crypto.randomUUID();

  const messages: LLMMessage[] = [
    {
      role: "user",
      content: `Analyze the following self-reported health risk assessment inputs and provide tailored dynamic risk evaluations:\n${userPayloadJson}`,
    },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    const rawText = await executeWithRetryAndFallback(requestId, HEALTH_ANALYSIS_SYSTEM_PROMPT, messages, 1200);

    try {
      const parsed = JSON.parse(rawText);
      const validated = HealthAnalysisSchema.safeParse(parsed);
      if (validated.success) {
        return validated.data;
      }
    } catch {
      // JSON parse error
    }

    if (attempt === 0) {
      logAiEvent("invokeHealthAnalysis", requestId, getGeminiModel(), 200, 0, "internal", "Analysis schema retry");
      continue;
    }
  }

  throw new AiServiceError({
    category: "internal",
    status: 500,
    model: getGeminiModel(),
    message: "Health assessment analysis failed schema validation.",
    userMessage: "Failed to complete AI health assessment. Please retry.",
  });
}
