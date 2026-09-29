import { describe, it, expect } from "vitest";
import { validateSupabaseConfig } from "./supabase";

describe("validateSupabaseConfig", () => {
  const validUrl = "https://abcdefghijklmnop.supabase.co";
  const validKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.validSignatureLongKey123456";

  it("returns true for valid URL and valid Anon key", () => {
    expect(validateSupabaseConfig(validUrl, validKey)).toBe(true);
  });

  it("returns false when URL or key is missing or undefined", () => {
    expect(validateSupabaseConfig(undefined, validKey)).toBe(false);
    expect(validateSupabaseConfig(validUrl, undefined)).toBe(false);
    expect(validateSupabaseConfig("", "")).toBe(false);
    expect(validateSupabaseConfig(null, null)).toBe(false);
  });

  it("returns false for whitespace-only strings", () => {
    expect(validateSupabaseConfig("   ", validKey)).toBe(false);
    expect(validateSupabaseConfig(validUrl, "   ")).toBe(false);
  });

  it("returns false for invalid URL protocols", () => {
    expect(validateSupabaseConfig("not-a-url", validKey)).toBe(false);
    expect(validateSupabaseConfig("ftp://supabase.co", validKey)).toBe(false);
  });

  it("returns false for template placeholder URLs", () => {
    expect(validateSupabaseConfig("https://your-project-id.supabase.co", validKey)).toBe(false);
    expect(validateSupabaseConfig("https://placeholder.supabase.co", validKey)).toBe(false);
    expect(validateSupabaseConfig("https://your-project-id.subdomain.co", validKey)).toBe(false);
  });

  it("returns false for template placeholder keys", () => {
    expect(validateSupabaseConfig(validUrl, "your-supabase-anon-key")).toBe(false);
    expect(validateSupabaseConfig(validUrl, "your-supabase-publishable-anon-key")).toBe(false);
    expect(validateSupabaseConfig(validUrl, "your-anon-public-key")).toBe(false);
    expect(validateSupabaseConfig(validUrl, "placeholder-anon-key")).toBe(false);
  });

  it("returns false when key is too short (< 20 characters)", () => {
    expect(validateSupabaseConfig(validUrl, "short-key-12345")).toBe(false);
  });
});
