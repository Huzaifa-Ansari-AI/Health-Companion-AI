export interface AuthErrorDetails {
  message: string;
  isUnconfirmedEmail: boolean;
  isRateLimited: boolean;
}

const TRIVIAL_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password123",
  "qwertyuiop",
  "admin1234",
  "welcome123",
]);

/**
 * Validates password length and rejects common trivial passwords.
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      error: "Password must be at least 8 characters long.",
    };
  }

  if (TRIVIAL_PASSWORDS.has(password.toLowerCase().trim())) {
    return {
      isValid: false,
      error: "This password is too common and easily guessed. Please choose a stronger password.",
    };
  }

  return { isValid: true };
}

/**
 * Safely parses Supabase auth errors into friendly, actionable user messages
 * without leaking sensitive database or credential details.
 */
export function mapAuthError(error: unknown): AuthErrorDetails {
  if (!error) {
    return {
      message: "An unknown error occurred. Please try again.",
      isUnconfirmedEmail: false,
      isRateLimited: false,
    };
  }

  const rawError = error as { message?: string; code?: string; status?: number; error_description?: string };
  const message = (rawError.message || rawError.error_description || "").toLowerCase();
  const code = (rawError.code || "").toLowerCase();

  // 1. Email not confirmed
  if (
    code === "email_not_confirmed" ||
    message.includes("email not confirmed") ||
    message.includes("confirm your email")
  ) {
    return {
      message: "Your email is not confirmed yet. Please check your inbox (and spam folder) for the verification link.",
      isUnconfirmedEmail: true,
      isRateLimited: false,
    };
  }

  // 2. Invalid login credentials
  if (
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return {
      message: "Invalid email or password. Please verify your credentials and try again.",
      isUnconfirmedEmail: false,
      isRateLimited: false,
    };
  }

  // 3. User already registered
  if (
    code === "user_already_exists" ||
    message.includes("user already registered") ||
    message.includes("already exists")
  ) {
    return {
      message: "An account with this email address already exists. Please log in instead.",
      isUnconfirmedEmail: false,
      isRateLimited: false,
    };
  }

  // 4. Rate limiting / Email throttling
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    rawError.status === 429
  ) {
    return {
      message: "Too many email requests sent recently. Please wait a minute before trying again.",
      isUnconfirmedEmail: false,
      isRateLimited: true,
    };
  }

  // 5. Weak password
  if (code === "weak_password" || message.includes("weak password") || message.includes("password should be")) {
    return {
      message: "Password is too weak. Please use at least 8 characters with a mix of letters and numbers.",
      isUnconfirmedEmail: false,
      isRateLimited: false,
    };
  }

  // 6. Network connectivity failure
  if (message.includes("failed to fetch") || message.includes("networkerror") || message.includes("network error")) {
    return {
      message: "Network connection failed. Please check your internet connection and try again.",
      isUnconfirmedEmail: false,
      isRateLimited: false,
    };
  }

  // Default fallback
  return {
    message: rawError.message || "An authentication error occurred. Please try again.",
    isUnconfirmedEmail: false,
    isRateLimited: false,
  };
}
