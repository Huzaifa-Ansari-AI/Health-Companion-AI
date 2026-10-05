// Component & Flow Tests: Milestone 4 Phase 4 (Privacy Center & Data Management)
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getUserConsents,
  updateConsent,
  getConsentAuditHistory,
  exportUserData,
  deleteUserDataCascade,
} from "./privacyService";
import { upsertHealthProfile, addAllergy } from "./profileService";

describe("Privacy Center & Data Management Flow", () => {
  const TEST_USER = "privacy-flow-user-m4";
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    global.localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      length: 0,
      key: () => null,
    } as Storage;
    vi.clearAllMocks();
  });

  it("manages independent granular consent toggles and logs audit trail", async () => {
    // 1. Initial state: all false
    const initial = await getUserConsents(TEST_USER, true);
    expect(initial.ai_chat_processing.granted).toBe(false);
    expect(initial.ai_profile_context.granted).toBe(false);

    // 2. Grant ai_chat_processing
    await updateConsent(
      TEST_USER,
      { consent_type: "ai_chat_processing", granted: true },
      true
    );

    // 3. Grant ai_profile_context
    await updateConsent(
      TEST_USER,
      { consent_type: "ai_profile_context", granted: true },
      true
    );

    const active = await getUserConsents(TEST_USER, true);
    expect(active.ai_chat_processing.granted).toBe(true);
    expect(active.ai_profile_context.granted).toBe(true);
    expect(active.share_links.granted).toBe(false);

    // 4. Revoke ai_profile_context
    await updateConsent(
      TEST_USER,
      { consent_type: "ai_profile_context", granted: false },
      true
    );

    const afterRevoke = await getUserConsents(TEST_USER, true);
    expect(afterRevoke.ai_profile_context.granted).toBe(false);
    expect(afterRevoke.ai_chat_processing.granted).toBe(true);

    // 5. Verify audit history has all 3 events
    const audit = await getConsentAuditHistory(TEST_USER, true);
    expect(audit).toHaveLength(3);
    expect(audit[0].consent_type).toBe("ai_profile_context");
    expect(audit[0].granted).toBe(false);
  });

  it("exports comprehensive machine-readable archive including health profile & consents", async () => {
    // Seed health data
    await upsertHealthProfile(TEST_USER, { age: 31, gender: "Non-binary" }, true);
    await addAllergy(TEST_USER, { name: "Strawberries", severity: "mild" }, true);
    await updateConsent(
      TEST_USER,
      { consent_type: "analytics", granted: true },
      true
    );

    const archive = await exportUserData(TEST_USER, true);

    expect(archive.user_id).toBe(TEST_USER);
    expect(archive.version).toBe("1.0");
    expect(archive.consents.active.analytics.granted).toBe(true);
    expect(archive.health_profile).toBeDefined();
    expect(archive.tracking_streaks).toBeDefined();
  });

  it("executes complete cascade data deletion and restores clean initial state", async () => {
    // Seed profile and consent
    await upsertHealthProfile(TEST_USER, { age: 28 }, true);
    await updateConsent(
      TEST_USER,
      { consent_type: "ai_chat_processing", granted: true },
      true
    );

    // Cascade wipe
    await deleteUserDataCascade(TEST_USER, true);

    // Verify consents reset to default
    const consents = await getUserConsents(TEST_USER, true);
    expect(consents.ai_chat_processing.granted).toBe(false);
    expect(consents.ai_chat_processing.updatedAt).toBeNull();
  });
});
