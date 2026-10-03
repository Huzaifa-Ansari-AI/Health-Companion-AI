// Supabase Edge Function: get-shared-report
// Milestone 2 - Public read-only endpoint for accessing shared reports via secure tokens.
// Validates token hash, enforces expiration/revocation, increments view count, and rate limits per IP.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generic safe error message that never reveals whether a link existed, expired, or was revoked
const GENERIC_NOT_FOUND_ERROR = "This health report link is invalid, expired, or has been revoked.";

// In-memory rate limiting map: ip -> timestamps
const ipRateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipRateLimitMap.get(ip) || [];
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (valid.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  valid.push(now);
  ipRateLimitMap.set(ip, valid);
  return true;
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Rate Limiting per IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
    if (!checkIpRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait a moment before trying again." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Extract Token
    let token = "";
    if (req.method === "GET") {
      const url = new URL(req.url);
      token = url.searchParams.get("token") || "";
    } else {
      const body = await req.json().catch(() => ({}));
      token = body.token || "";
    }

    if (!token || typeof token !== "string" || token.length < 16) {
      return new Response(JSON.stringify({ error: GENERIC_NOT_FOUND_ERROR }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Compute SHA-256 Hash
    const tokenHash = await hashToken(token);

    // 4. Query report_shares via service-role client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: share, error: fetchError } = await adminClient
      .from("report_shares")
      .select("id, snapshot, expires_at, revoked_at, view_count")
      .eq("token_hash", tokenHash)
      .single();

    if (fetchError || !share) {
      return new Response(JSON.stringify({ error: GENERIC_NOT_FOUND_ERROR }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Check if revoked or expired
    const now = new Date();
    const expiresAt = new Date(share.expires_at);

    if (share.revoked_at !== null || now > expiresAt) {
      return new Response(JSON.stringify({ error: GENERIC_NOT_FOUND_ERROR }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Increment view_count & update last_viewed_at
    await adminClient
      .from("report_shares")
      .update({
        view_count: (share.view_count || 0) + 1,
        last_viewed_at: now.toISOString(),
      })
      .eq("id", share.id);

    return new Response(
      JSON.stringify({
        snapshot: share.snapshot,
        expires_at: share.expires_at,
        is_revoked: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: GENERIC_NOT_FOUND_ERROR }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
