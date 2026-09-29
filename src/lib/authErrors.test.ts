import { describe, it, expect } from "vitest";
import { mapAuthError, validatePassword } from "./authErrors";

describe("authErrors - validatePassword", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(validatePassword("short").isValid).toBe(false);
    expect(validatePassword("1234567").isValid).toBe(false);
    expect(validatePassword("").isValid).toBe(false);
  });

  it("rejects known trivial passwords even if they meet length", () => {
    expect(validatePassword("12345678").isValid).toBe(false);
    expect(validatePassword("password").isValid).toBe(false);
    expect(validatePassword("password123").isValid).toBe(false);
    expect(validatePassword("qwertyuiop").isValid).toBe(false);
  });

  it("accepts valid, non-trivial passwords with 8 or more characters", () => {
    expect(validatePassword("myHealthyPass2026").isValid).toBe(true);
    expect(validatePassword("wellness-agent-99").isValid).toBe(true);
  });
});

describe("authErrors - mapAuthError", () => {
  it("maps email_not_confirmed code and message accurately", () => {
    const errorByCode = mapAuthError({ code: "email_not_confirmed", message: "Email not confirmed" });
    expect(errorByCode.isUnconfirmedEmail).toBe(true);
    expect(errorByCode.message).toContain("check your inbox");

    const errorByMessage = mapAuthError(new Error("Email not confirmed"));
    expect(errorByMessage.isUnconfirmedEmail).toBe(true);
  });

  it("maps invalid login credentials", () => {
    const result = mapAuthError({ code: "invalid_credentials", message: "Invalid login credentials" });
    expect(result.isUnconfirmedEmail).toBe(false);
    expect(result.message).toContain("Invalid email or password");
  });

  it("maps user_already_exists to a safe login guidance message", () => {
    const result = mapAuthError({ code: "user_already_exists", message: "User already registered" });
    expect(result.message).toContain("already exists");
  });

  it("maps rate limiting errors", () => {
    const resultByCode = mapAuthError({ code: "over_email_send_rate_limit" });
    expect(resultByCode.isRateLimited).toBe(true);
    expect(resultByCode.message).toContain("Too many email requests");

    const resultByStatus = mapAuthError({ status: 429, message: "Too many requests" });
    expect(resultByStatus.isRateLimited).toBe(true);
  });

  it("maps weak password error", () => {
    const result = mapAuthError({ code: "weak_password" });
    expect(result.message).toContain("Password is too weak");
  });

  it("maps network connectivity failures", () => {
    const result = mapAuthError(new Error("Failed to fetch"));
    expect(result.message).toContain("Network connection failed");
  });

  it("handles null or undefined error gracefully", () => {
    const result = mapAuthError(null);
    expect(result.message).toContain("unknown error");
  });
});
