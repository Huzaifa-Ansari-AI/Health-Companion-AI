import { describe, it, expect } from "vitest";
import {
  sanitizeSentryEvent,
  sanitizeSentryBreadcrumb,
  captureAppError,
} from "./sentry";
import type { ErrorEvent, Breadcrumb } from "@sentry/react";

describe("Sentry Telemetry — PHI & Privacy Sanitization", () => {
  function mockErrorEvent(overrides: Partial<ErrorEvent>): ErrorEvent {
    return {
      type: undefined,
      ...overrides,
    } as ErrorEvent;
  }

  it("anonymizes user identity from error events", () => {
    const rawEvent = mockErrorEvent({
      user: {
        id: "usr_12345",
        email: "patient@example.com",
        username: "patient_john",
      },
    });

    const sanitized = sanitizeSentryEvent(rawEvent);
    expect(sanitized).not.toBeNull();
    expect(sanitized?.user?.id).toBe("anonymous");
    expect((sanitized?.user as Record<string, unknown>)?.email).toBeUndefined();
  });

  it("removes request data payloads (form bodies and health details)", () => {
    const rawEvent = mockErrorEvent({
      request: {
        url: "https://afiyatai.com/api/assessment",
        data: {
          symptoms: ["Chest pain", "Fatigue"],
          bmi: 24.5,
        },
      },
    });

    const sanitized = sanitizeSentryEvent(rawEvent);
    expect(sanitized).not.toBeNull();
    expect(sanitized?.request?.data).toBeUndefined();
  });

  it("masks private token routes and strips query strings in request URLs", () => {
    const rawEvent = mockErrorEvent({
      request: {
        url: "https://afiyatai.com/shared/secret_share_token_999?source=email&patient=123",
      },
    });

    const sanitized = sanitizeSentryEvent(rawEvent);
    expect(sanitized).not.toBeNull();
    expect(sanitized?.request?.url).toBe("/shared/:token");
    expect(sanitized?.request?.url).not.toContain("secret_share_token_999");
    expect(sanitized?.request?.url).not.toContain("patient=123");
  });

  it("filters out benign client errors like ResizeObserver and AbortError", () => {
    const resizeObserverEvent = mockErrorEvent({
      exception: {
        values: [
          {
            value: "ResizeObserver loop limit exceeded",
          },
        ],
      },
    });

    const abortEvent = mockErrorEvent({
      exception: {
        values: [
          {
            value: "AbortError: The user aborted a request.",
          },
        ],
      },
    });

    expect(sanitizeSentryEvent(resizeObserverEvent)).toBeNull();
    expect(sanitizeSentryEvent(abortEvent)).toBeNull();
  });

  it("drops UI input breadcrumbs so typed symptom/chat text is never logged", () => {
    const inputBreadcrumb: Breadcrumb = {
      category: "ui.input",
      message: "User typed: severe headache and dizziness",
    };

    const result = sanitizeSentryBreadcrumb(inputBreadcrumb);
    expect(result).toBeNull();
  });

  it("sanitizes fetch breadcrumb URLs to remove query params and mask tokens", () => {
    const fetchBreadcrumb: Breadcrumb = {
      category: "fetch",
      data: {
        url: "https://api.afiyat.com/shared/private_token_456?refresh=true",
      },
    };

    const result = sanitizeSentryBreadcrumb(fetchBreadcrumb);
    expect(result).not.toBeNull();
    expect(result?.data?.url).toBe("/shared/:token");
  });

  it("preserves standard navigation breadcrumbs without modification", () => {
    const navBreadcrumb: Breadcrumb = {
      category: "navigation",
      data: {
        from: "/dashboard",
        to: "/assessment",
      },
    };

    const result = sanitizeSentryBreadcrumb(navBreadcrumb);
    expect(result).toEqual(navBreadcrumb);
  });

  it("captureAppError handles errors safely without crashing when Sentry is dormant", () => {
    expect(() => captureAppError(new Error("Test error"))).not.toThrow();
    expect(() => captureAppError("String error")).not.toThrow();
    expect(() => captureAppError(null)).not.toThrow();
    expect(() => captureAppError(undefined)).not.toThrow();
  });
});
