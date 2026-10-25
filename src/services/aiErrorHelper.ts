// AI Error Helper: Client-Side Structured Error Unpacking and Mapping
// Extracts the actual HTTP response payload from Supabase FunctionsHttpError (error.context)
// Maps error categories to clear, user-facing explanations and actionable next steps.

export type AiErrorCategory =
  | "key_missing"
  | "auth_invalid"
  | "model_not_found"
  | "rate_limited"
  | "timeout"
  | "upstream_unavailable"
  | "bad_request"
  | "internal";

export interface StructuredClientError {
  category: AiErrorCategory;
  message: string;
  userMessage: string;
  resolution: string;
  details?: string;
  retry_after?: number;
  model?: string;
  latencyMs?: number;
}

/**
 * Maps an error category to a concise, user-friendly message and troubleshooting resolution.
 */
export function getCategoryDetails(
  category: AiErrorCategory,
  model?: string,
  retryAfter?: number
): { userMessage: string; resolution: string } {
  switch (category) {
    case "key_missing":
      return {
        userMessage: "AI service key is missing in Supabase Edge Functions.",
        resolution: "Go to Supabase Project Dashboard > Edge Functions > Manage Secrets, and add secret GEMINI_API_KEY.",
      };
    case "auth_invalid":
      return {
        userMessage: "Invalid or unauthorized AI API key.",
        resolution: "Verify that GEMINI_API_KEY in your Supabase Edge Function secrets is valid and active in Google AI Studio.",
      };
    case "model_not_found":
      return {
        userMessage: `The AI model (${model || "configured model"}) is not found or has been retired.`,
        resolution: "Go to Supabase Project Secrets and update GEMINI_MODEL to an active model (e.g. gemini-3.5-flash).",
      };
    case "rate_limited":
      return {
        userMessage: retryAfter
          ? `AI request rate limit reached. Please wait ${retryAfter} seconds before retrying.`
          : "AI request rate limit reached. Please wait a moment before trying again.",
        resolution: "Google Gemini quota or local rate limit was exceeded. Wait a few moments or review your Google AI Studio quota limits.",
      };
    case "timeout":
      return {
        userMessage: "The AI request timed out before a response was received.",
        resolution: "The AI service is experiencing high latency. You can retry now or set GEMINI_FALLBACK_MODEL in Supabase secrets.",
      };
    case "upstream_unavailable":
      return {
        userMessage: "Google Gemini service is temporarily overloaded or unavailable.",
        resolution: "Google's AI servers are temporarily experiencing high load. Please retry in a few moments.",
      };
    case "bad_request":
      return {
        userMessage: "The AI request could not be processed due to invalid parameters.",
        resolution: "Please review your message or assessment inputs and try again.",
      };
    case "internal":
    default:
      return {
        userMessage: "An unexpected error occurred while communicating with the AI service.",
        resolution: "Please try again shortly. If the issue persists, inspect the Supabase Edge Function logs.",
      };
  }
}

/**
 * Classifies an arbitrary error string, status code, or message into an AiErrorCategory.
 */
export function classifyErrorText(text: string, status?: number): AiErrorCategory {
  const lower = text.toLowerCase();

  if (status === 404 || lower.includes("not found") || lower.includes("is not supported for generatecontent")) {
    return "model_not_found";
  }
  if (
    status === 429 ||
    lower.includes("rate limit") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted")
  ) {
    return "rate_limited";
  }
  if (
    status === 401 ||
    status === 403 ||
    lower.includes("api_key_invalid") ||
    lower.includes("unauthorized") ||
    lower.includes("permission_denied")
  ) {
    return "auth_invalid";
  }
  if (
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("aborterror") ||
    status === 504
  ) {
    return "timeout";
  }
  if (lower.includes("key is not configured") || lower.includes("key_missing") || lower.includes("missing secret")) {
    return "key_missing";
  }
  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    lower.includes("unavailable") ||
    lower.includes("overloaded") ||
    lower.includes("ai_unavailable")
  ) {
    return "upstream_unavailable";
  }
  if (status === 400 || lower.includes("invalid argument")) {
    return "bad_request";
  }
  return "internal";
}

/**
 * Unpacks Supabase FunctionsHttpError (reading error.context response body)
 * to uncover the actual server-side error payload instead of generic "non-2xx" messages.
 */
export async function parseEdgeFunctionError(
  error: unknown,
  fallbackData?: unknown
): Promise<StructuredClientError> {
  let category: AiErrorCategory = "internal";
  let message = "";
  let details: string | undefined;
  let retryAfter: number | undefined;
  let model: string | undefined;

  // 1. Try reading the raw response from error.context (FunctionsHttpError)
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;
    if (context && typeof (context as Response).json === "function") {
      try {
        const body = await (context as Response).json();
        if (body && typeof body === "object") {
          if (body.category && typeof body.category === "string") {
            category = body.category as AiErrorCategory;
          } else if (body.error && typeof body.error === "string") {
            category = classifyErrorText(body.error);
          }
          message = body.message || body.error || "";
          details = body.details;
          retryAfter = body.retry_after;
          model = body.model;
        }
      } catch {
        // Fallback to text if JSON parsing fails
        try {
          if (typeof (context as Response).text === "function") {
            const rawText = await (context as Response).text();
            category = classifyErrorText(rawText);
            details = rawText;
          }
        } catch {
          // Response body already drained or inaccessible
        }
      }
    }
  }

  // 2. Check fallbackData if response was returned without throwing
  if (!message && fallbackData && typeof fallbackData === "object") {
    const dataObj = fallbackData as Record<string, unknown>;
    if (dataObj.category && typeof dataObj.category === "string") {
      category = dataObj.category as AiErrorCategory;
    } else if (dataObj.error && typeof dataObj.error === "string") {
      category = classifyErrorText(dataObj.error);
    }
    message = String(dataObj.message || dataObj.error || "");
    details = dataObj.details ? String(dataObj.details) : undefined;
    retryAfter = typeof dataObj.retry_after === "number" ? dataObj.retry_after : undefined;
    model = typeof dataObj.model === "string" ? dataObj.model : undefined;
  }

  // 3. Fallback to inspecting error.message if context was empty
  if (!message && error instanceof Error) {
    category = classifyErrorText(error.message);
    message = error.message;
  }

  // 4. Resolve clean user-facing message and resolution
  const categoryInfo = getCategoryDetails(category, model, retryAfter);

  return {
    category,
    message: message || categoryInfo.userMessage,
    userMessage: categoryInfo.userMessage,
    resolution: categoryInfo.resolution,
    details,
    retry_after: retryAfter,
    model,
  };
}
