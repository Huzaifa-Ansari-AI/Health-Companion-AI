import { createClient } from "@supabase/supabase-js";

/**
 * Validates whether the provided Supabase URL and Key are real, configured values
 * rather than empty, missing, or template placeholders.
 */
export function validateSupabaseConfig(url?: string | null, key?: string | null): boolean {
  if (!url || !key) return false;

  const trimmedUrl = url.trim();
  const trimmedKey = key.trim();

  if (!trimmedUrl || !trimmedKey) return false;

  // Must be a valid HTTP/HTTPS URL
  if (!/^https?:\/\//i.test(trimmedUrl)) return false;

  // Reject known template placeholders
  const placeholderUrls = [
    "https://your-project-id.supabase.co",
    "https://placeholder.supabase.co",
  ];
  if (placeholderUrls.includes(trimmedUrl) || trimmedUrl.includes("your-project-id")) {
    return false;
  }

  const placeholderKeys = [
    "your-supabase-publishable-anon-key",
    "your-supabase-anon-key",
    "your-anon-public-key",
    "placeholder-anon-key",
  ];
  if (placeholderKeys.includes(trimmedKey) || trimmedKey.includes("your-supabase")) {
    return false;
  }

  // Supabase anon keys are JWTs (typically 100+ characters). Reject keys shorter than 20 chars.
  if (trimmedKey.length < 20) return false;

  return true;
}

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const rawKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ""
).trim();

export const isSupabaseConfigured = validateSupabaseConfig(rawUrl, rawKey);

if (!isSupabaseConfigured && typeof window !== "undefined") {
  // Inform the developer in console without exposing any sensitive details
  console.info(
    "%c[HealthAI Setup Note]%c Supabase credentials not found or using placeholders. Running in Demo / Offline mode.\nTo connect real Supabase Auth, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your root .env file and restart the dev server.",
    "color: #2E9E88; font-weight: bold;",
    "color: inherit;"
  );
}

// Fallback dummy credentials to prevent createClient constructor from throwing when unconfigured
const validUrl = isSupabaseConfigured ? rawUrl : "https://placeholder.supabase.co";
const validKey = isSupabaseConfigured ? rawKey : "placeholder-anon-key-that-is-long-enough-for-client";

export const supabase = createClient(validUrl, validKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
