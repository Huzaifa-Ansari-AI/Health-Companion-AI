// Supabase Edge Function: create-share-link
// Milestone 2 - Creates a secure, expiring, snapshot-based doctor share link.
// Generates a 32-byte cryptographically secure token, stores only its SHA-256 hash.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ACTIVE_LINKS_PER_USER = 10;
const MAX_EXPIRY_HOURS = 168; // 7 days

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? supabaseAnonKey;

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

    const body = await req.json();
    const { assessment_id, expiry_hours = 72, privacy_options = {}, snapshot } = body;

    if (!assessment_id || !snapshot) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enforce expiry boundary (24h, 72h, or 168h; max 168h)
    const hours = Math.min(Math.max(Number(expiry_hours) || 72, 1), MAX_EXPIRY_HOURS);
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

    // Verify ownership of the assessment
    const { data: assessment, error: assessmentError } = await supabaseClient
      .from("health_assessments")
      .select("id, user_id")
      .eq("id", assessment_id)
      .eq("user_id", user.id)
      .single();

    if (assessmentError || !assessment) {
      return new Response(JSON.stringify({ error: "Assessment record not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check active links limit
    const nowIso = new Date().toISOString();
    const { count, error: countError } = await supabaseClient
      .from("report_shares")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .gt("expires_at", nowIso);

    if (!countError && typeof count === "number" && count >= MAX_ACTIVE_LINKS_PER_USER) {
      return new Response(
        JSON.stringify({
          error: `Active share links limit reached (maximum ${MAX_ACTIVE_LINKS_PER_USER}). Please revoke an existing link first.`,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Apply privacy options to the immutable snapshot
    const sanitizedSnapshot = JSON.parse(JSON.stringify(snapshot));
    if (privacy_options.hide_name) {
      if (sanitizedSnapshot.patient) {
        sanitizedSnapshot.patient.name = "Anonymous (anonymized for privacy)";
      }
    }
    if (privacy_options.hide_chat_excerpts) {
      if (sanitizedSnapshot.symptoms?.timeline) {
        sanitizedSnapshot.symptoms.timeline = sanitizedSnapshot.symptoms.timeline.map((item: any) => ({
          ...item,
          duration: "Noted during check",
          intensity: "Reported",
        }));
      }
    }

    // Generate random 32-byte token and its SHA-256 hash
    const rawToken = generateSecureToken();
    const tokenHash = await hashToken(rawToken);

    // Insert into report_shares
    const { data: shareRecord, error: insertError } = await supabaseClient
      .from("report_shares")
      .insert({
        user_id: user.id,
        assessment_id: assessment_id,
        token_hash: tokenHash,
        snapshot: sanitizedSnapshot,
        expires_at: expiresAt,
      })
      .select("id, created_at, expires_at")
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return the full raw token only ONCE
    return new Response(
      JSON.stringify({
        id: shareRecord.id,
        token: rawToken,
        expires_at: shareRecord.expires_at,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
