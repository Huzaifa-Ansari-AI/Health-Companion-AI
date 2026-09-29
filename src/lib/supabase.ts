import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== "https://your-project-id.supabase.co"
);

// Fallback dummy URL to prevent createClient constructor from crashing if env is not yet set
const validUrl = isSupabaseConfigured ? supabaseUrl : "https://placeholder.supabase.co";
const validKey = isSupabaseConfigured ? supabaseAnonKey : "placeholder-anon-key";

export const supabase = createClient(validUrl, validKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
