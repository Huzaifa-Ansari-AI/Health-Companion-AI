// Unit Tests: privacyService (Milestone 4 Phase 1)
import { describe, it, expect, beforeEach } from "vitest";
import {
  getDefaultConsentsMap,
  getUserConsents,
  updateConsent,
  hasConsent,
  getConsentAuditHistory,
} from "./privacyService";
import { CONSENT_TYPES, ConsentType } from "@/types/privacy";

describe("privacyService", () => {
  const TEST_USER = "test-user-privacy-m4";
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
  });

  describe("Default Consent State (Strict Opt-In)", () => {
    it("ensures every consent type defaults to strictly false (OFF)", () => {
      const defaults = getDefaultConsentsMap();

      for (const type of CONSENT_TYPES) {
        expect(defaults[type].granted).toBe(false);
        expect(defaults[type].updatedAt).toBeNull();
      }
    });

    it("returns all false when a new user checks consents with no prior logs", async () => {
      const consents = await getUserConsents(TEST_USER, true);

      for (const type of CONSENT_TYPES) {
        expect(consents[type].granted).toBe(false);
      }
    });

    it("hasConsent returns false for all types initially", async () => {
      for (const type of CONSENT_TYPES) {
        const granted = await hasConsent(TEST_USER, type, true);
        expect(granted).toBe(false);
      }
    });
  });

  describe("Granular Opt-In Updates & Audit Trail", () => {
    it("grants a specific consent and preserves others as false", async () => {
      await updateConsent(
        TEST_USER,
        {
          consent_type: "ai_chat_processing",
          granted: true,
        },
        true
      );

      const consents = await getUserConsents(TEST_USER, true);
      expect(consents.ai_chat_processing.granted).toBe(true);
      expect(consents.ai_chat_processing.updatedAt).toBeTruthy();

      // All other consents must remain strictly false
      expect(consents.ai_profile_context.granted).toBe(false);
      expect(consents.ai_report_generation.granted).toBe(false);
      expect(consents.share_links.granted).toBe(false);
    });

    it("appends to audit history and reflects immediate revocation", async () => {
      // 1. Grant consent
      await updateConsent(
        TEST_USER,
        { consent_type: "ai_profile_context", granted: true },
        true
      );
      expect(await hasConsent(TEST_USER, "ai_profile_context", true)).toBe(true);

      // 2. Revoke consent
      await updateConsent(
        TEST_USER,
        { consent_type: "ai_profile_context", granted: false },
        true
      );
      expect(await hasConsent(TEST_USER, "ai_profile_context", true)).toBe(false);

      // 3. Inspect audit trail: both events must be preserved in history (append-only)
      const audit = await getConsentAuditHistory(TEST_USER, true);
      expect(audit).toHaveLength(2);
      expect(audit[0].granted).toBe(false); // Most recent event
      expect(audit[1].granted).toBe(true);  // Initial grant
    });

    it("rejects invalid consent types with Zod validation error", async () => {
      await expect(
        updateConsent(
          TEST_USER,
          {
            consent_type: "invalid_unsupported_type" as unknown as ConsentType,
            granted: true,
          },
          true
        )
      ).rejects.toThrow();
    });
  });

  describe("Data Portability & Export (exportUserData)", () => {
    it("compiles a comprehensive archive of user data and active consents", async () => {
      const { exportUserData } = await import("./privacyService");

      // Set a consent first
      await updateConsent(
        TEST_USER,
        { consent_type: "ai_chat_processing", granted: true },
        true
      );

      const payload = await exportUserData(TEST_USER, true);

      expect(payload.user_id).toBe(TEST_USER);
      expect(payload.app).toBe("Health Companion AI");
      expect(payload.privacy_notice).toContain("personal wellness data");
      expect(payload.consents.active.ai_chat_processing.granted).toBe(true);
      expect(payload.consents.active.ai_profile_context.granted).toBe(false);
      expect(Array.isArray(payload.assessments)).toBe(true);
      expect(Array.isArray(payload.checkins)).toBe(true);
      expect(Array.isArray(payload.chat_sessions)).toBe(true);
    });
  });

  describe("Cascade Data Deletion (deleteUserDataCascade)", () => {
    it("permanently purges user records and clears privacy consents", async () => {
      const { deleteUserDataCascade } = await import("./privacyService");

      // Grant a consent
      await updateConsent(
        TEST_USER,
        { consent_type: "ai_profile_context", granted: true },
        true
      );
      expect(await hasConsent(TEST_USER, "ai_profile_context", true)).toBe(true);

      // Perform cascade wipe
      await deleteUserDataCascade(TEST_USER, true);

      // After wipe, all consents are reset to strictly false
      const consentsAfter = await getUserConsents(TEST_USER, true);
      expect(consentsAfter.ai_profile_context.granted).toBe(false);
      expect(consentsAfter.ai_profile_context.updatedAt).toBeNull();
    });
  });
});
