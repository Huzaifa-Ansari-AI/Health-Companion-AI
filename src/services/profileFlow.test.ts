// Component & Flow Tests: Milestone 4 Phase 2 (Profile UI & Personalization)
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getComprehensiveProfile,
  upsertHealthProfile,
  addAllergy,
  deleteAllergy,
  addCondition,
  deleteCondition,
  addFamilyHistory,
  deleteFamilyHistory,
  addMedication,
  deleteMedication,
  calculateProfileCompleteness,
} from "./profileService";

describe("Profile Flow & Milestone 4 UI Logic", () => {
  const TEST_USER = "flow-user-m4";
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

  it("handles initial empty state gracefully", async () => {
    const profile = await getComprehensiveProfile(TEST_USER, true);
    expect(profile.profile).toBeNull();
    expect(profile.allergies).toHaveLength(0);
    expect(profile.conditions).toHaveLength(0);
    expect(profile.familyHistory).toHaveLength(0);
    expect(profile.medications).toHaveLength(0);

    const { score, completedSections, missingSections } = calculateProfileCompleteness(profile);
    expect(score).toBe(0);
    expect(completedSections).toHaveLength(0);
    expect(missingSections).toEqual([
      "Demographics",
      "Allergies",
      "Health Conditions",
      "Family History",
      "Medications",
    ]);
  });

  it("progressively updates completeness score as sections are completed", async () => {
    // 1. Fill demographics
    await upsertHealthProfile(TEST_USER, { age: 34, gender: "Female" }, true);
    let state = await getComprehensiveProfile(TEST_USER, true);
    expect(calculateProfileCompleteness(state).score).toBe(20);

    // 2. Add allergy
    await addAllergy(TEST_USER, { name: "Penicillin", severity: "severe" }, true);
    state = await getComprehensiveProfile(TEST_USER, true);
    expect(calculateProfileCompleteness(state).score).toBe(40);

    // 3. Add condition
    await addCondition(TEST_USER, { name: "Asthma", status: "managed" }, true);
    state = await getComprehensiveProfile(TEST_USER, true);
    expect(calculateProfileCompleteness(state).score).toBe(60);

    // 4. Add family history
    await addFamilyHistory(
      TEST_USER,
      { condition_name: "Type 2 Diabetes", relation: "Mother" },
      true
    );
    state = await getComprehensiveProfile(TEST_USER, true);
    expect(calculateProfileCompleteness(state).score).toBe(80);

    // 5. Add medication
    await addMedication(TEST_USER, { name: "Inhaler", is_current: true }, true);
    state = await getComprehensiveProfile(TEST_USER, true);
    expect(calculateProfileCompleteness(state).score).toBe(100);
  });

  it("preserves non-prescriptive medication context without prescribing actions", async () => {
    const med = await addMedication(
      TEST_USER,
      {
        name: "Lisinopril",
        dose_text: "10mg",
        frequency_text: "Once daily in the morning",
        is_current: true,
      },
      true
    );

    expect(med.name).toBe("Lisinopril");
    expect(med.dose_text).toBe("10mg");
    expect(med.frequency_text).toBe("Once daily in the morning");

    // Remove medication
    await deleteMedication(med.id, TEST_USER, true);
    const updated = await getComprehensiveProfile(TEST_USER, true);
    expect(updated.medications).toHaveLength(0);
  });

  it("handles deletion across all sections correctly", async () => {
    const allergy = await addAllergy(TEST_USER, { name: "Peanuts" }, true);
    const cond = await addCondition(TEST_USER, { name: "Eczema" }, true);
    const fam = await addFamilyHistory(
      TEST_USER,
      { condition_name: "Glaucoma", relation: "Father" },
      true
    );

    await deleteAllergy(allergy.id, TEST_USER, true);
    await deleteCondition(cond.id, TEST_USER, true);
    await deleteFamilyHistory(fam.id, TEST_USER, true);

    const updated = await getComprehensiveProfile(TEST_USER, true);
    expect(updated.allergies).toHaveLength(0);
    expect(updated.conditions).toHaveLength(0);
    expect(updated.familyHistory).toHaveLength(0);
  });
});
