import { describe, it, expect, vi } from "vitest";
import {
  sanitizeMetricPayload,
  formatMetricForDisplay,
  reportMetric,
  initWebVitals,
} from "./vitals";
import type { Metric } from "web-vitals";

describe("Core Web Vitals Telemetry — Privacy & Sanitization", () => {
  function createMockMetric(
    overrides: Partial<Metric> & { name: Metric["name"] }
  ): Metric {
    return {
      value: 0,
      rating: "good",
      delta: 0,
      id: "mock-vital-id",
      navigationType: "navigate",
      navigationId: 1,
      entries: [],
      ...overrides,
    };
  }

  it("sanitizes metric payload and rounds values to 2 decimal places", () => {
    const rawLcpMetric = createMockMetric({
      name: "LCP",
      value: 1245.6789,
      rating: "good",
      delta: 1245.6789,
      id: "v4-1718000000000-1234567890",
      navigationType: "navigate",
    });

    const sanitized = sanitizeMetricPayload(rawLcpMetric, "/dashboard");

    expect(sanitized.name).toBe("LCP");
    expect(sanitized.value).toBe(1245.68);
    expect(sanitized.delta).toBe(1245.68);
    expect(sanitized.rating).toBe("good");
    expect(sanitized.id).toBe("v4-1718000000000-1234567890");
    expect(sanitized.navigationType).toBe("navigate");
    expect(sanitized.path).toBe("/dashboard");
    expect(typeof sanitized.timestamp).toBe("number");
  });

  it("masks doctor share tokens in paths (/shared/:token)", () => {
    const rawInpMetric = createMockMetric({
      name: "INP",
      value: 48.333,
      rating: "good",
      delta: 48.333,
      id: "v4-1718000000000-99999",
      navigationType: "navigate",
    });

    const sanitized = sanitizeMetricPayload(
      rawInpMetric,
      "/shared/secret_doctor_token_abc123"
    );

    expect(sanitized.path).toBe("/shared/:token");
    expect(sanitized.path).not.toContain("secret_doctor_token_abc123");
  });

  it("formats CLS without ms units and LCP with ms units in display output", () => {
    const clsPayload = sanitizeMetricPayload(
      createMockMetric({
        name: "CLS",
        value: 0.045,
        rating: "good",
        delta: 0.045,
        id: "v4-cls-1",
      }),
      "/assessment"
    );

    const lcpPayload = sanitizeMetricPayload(
      createMockMetric({
        name: "LCP",
        value: 1520.4,
        rating: "good",
        delta: 1520.4,
        id: "v4-lcp-1",
      }),
      "/assessment"
    );

    const clsFormatted = formatMetricForDisplay(clsPayload);
    const lcpFormatted = formatMetricForDisplay(lcpPayload);

    expect(clsFormatted).toBe("[Web Vitals] CLS: 0.05 (good) on /assessment");
    expect(lcpFormatted).toBe("[Web Vitals] LCP: 1520.4ms (good) on /assessment");
  });

  it("dispatches sanitized metric to custom reporter callback", () => {
    const reporterSpy = vi.fn();

    const rawTtfbMetric = createMockMetric({
      name: "TTFB",
      value: 230.12,
      rating: "good",
      delta: 230.12,
      id: "v4-ttfb-1",
      navigationType: "reload",
    });

    reportMetric(rawTtfbMetric, reporterSpy);

    expect(reporterSpy).toHaveBeenCalledOnce();
    const passedPayload = reporterSpy.mock.calls[0][0];
    expect(passedPayload.name).toBe("TTFB");
    expect(passedPayload.value).toBe(230.12);
    expect(passedPayload.navigationType).toBe("reload");
  });

  it("handles empty or zero values gracefully", () => {
    const zeroCls = createMockMetric({
      name: "CLS",
      value: 0,
      rating: "good",
      delta: 0,
      id: "v4-zero-1",
    });

    const sanitized = sanitizeMetricPayload(zeroCls, "/");
    expect(sanitized.value).toBe(0);
    expect(sanitized.delta).toBe(0);
    expect(sanitized.rating).toBe("good");
  });

  it("initWebVitals executes without throwing errors", () => {
    expect(() => initWebVitals()).not.toThrow();
  });
});
