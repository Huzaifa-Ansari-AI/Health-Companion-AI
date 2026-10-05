// Unit Tests: profileService (Milestone 4 Phase 1)
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getHealthProfile,
  upsertHealthProfile,
  addAllergy,
  getAllergies,
  deleteAllergy,
  addCondition,
  getConditions,
  deleteCondition,
  addFamilyHistory,
  getFamilyHistory,
  deleteFamilyHistory,
  addMedication,
  getMedications,
  deleteMedication,
  getComprehensiveProfile,
  calculateProfileCompleteness,
} from "./profileService";

describe("profileService", () => {
  const TEST_USER = "test-user-m4";
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

  describe("HealthProfile (Basic Demographics)", () => {
    it("returns null if no profile exists", async () => {
      const profile = await getHealthProfile(TEST_USER, true);
      expect(profile).toBeNull();
    });

    it("upserts and retrieves health profile with valid data", async () => {
      const saved = await upsertHealthProfile(
        TEST_USER,
        {
          age: 28,
          gender: "Non-binary",
          time_zone: "America/New_York",
        },
        true
      );

      expect(saved.user_id).toBe(TEST_USER);
      expect(saved.age).toBe(28);
      expect(saved.gender).toBe("Non-binary");

      const fetched = await getHealthProfile(TEST_USER, true);
      expect(fetched).toEqual(saved);
    });

    it("rejects underage profiles under 18 with Zod error", async () => {
      await expect(
        upsertHealthProfile(TEST_USER, { age: 16 }, true)
      ).rejects.toThrow(/at least 18 years/);
    });

    it("rejects unrealistic age (>120)", async () => {
      await expect(
        upsertHealthProfile(TEST_USER, { age: 150 }, true)
      ).rejects.toThrow(/valid age/);
    });
  });

  describe("Allergies CRUD", () => {
    it("adds and retrieves allergies", async () => {
      const allergy = await addAllergy(
        TEST_USER,
        {
          name: "Penicillin",
          reaction: "Skin hives and mild swelling",
          severity: "moderate",
        },
        true
      );

      expect(allergy.name).toBe("Penicillin");
      expect(allergy.severity).toBe("moderate");

      const list = await getAllergies(TEST_USER, true);
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe("Penicillin");
    });

    it("deletes an allergy by id", async () => {
      const allergy = await addAllergy(
        TEST_USER,
        { name: "Peanuts", severity: "severe" },
        true
      );
      expect(await getAllergies(TEST_USER, true)).toHaveLength(1);

      await deleteAllergy(allergy.id, TEST_USER, true);
      expect(await getAllergies(TEST_USER, true)).toHaveLength(0);
    });

    it("rejects empty allergy name", async () => {
      await expect(
        addAllergy(TEST_USER, { name: "   " }, true)
      ).rejects.toThrow(/Allergy name is required/);
    });
  });

  describe("Conditions CRUD", () => {
    it("adds active and managed chronic conditions", async () => {
      const cond = await addCondition(
        TEST_USER,
        {
          name: "Asthma",
          status: "managed",
          since_year: 2018,
        },
        true
      );

      expect(cond.name).toBe("Asthma");
      expect(cond.status).toBe("managed");

      const list = await getConditions(TEST_USER, true);
      expect(list).toHaveLength(1);
    });

    it("deletes a condition", async () => {
      const cond = await addCondition(
        TEST_USER,
        { name: "Hypertension", status: "active" },
        true
      );
      await deleteCondition(cond.id, TEST_USER, true);
      expect(await getConditions(TEST_USER, true)).toHaveLength(0);
    });

    it("rejects invalid future since_year", async () => {
      await expect(
        addCondition(
          TEST_USER,
          { name: "Migraine", since_year: 2099, status: "active" },
          true
        )
      ).rejects.toThrow(/cannot be in the future/);
    });
  });

  describe("Family History CRUD", () => {
    it("adds family health history", async () => {
      const entry = await addFamilyHistory(
        TEST_USER,
        {
          condition_name: "Type 2 Diabetes",
          relation: "Maternal Grandmother",
        },
        true
      );

      expect(entry.condition_name).toBe("Type 2 Diabetes");
      expect(entry.relation).toBe("Maternal Grandmother");

      const list = await getFamilyHistory(TEST_USER, true);
      expect(list).toHaveLength(1);
    });

    it("deletes a family history entry", async () => {
      const entry = await addFamilyHistory(
        TEST_USER,
        { condition_name: "Glaucoma", relation: "Father" },
        true
      );
      await deleteFamilyHistory(entry.id, TEST_USER, true);
      expect(await getFamilyHistory(TEST_USER, true)).toHaveLength(0);
    });
  });

  describe("Medications Context CRUD", () => {
    it("adds current medication for context without medical prescribing", async () => {
      const med = await addMedication(
        TEST_USER,
        {
          name: "Albuterol Inhaler",
          dose_text: "90mcg",
          frequency_text: "As needed for shortness of breath",
          is_current: true,
        },
        true
      );

      expect(med.name).toBe("Albuterol Inhaler");
      expect(med.is_current).toBe(true);

      const list = await getMedications(TEST_USER, true);
      expect(list).toHaveLength(1);
    });

    it("deletes medication entry", async () => {
      const med = await addMedication(
        TEST_USER,
        { name: "Multivitamin", is_current: true },
        true
      );
      await deleteMedication(med.id, TEST_USER, true);
      expect(await getMedications(TEST_USER, true)).toHaveLength(0);
    });
  });

  describe("Comprehensive Profile & Completeness Score", () => {
    it("calculates 0% score when profile is empty", async () => {
      const full = await getComprehensiveProfile(TEST_USER, true);
      const completeness = calculateProfileCompleteness(full);
      expect(completeness.score).toBe(0);
      expect(completeness.missingSections).toHaveLength(5);
    });

    it("calculates full 100% score when all 5 sections have entries", async () => {
      await upsertHealthProfile(TEST_USER, { age: 30, gender: "Female" }, true);
      await addAllergy(TEST_USER, { name: "Dust mites" }, true);
      await addCondition(TEST_USER, { name: "Eczema", status: "active" }, true);
      await addFamilyHistory(
        TEST_USER,
        { condition_name: "Heart disease", relation: "Father" },
        true
      );
      await addMedication(TEST_USER, { name: "Topical cream", is_current: true }, true);

      const full = await getComprehensiveProfile(TEST_USER, true);
      const completeness = calculateProfileCompleteness(full);
      expect(completeness.score).toBe(100);
      expect(completeness.completedSections).toHaveLength(5);
      expect(completeness.missingSections).toHaveLength(0);
    });
  });
});
