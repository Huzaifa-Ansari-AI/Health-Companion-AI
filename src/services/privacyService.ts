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
