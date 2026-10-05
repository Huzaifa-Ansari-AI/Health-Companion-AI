// Milestone 4: Privacy & Consent Service
// Enforces strict opt-in defaults (OFF by default), append-only audit logs, and granular toggles.

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  ConsentType,
  CONSENT_TYPES,
  PrivacyConsentRecord,
  UserConsentsMap,
  UpdateConsentInput,
  updateConsentInputSchema,
  CURRENT_POLICY_VERSION,
} from "@/types/privacy";

const DEMO_CONSENTS_KEY_PREFIX = "healthai_demo_consents_";

class MemoryStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

const memoryStorage = new MemoryStorage();

function getStorage() {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== "undefined" && "localStorage" in globalThis && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return memoryStorage;
}

/**
 * Returns default consent map where EVERY consent type is strictly FALSE (opt-in).
 */
export function getDefaultConsentsMap(): UserConsentsMap {
  const map = {} as UserConsentsMap;
  for (const type of CONSENT_TYPES) {
    map[type] = {
      granted: false,
      updatedAt: null,
      policyVersion: CURRENT_POLICY_VERSION,
    };
  }
  return map;
}

/**
 * Retrieves the current active consent states for a user.
 * Evaluates the append-only log: the latest record per consent_type defines current state.
 */
export async function getUserConsents(
  userId: string,
  isDemo = false
): Promise<UserConsentsMap> {
  const consentsMap = getDefaultConsentsMap();

  if (isDemo || !isSupabaseConfigured) {
    const raw = getStorage().getItem(`${DEMO_CONSENTS_KEY_PREFIX}${userId}`);
    if (!raw) return consentsMap;

    const records: PrivacyConsentRecord[] = JSON.parse(raw);
    for (const record of records) {
      if (CONSENT_TYPES.includes(record.consent_type)) {
        // If not already set or this record is newer
        const current = consentsMap[record.consent_type];
        if (
          !current.updatedAt ||
          new Date(record.created_at) > new Date(current.updatedAt)
        ) {
          consentsMap[record.consent_type] = {
            granted: record.granted,
            updatedAt: record.created_at,
            policyVersion: record.policy_version,
          };
        }
      }
    }
    return consentsMap;
  }

  const { data, error } = await supabase
    .from("privacy_consents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load privacy consents: ${error.message}`);
  }

  const records = (data as PrivacyConsentRecord[]) || [];

  // Group by consent_type picking the latest record
  for (const record of records) {
    const type = record.consent_type as ConsentType;
    if (CONSENT_TYPES.includes(type)) {
      const current = consentsMap[type];
      if (!current.updatedAt) {
        // Since records are ordered descending, the first encountered is the latest
        consentsMap[type] = {
          granted: record.granted,
          updatedAt: record.created_at,
          policyVersion: record.policy_version,
        };
      }
    }
  }

  return consentsMap;
}

/**
 * Writes an append-only consent update event.
 * Never modifies or deletes past records; always appends a new audit row.
 */
export async function updateConsent(
  userId: string,
  input: UpdateConsentInput,
  isDemo = false
): Promise<PrivacyConsentRecord> {
  const validated = updateConsentInputSchema.parse(input);

  if (isDemo || !isSupabaseConfigured) {
    const raw = getStorage().getItem(`${DEMO_CONSENTS_KEY_PREFIX}${userId}`);
    const existing: PrivacyConsentRecord[] = raw ? JSON.parse(raw) : [];

    const newRecord: PrivacyConsentRecord = {
      id: `demo-cst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      consent_type: validated.consent_type,
      granted: validated.granted,
      policy_version: validated.policy_version || CURRENT_POLICY_VERSION,
      created_at: new Date().toISOString(),
    };

    existing.unshift(newRecord);
    getStorage().setItem(
      `${DEMO_CONSENTS_KEY_PREFIX}${userId}`,
      JSON.stringify(existing)
    );
    return newRecord;
  }

  const { data, error } = await supabase
    .from("privacy_consents")
    .insert({
      user_id: userId,
      consent_type: validated.consent_type,
      granted: validated.granted,
      policy_version: validated.policy_version || CURRENT_POLICY_VERSION,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update consent: ${error.message}`);
  }

  return data as PrivacyConsentRecord;
}

/**
 * Fast consent evaluation helper.
 */
export async function hasConsent(
  userId: string,
  type: ConsentType,
  isDemo = false
): Promise<boolean> {
  const consents = await getUserConsents(userId, isDemo);
  return consents[type]?.granted ?? false;
}

/**
 * Returns full historical audit log of consent updates for user transparency.
 */
export async function getConsentAuditHistory(
  userId: string,
  isDemo = false
): Promise<PrivacyConsentRecord[]> {
  if (isDemo || !isSupabaseConfigured) {
    const raw = getStorage().getItem(`${DEMO_CONSENTS_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  }

  const { data, error } = await supabase
    .from("privacy_consents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load consent audit trail: ${error.message}`);
  }

  return (data as PrivacyConsentRecord[]) || [];
}

/**
 * Triggers a client-side browser file download of JSON data.
 * Safely no-ops in non-DOM test environments.
 */
export function triggerJsonDownload(data: object, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface UserDataExportPayload {
  export_date: string;
  app: string;
  version: string;
  privacy_notice: string;
  user_id: string;
  demographics: unknown;
  health_profile: unknown;
  consents: {
    active: UserConsentsMap;
    audit_history: PrivacyConsentRecord[];
  };
  assessments: unknown[];
  checkins: unknown[];
  measurements: unknown[];
  achievements: unknown[];
  tracking_streaks: unknown;
  chat_sessions: unknown[];
}

/**
 * Compiles a comprehensive machine-readable JSON package of all user records
 * and triggers immediate download. Records audit event in data_export_requests.
 */
export async function exportUserData(
  userId: string,
  isDemo = false
): Promise<UserDataExportPayload> {
  const { getComprehensiveProfile } = await import("./profileService");
  const { fetchUserAssessments } = await import("./healthService");
  const {
    getCheckinsByRange,
    getMeasurementsByRange,
    getUserAchievements,
    formatLocalDate,
    getPastLocalDate,
  } = await import("./trackingService");
  const { calculateStreakStats } = await import("@/lib/streaks");
  const { listChatSessions, loadChatMessages } = await import("./chatService");
  const { fetchProfileDemographics } = await import("./reportService");

  const today = formatLocalDate();
  const oneYearAgo = getPastLocalDate(365);

  const [
    demographics,
    healthProfile,
    activeConsents,
    auditHistory,
    assessments,
    checkins,
    measurements,
    achievements,
    chatSessions,
  ] = await Promise.all([
    fetchProfileDemographics(userId, isDemo).catch(() => null),
    getComprehensiveProfile(userId, isDemo).catch(() => null),
    getUserConsents(userId, isDemo).catch(() => getDefaultConsentsMap()),
    getConsentAuditHistory(userId, isDemo).catch(() => []),
    fetchUserAssessments(userId, isDemo).catch(() => []),
    getCheckinsByRange(userId, oneYearAgo, today, isDemo).catch(() => []),
    getMeasurementsByRange(userId, undefined, isDemo).catch(() => []),
    getUserAchievements(userId, isDemo).catch(() => []),
    listChatSessions(userId, isDemo).catch(() => []),
  ]);

  const streakStats = calculateStreakStats(
    checkins.map((c) => c.checkin_date),
    today
  );

  // Load messages for each session
  const populatedSessions = await Promise.all(
    chatSessions.map(async (s) => {
      const messages = await loadChatMessages(s.id, isDemo).catch(() => []);
      return { ...s, messages };
    })
  );

  const payload: UserDataExportPayload = {
    export_date: new Date().toISOString(),
    app: "Health Companion AI",
    version: CURRENT_POLICY_VERSION,
    privacy_notice:
      "This export contains your personal wellness data aligned with good privacy practices. Keep this file secure.",
    user_id: userId,
    demographics,
    health_profile: healthProfile,
    consents: {
      active: activeConsents,
      audit_history: auditHistory,
    },
    assessments,
    checkins,
    measurements,
    achievements,
    tracking_streaks: streakStats,
    chat_sessions: populatedSessions,
  };

  // Record audit row in data_export_requests
  if (isDemo || !isSupabaseConfigured) {
    const rawRequests = getStorage().getItem(`healthai_demo_export_requests_${userId}`);
    const requests = rawRequests ? JSON.parse(rawRequests) : [];
    requests.unshift({
      id: `demo-exp-${Date.now()}`,
      user_id: userId,
      format: "json",
      status: "completed",
      created_at: new Date().toISOString(),
    });
    getStorage().setItem(`healthai_demo_export_requests_${userId}`, JSON.stringify(requests));
  } else {
    try {
      await supabase.from("data_export_requests").insert({
        user_id: userId,
        format: "json",
        status: "completed",
      });
    } catch {
      // Non-blocking for download
    }
  }

  // Trigger client file download
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerJsonDownload(payload, `health-companion-export-${dateStr}.json`);

  return payload;
}

/**
 * Permanently deletes all personal data across all database tables.
 * Irreversible cascade wipe.
 */
export async function deleteUserDataCascade(
  userId: string,
  isDemo = false
): Promise<void> {
  if (isDemo || !isSupabaseConfigured) {
    // Clear all demo storage keys associated with the user
    const storage = getStorage();
    const keysToRemove = [
      `${DEMO_CONSENTS_KEY_PREFIX}${userId}`,
      `healthai_demo_health_profile_${userId}`,
      `healthai_demo_allergies_${userId}`,
      `healthai_demo_conditions_${userId}`,
      `healthai_demo_family_history_${userId}`,
      `healthai_demo_medications_${userId}`,
      `healthai_demo_daily_checkins_${userId}`,
      `healthai_demo_tracking_streak_${userId}`,
      `healthai_demo_export_requests_${userId}`,
      `healthai_demo_deletion_requests_${userId}`,
      "healthai_demo_chat_sessions",
      "healthai_demo_chat_messages",
      "healthai_demo_assessments",
      "healthai_demo_profile_demographics",
    ];

    keysToRemove.forEach((k) => storage.removeItem(k));
    return;
  }

  // 1. Log deletion request for compliance
  try {
    await supabase.from("account_deletion_requests").insert({
      user_id: userId,
      status: "completed",
      confirmed_at: new Date().toISOString(),
    });
  } catch {
    // Continue with cascade wipe
  }

  // 2. Cascade delete from child tables
  const tables = [
    "privacy_consents",
    "profile_medications",
    "profile_family_history",
    "profile_conditions",
    "profile_allergies",
    "health_profiles",
    "report_shares",
    "daily_checkins",
    "tracking_streaks",
    "chat_messages",
    "chat_sessions",
    "health_assessments",
    "data_export_requests",
    "account_deletion_requests",
  ];

  for (const table of tables) {
    try {
      await supabase.from(table).delete().eq("user_id", userId);
    } catch {
      // Continue wiping remaining tables
    }
  }

  // 3. Delete from profiles (which also triggers Postgres CASCADE on any remaining foreign keys)
  try {
    await supabase.from("profiles").delete().eq("id", userId);
  } catch {
    // Profile deletion attempted
  }
}

