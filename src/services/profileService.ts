// Milestone 4: Profile Service
// Manages health profile details, allergies, conditions, family history, and medications.
// Fully validates with Zod, supports offline demo mode, and strictly respects RLS.

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  HealthProfile,
  HealthProfileInput,
  healthProfileInputSchema,
  ProfileAllergy,
  AllergyInput,
  allergyInputSchema,
  ProfileCondition,
  ConditionInput,
  conditionInputSchema,
  ProfileFamilyHistory,
  FamilyHistoryInput,
  familyHistoryInputSchema,
  ProfileMedication,
  MedicationInput,
  medicationInputSchema,
  ComprehensiveHealthProfile,
} from "@/types/profile";

const DEMO_STORAGE_KEY_PREFIX = "healthai_demo_profile_";

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

// ==============================================================================
// 1. HEALTH PROFILE (BASIC)
// ==============================================================================

export async function getHealthProfile(
  userId: string,
  isDemo = false
): Promise<HealthProfile | null> {
  if (isDemo || !isSupabaseConfigured) {
    const raw = getStorage().getItem(`${DEMO_STORAGE_KEY_PREFIX}basic_${userId}`);
    return raw ? JSON.parse(raw) : null;
  }

  const { data, error } = await supabase
    .from("health_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load health profile: ${error.message}`);
  }

  return (data as HealthProfile) || null;
}

export async function upsertHealthProfile(
  userId: string,
  input: HealthProfileInput,
  isDemo = false
): Promise<HealthProfile> {
  const validated = healthProfileInputSchema.parse(input);

  if (isDemo || !isSupabaseConfigured) {
    const existing = await getHealthProfile(userId, true);
    const updated: HealthProfile = {
      user_id: userId,
      date_of_birth: validated.date_of_birth ?? existing?.date_of_birth ?? null,
      age: validated.age ?? existing?.age ?? null,
      gender: validated.gender ?? existing?.gender ?? null,
      time_zone: validated.time_zone ?? existing?.time_zone ?? "UTC",
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    getStorage().setItem(
      `${DEMO_STORAGE_KEY_PREFIX}basic_${userId}`,
      JSON.stringify(updated)
    );
    return updated;
  }

  const { data, error } = await supabase
    .from("health_profiles")
    .upsert({
      user_id: userId,
      date_of_birth: validated.date_of_birth ?? null,
      age: validated.age ?? null,
      gender: validated.gender ?? null,
      time_zone: validated.time_zone ?? "UTC",
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save health profile: ${error.message}`);
  }

  return data as HealthProfile;
}

// ==============================================================================
// 2. ALLERGIES
// ==============================================================================

export async function getAllergies(
  userId: string,
  isDemo = false
): Promise<ProfileAllergy[]> {
  if (isDemo || !isSupabaseConfigured) {
    const raw = getStorage().getItem(`${DEMO_STORAGE_KEY_PREFIX}allergies_${userId}`);
    return raw ? JSON.parse(raw) : [];
  }

  const { data, error } = await supabase
    .from("profile_allergies")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load allergies: ${error.message}`);
  }

  return (data as ProfileAllergy[]) || [];
}

export async function addAllergy(
  userId: string,
  input: AllergyInput,
  isDemo = false
): Promise<ProfileAllergy> {
  const validated = allergyInputSchema.parse(input);

  if (isDemo || !isSupabaseConfigured) {
    const allergies = await getAllergies(userId, true);
    const newEntry: ProfileAllergy = {
      id: `demo-alg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      name: validated.name,
      reaction: validated.reaction ?? null,
      severity: validated.severity ?? null,
      created_at: new Date().toISOString(),
    };
    allergies.unshift(newEntry);
    getStorage().setItem(
      `${DEMO_STORAGE_KEY_PREFIX}allergies_${userId}`,
      JSON.stringify(allergies)
    );
    return newEntry;
  }

  const { data, error } = await supabase
    .from("profile_allergies")
    .insert({
      user_id: userId,
      name: validated.name,
      reaction: validated.reaction ?? null,
      severity: validated.severity ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add allergy: ${error.message}`);
  }

  return data as ProfileAllergy;
}

export async function deleteAllergy(
  allergyId: string,
  userId: string,
  isDemo = false
): Promise<void> {
  if (isDemo || !isSupabaseConfigured) {
    const allergies = await getAllergies(userId, true);
    const filtered = allergies.filter((a) => a.id !== allergyId);
    getStorage().setItem(
      `${DEMO_STORAGE_KEY_PREFIX}allergies_${userId}`,
      JSON.stringify(filtered)
    );
    return;
  }

  const { error } = await supabase
    .from("profile_allergies")
    .delete()
    .eq("id", allergyId);

  if (error) {
    throw new Error(`Failed to delete allergy: ${error.message}`);
  }
}

// ==============================================================================
// 3. CONDITIONS
// ==============================================================================

export async function getConditions(
  userId: string,
  isDemo = false
): Promise<ProfileCondition[]> {
  if (isDemo || !isSupabaseConfigured) {
    const raw = getStorage().getItem(`${DEMO_STORAGE_KEY_PREFIX}conditions_${userId}`);
    return raw ? JSON.parse(raw) : [];
  }

  const { data, error } = await supabase
    .from("profile_conditions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load conditions: ${error.message}`);
  }

  return (data as ProfileCondition[]) || [];
}

export async function addCondition(
  userId: string,
  input: ConditionInput,
  isDemo = false
): Promise<ProfileCondition> {
  const validated = conditionInputSchema.parse(input);

  if (isDemo || !isSupabaseConfigured) {
    const conditions = await getConditions(userId, true);
    const newEntry: ProfileCondition = {
      id: `demo-cond-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      name: validated.name,
      status: validated.status,
      since_year: validated.since_year ?? null,
      created_at: new Date().toISOString(),
    };
    conditions.unshift(newEntry);
    getStorage().setItem(
      `${DEMO_STORAGE_KEY_PREFIX}conditions_${userId}`,
      JSON.stringify(conditions)
    );
    return newEntry;
  }

  const { data, error } = await supabase
    .from("profile_conditions")
    .insert({
      user_id: userId,
      name: validated.name,
      status: validated.status,
      since_year: validated.since_year ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add condition: ${error.message}`);
  }

  return data as ProfileCondition;
}

export async function deleteCondition(
  conditionId: string,
  userId: string,
  isDemo = false
): Promise<void> {
  if (isDemo || !isSupabaseConfigured) {
    const conditions = await getConditions(userId, true);
    const filtered = conditions.filter((c) => c.id !== conditionId);
    getStorage().setItem(
      `${DEMO_STORAGE_KEY_PREFIX}conditions_${userId}`,
      JSON.stringify(filtered)
    );
    return;
  }

  const { error } = await supabase
    .from("profile_conditions")
    .delete()
    .eq("id", conditionId);

  if (error) {
    throw new Error(`Failed to delete condition: ${error.message}`);
  }
}

// ==============================================================================
// 4. FAMILY HISTORY
// ==============================================================================

export async function getFamilyHistory(
  userId: string,
  isDemo = false
): Promise<ProfileFamilyHistory[]> {
  if (isDemo || !isSupabaseConfigured) {
    const raw = getStorage().getItem(`${DEMO_STORAGE_KEY_PREFIX}family_${userId}`);
    return raw ? JSON.parse(raw) : [];
  }

  const { data, error } = await supabase
    .from("profile_family_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load family history: ${error.message}`);
  }

  return (data as ProfileFamilyHistory[]) || [];
}

export async function addFamilyHistory(
  userId: string,
  input: FamilyHistoryInput,
  isDemo = false
): Promise<ProfileFamilyHistory> {
  const validated = familyHistoryInputSchema.parse(input);

  if (isDemo || !isSupabaseConfigured) {
    const history = await getFamilyHistory(userId, true);
    const newEntry: ProfileFamilyHistory = {
      id: `demo-fam-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      condition_name: validated.condition_name,
      relation: validated.relation,
      created_at: new Date().toISOString(),
    };
    history.unshift(newEntry);
    getStorage().setItem(
      `${DEMO_STORAGE_KEY_PREFIX}family_${userId}`,
      JSON.stringify(history)
    );
    return newEntry;
  }

  const { data, error } = await supabase
    .from("profile_family_history")
    .insert({
      user_id: userId,
      condition_name: validated.condition_name,
      relation: validated.relation,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add family history: ${error.message}`);
  }

  return data as ProfileFamilyHistory;
}

export async function deleteFamilyHistory(
  id: string,
  userId: string,
  isDemo = false
): Promise<void> {
  if (isDemo || !isSupabaseConfigured) {
    const history = await getFamilyHistory(userId, true);
    const filtered = history.filter((h) => h.id !== id);
    getStorage().setItem(
      `${DEMO_STORAGE_KEY_PREFIX}family_${userId}`,
      JSON.stringify(filtered)
    );
    return;
  }

  const { error } = await supabase
    .from("profile_family_history")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete family history: ${error.message}`);
  }
}

// ==============================================================================
// 5. MEDICATIONS (CONTEXT ONLY)
// ==============================================================================

export async function getMedications(
  userId: string,
  isDemo = false
): Promise<ProfileMedication[]> {
  if (isDemo || !isSupabaseConfigured) {
    const raw = getStorage().getItem(`${DEMO_STORAGE_KEY_PREFIX}meds_${userId}`);
    return raw ? JSON.parse(raw) : [];
  }

  const { data, error } = await supabase
    .from("profile_medications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load medications: ${error.message}`);
  }

  return (data as ProfileMedication[]) || [];
}

export async function addMedication(
  userId: string,
  input: MedicationInput,
  isDemo = false
): Promise<ProfileMedication> {
  const validated = medicationInputSchema.parse(input);

  if (isDemo || !isSupabaseConfigured) {
    const meds = await getMedications(userId, true);
    const newEntry: ProfileMedication = {
      id: `demo-med-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      name: validated.name,
      dose_text: validated.dose_text ?? null,
      frequency_text: validated.frequency_text ?? null,
      is_current: validated.is_current,
      created_at: new Date().toISOString(),
    };
    meds.unshift(newEntry);
    getStorage().setItem(
      `${DEMO_STORAGE_KEY_PREFIX}meds_${userId}`,
      JSON.stringify(meds)
    );
    return newEntry;
  }

  const { data, error } = await supabase
    .from("profile_medications")
    .insert({
      user_id: userId,
      name: validated.name,
      dose_text: validated.dose_text ?? null,
      frequency_text: validated.frequency_text ?? null,
      is_current: validated.is_current,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add medication: ${error.message}`);
  }

  return data as ProfileMedication;
}

export async function deleteMedication(
  id: string,
  userId: string,
  isDemo = false
): Promise<void> {
  if (isDemo || !isSupabaseConfigured) {
    const meds = await getMedications(userId, true);
    const filtered = meds.filter((m) => m.id !== id);
    getStorage().setItem(
      `${DEMO_STORAGE_KEY_PREFIX}meds_${userId}`,
      JSON.stringify(filtered)
    );
    return;
  }

  const { error } = await supabase
    .from("profile_medications")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete medication: ${error.message}`);
  }
}

// ==============================================================================
// 6. COMPREHENSIVE PROFILE FETCH & COMPLETENESS
// ==============================================================================

export async function getComprehensiveProfile(
  userId: string,
  isDemo = false
): Promise<ComprehensiveHealthProfile> {
  const [profile, allergies, conditions, familyHistory, medications] =
    await Promise.all([
      getHealthProfile(userId, isDemo),
      getAllergies(userId, isDemo),
      getConditions(userId, isDemo),
      getFamilyHistory(userId, isDemo),
      getMedications(userId, isDemo),
    ]);

  return {
    profile,
    allergies,
    conditions,
    familyHistory,
    medications,
  };
}

/**
 * Calculates a gentle, non-judgmental completeness score (0-100%)
 * 5 sections, 20% each:
 * 1. Basic details (age or gender filled)
 * 2. Allergies recorded (or explicitly opted out / empty is ok)
 * 3. Chronic conditions recorded
 * 4. Family history recorded
 * 5. Medications recorded
 */
export function calculateProfileCompleteness(
  data: ComprehensiveHealthProfile
): { score: number; completedSections: string[]; missingSections: string[] } {
  let score = 0;
  const completedSections: string[] = [];
  const missingSections: string[] = [];

  if (data.profile?.age || data.profile?.gender || data.profile?.date_of_birth) {
    score += 20;
    completedSections.push("Demographics");
  } else {
    missingSections.push("Demographics");
  }

  if (data.allergies.length > 0) {
    score += 20;
    completedSections.push("Allergies");
  } else {
    missingSections.push("Allergies");
  }

  if (data.conditions.length > 0) {
    score += 20;
    completedSections.push("Health Conditions");
  } else {
    missingSections.push("Health Conditions");
  }

  if (data.familyHistory.length > 0) {
    score += 20;
    completedSections.push("Family History");
  } else {
    missingSections.push("Family History");
  }

  if (data.medications.length > 0) {
    score += 20;
    completedSections.push("Medications");
  } else {
    missingSections.push("Medications");
  }

  return { score, completedSections, missingSections };
}
