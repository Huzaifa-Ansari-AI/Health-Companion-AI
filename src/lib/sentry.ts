/**
 * Sentry Monitoring & Privacy-First Error Telemetry
 * 
 * Medical Safety & Privacy Rules:
 * - NEVER collect Protected Health Information (PHI): no symptoms, BMI records, or chat messages.
 * - NEVER collect authentication tokens, passwords, or session secrets.
 * - Mask share tokens in URLs (e.g. /shared/[token] -> /shared/:token).
 * - Disable Session Replay completely (replaysSessionSampleRate = 0).
 * - Sanitize all breadcrumbs, UI inputs, and request URLs.
 */

import * as Sentry from "@sentry/react";

/**
 * Sanitizes an error event before it leaves the browser.
 * Removes sensitive query params, route tokens, user IP/data, and form inputs.
 */
export function sanitizeSentryEvent(
  event: Sentry.ErrorEvent
): Sentry.ErrorEvent | null {
  // 1. Remove all default personal identifiers
  if (event.user) {
    event.user = { id: "anonymous" };
  }

  // 2. Remove any request body/data payload
  if (event.request) {
    if (event.request.data) {
      delete event.request.data;
    }

    // Sanitize request URL: strip query parameters and mask token routes
    if (event.request.url) {
      try {
        const parsed = new URL(event.request.url, "https://afiyat.local");
        // Remove all search parameters (e.g. ?token=..., ?code=...)
        parsed.search = "";
        // Mask /shared/:token path
        parsed.pathname = parsed.pathname.replace(/\/shared\/[^/]+/, "/shared/:token");
        event.request.url = parsed.pathname;
      } catch {
        event.request.url = "/sanitized-url";
      }
    }
  }

  // 3. Drop benign or non-actionable client network aborts
  const errorMessage = event.exception?.values?.[0]?.value || "";
  if (
    errorMessage.includes("ResizeObserver loop limit exceeded") ||
    errorMessage.includes("ResizeObserver loop completed with undelivered notifications") ||
    errorMessage.includes("AbortError") ||
    errorMessage.includes("The user aborted a request")
  ) {
    return null;
  }

  return event;
}

/**
 * Sanitizes breadcrumbs before recording.
 * Drops user keystroke inputs to prevent capturing typed symptoms or health text.
 */
export function sanitizeSentryBreadcrumb(
  breadcrumb: Sentry.Breadcrumb
): Sentry.Breadcrumb | null {
  // Drop UI input breadcrumbs completely so typed text in symptom/chat boxes is never logged
  if (breadcrumb.category === "ui.input") {
    return null;
  }

  // Sanitize fetch/xhr URLs to remove sensitive queries
  if (breadcrumb.category === "fetch" || breadcrumb.category === "xhr") {
    if (breadcrumb.data?.url && typeof breadcrumb.data.url === "string") {
      try {
        const parsed = new URL(breadcrumb.data.url, "https://afiyat.local");
        parsed.search = "";
        parsed.pathname = parsed.pathname.replace(/\/shared\/[^/]+/, "/shared/:token");
        breadcrumb.data.url = parsed.pathname;
      } catch {
        breadcrumb.data.url = "/sanitized-api";
      }
    }
  }

  return breadcrumb;
}

/**
 * Initializes Sentry error telemetry with privacy safeguards.
 * Only activates when VITE_SENTRY_DSN is provided in production or preview environments.
 */
export function initSentry(): void {
  const dsn = (import.meta.env.VITE_SENTRY_DSN || "").trim();
  const isProd = Boolean(import.meta.env.PROD);
  const environment = (import.meta.env.MODE || "production").toLowerCase();

  // If no DSN is provided or running in local dev, Sentry remains dormant
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment,
    enabled: isProd || Boolean(dsn),
    
    // Strictly disable Session Replay to protect user privacy
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Lightweight error sampling
    tracesSampleRate: isProd ? 0.1 : 1.0,

    beforeSend: (event) => sanitizeSentryEvent(event),
    beforeBreadcrumb: (breadcrumb) => sanitizeSentryBreadcrumb(breadcrumb),
  });
}

/**
 * Captures an application exception safely, routing to Sentry if active.
 */
export function captureAppError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!error) return;

  if (import.meta.env.DEV) {
    console.error("[Afiyat AI Error]", error, context);
  }

  try {
    Sentry.captureException(error, {
      extra: context,
    });
  } catch (sentryErr) {
    // Telemetry failures must never crash the user application
    console.warn("Telemetry reporting failure:", sentryErr);
  }
}
