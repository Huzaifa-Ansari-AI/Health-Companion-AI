// Milestone 2: Secure Share Links Service
// Manages creation, retrieval, revocation, and validation of expiring report share links.

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ReportData } from "@/types/report";

export interface ShareLinkItem {
  id: string;
  assessment_id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  view_count: number;
  status: "active" | "expired" | "revoked";
  token?: string; // Only stored in memory/session immediately upon creation
  share_url?: string;
}

export interface CreateShareOptions {
  expiryHours: 24 | 72 | 168; // 1 day, 3 days, 7 days
  hideName: boolean;
  hideChatExcerpts: boolean;
}

export interface SharedReportResult {
  snapshot: ReportData;
  expires_at: string;
  is_revoked: boolean;
}

const DEMO_SHARES_KEY = "healthai_demo_shares";

interface DemoShareRecord {
  id: string;
  user_id: string;
  assessment_id: string;
  token: string;
  token_hash: string;
  snapshot: ReportData;
  expires_at: string;
  revoked_at: string | null;
  view_count: number;
  created_at: string;
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateClientSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function determineShareStatus(expiresAt: string, revokedAt: string | null): "active" | "expired" | "revoked" {
  if (revokedAt) return "revoked";
  if (new Date() > new Date(expiresAt)) return "expired";
  return "active";
}

function getDemoShares(): DemoShareRecord[] {
  const raw = localStorage.getItem(DEMO_SHARES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveDemoShares(shares: DemoShareRecord[]): void {
  localStorage.setItem(DEMO_SHARES_KEY, JSON.stringify(shares));
}

/**
 * Creates a new secure, snapshot-based share link.
 */
export async function createShareLink(
  assessmentId: string,
  report: ReportData,
  options: CreateShareOptions,
  userId: string,
  isDemo = false
): Promise<{ shareItem: ShareLinkItem; token: string; shareUrl: string }> {
  // Sanitize snapshot according to privacy options
  const sanitizedSnapshot: ReportData = JSON.parse(JSON.stringify(report));
  if (options.hideName) {
    sanitizedSnapshot.patient.name = "Anonymous Patient (Hidden for privacy)";
  }
  if (options.hideChatExcerpts) {
    sanitizedSnapshot.symptoms.timeline = sanitizedSnapshot.symptoms.timeline.map((item) => ({
      ...item,
      duration: "Noted during assessment",
      intensity: "Reported",
    }));
  }

  // Demo mode implementation
  if (isDemo || !isSupabaseConfigured) {
    const rawToken = `demo_token_${generateClientSecureToken().slice(0, 32)}`;
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + options.expiryHours * 3600 * 1000).toISOString();
    const shareId = `demo-share-${Date.now()}`;

    const newRecord: DemoShareRecord = {
      id: shareId,
      user_id: userId,
      assessment_id: assessmentId,
      token: rawToken,
      token_hash: tokenHash,
      snapshot: sanitizedSnapshot,
      expires_at: expiresAt,
      revoked_at: null,
      view_count: 0,
      created_at: new Date().toISOString(),
    };

    const existing = getDemoShares();
    saveDemoShares([newRecord, ...existing]);

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${origin}/shared/${rawToken}`;

    return {
      shareItem: {
        id: shareId,
        assessment_id: assessmentId,
        created_at: newRecord.created_at,
        expires_at: expiresAt,
        revoked_at: null,
        view_count: 0,
        status: "active",
        token: rawToken,
        share_url: shareUrl,
      },
      token: rawToken,
      shareUrl,
    };
  }

  // Production: Invoke Supabase Edge Function create-share-link
  const { data, error } = await supabase.functions.invoke("create-share-link", {
    body: {
      assessment_id: assessmentId,
      expiry_hours: options.expiryHours,
      privacy_options: {
        hide_name: options.hideName,
        hide_chat_excerpts: options.hideChatExcerpts,
      },
      snapshot: sanitizedSnapshot,
    },
  });

  if (error || !data) {
    const msg = error?.message || data?.error || "Failed to create share link.";
    throw new Error(msg);
  }

  const rawToken = data.token;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${origin}/shared/${rawToken}`;

  return {
    shareItem: {
      id: data.id,
      assessment_id: assessmentId,
      created_at: new Date().toISOString(),
      expires_at: data.expires_at,
      revoked_at: null,
      view_count: 0,
      status: "active",
      token: rawToken,
      share_url: shareUrl,
    },
    token: rawToken,
    shareUrl,
  };
}

/**
 * Fetches all existing share links for a given assessment (owner-only).
 */
export async function fetchAssessmentShares(
  assessmentId: string,
  userId: string,
  isDemo = false
): Promise<ShareLinkItem[]> {
  if (isDemo || !isSupabaseConfigured) {
    const demoShares = getDemoShares();
    return demoShares
      .filter((s) => s.assessment_id === assessmentId && s.user_id === userId)
      .map((s) => {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        return {
          id: s.id,
          assessment_id: s.assessment_id,
          created_at: s.created_at,
          expires_at: s.expires_at,
          revoked_at: s.revoked_at,
          view_count: s.view_count,
          status: determineShareStatus(s.expires_at, s.revoked_at),
          share_url: `${origin}/shared/${s.token}`,
        };
      });
  }

  const { data, error } = await supabase
    .from("report_shares")
    .select("id, assessment_id, created_at, expires_at, revoked_at, view_count")
    .eq("assessment_id", assessmentId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assessment shares:", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    assessment_id: row.assessment_id,
    created_at: row.created_at,
    expires_at: row.expires_at,
    revoked_at: row.revoked_at,
    view_count: row.view_count || 0,
    status: determineShareStatus(row.expires_at, row.revoked_at),
  }));
}

/**
 * Revokes an active share link immediately.
 */
export async function revokeShareLink(shareId: string, isDemo = false): Promise<void> {
  if (isDemo || !isSupabaseConfigured) {
    const demoShares = getDemoShares();
    const updated = demoShares.map((s) =>
      s.id === shareId ? { ...s, revoked_at: new Date().toISOString() } : s
    );
    saveDemoShares(updated);
    return;
  }

  const { data, error } = await supabase.functions.invoke("revoke-share-link", {
    body: { share_id: shareId },
  });

  if (error || !data?.success) {
    const msg = error?.message || data?.error || "Failed to revoke share link.";
    throw new Error(msg);
  }
}

/**
 * Retrieves a shared report by its unhashed public token.
 * Validates expiration, revocation, and increments view count.
 */
export async function getSharedReport(token: string, isDemo = false): Promise<SharedReportResult> {
  if (isDemo || !isSupabaseConfigured) {
    const demoShares = getDemoShares();
    const tokenHash = await hashToken(token);
    const found = demoShares.find((s) => s.token === token || s.token_hash === tokenHash);

    if (!found) {
      throw new Error("This health report link is invalid, expired, or has been revoked.");
    }

    const now = new Date();
    if (found.revoked_at !== null || now > new Date(found.expires_at)) {
      throw new Error("This health report link is invalid, expired, or has been revoked.");
    }

    // Increment demo view count
    found.view_count += 1;
    saveDemoShares(demoShares);

    return {
      snapshot: found.snapshot,
      expires_at: found.expires_at,
      is_revoked: false,
    };
  }

  // Invoke public Edge Function get-shared-report
  const { data, error } = await supabase.functions.invoke("get-shared-report", {
    body: { token },
  });

  if (error || !data || !data.snapshot) {
    throw new Error("This health report link is invalid, expired, or has been revoked.");
  }

  return {
    snapshot: data.snapshot,
    expires_at: data.expires_at,
    is_revoked: Boolean(data.is_revoked),
  };
}
