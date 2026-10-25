/**
 * Core Web Vitals & Real-User Performance Telemetry
 * 
 * Medical Safety & Privacy Rules:
 * - NEVER collect Protected Health Information (PHI): no symptoms, BMI, vitals history, or chat logs.
 * - Strictly anonymous telemetry: { name, value, rating, delta, id, navigationType, path }.
 * - Path masking: /shared/:token is masked to prevent leaking private doctor consultation share links.
 * - Non-blocking execution to ensure 0ms impact on user interaction.
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";
import * as Sentry from "@sentry/react";

export interface SanitizedMetric {
  name: "CLS" | "FCP" | "INP" | "LCP" | "TTFB";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  navigationType?: string;
  path: string;
  timestamp: number;
}

/**
 * Sanitizes a web-vitals metric object into a privacy-guaranteed payload.
 * Normalizes routes and masks private doctor share tokens (/shared/[token] -> /shared/:token).
 */
export function sanitizeMetricPayload(
  metric: Metric,
  currentPath?: string
): SanitizedMetric {
  let path = "/";
  if (currentPath) {
    path = currentPath;
  } else if (typeof window !== "undefined" && window.location) {
    path = window.location.pathname;
  }

  // Mask private share tokens in route paths
  const sanitizedPath = path.replace(/\/shared\/[^/]+/, "/shared/:token");

  return {
    name: metric.name,
    // Round to 2 decimal places to avoid unnecessary precision leakage
    value: Math.round(metric.value * 100) / 100,
    rating: metric.rating,
    delta: Math.round(metric.delta * 100) / 100,
    id: metric.id,
    navigationType: metric.navigationType,
    path: sanitizedPath,
    timestamp: Date.now(),
  };
}

/**
 * Formats a metric for developer console debugging.
 */
export function formatMetricForDisplay(metric: SanitizedMetric): string {
  const unit = metric.name === "CLS" ? "" : "ms";
  return `[Web Vitals] ${metric.name}: ${metric.value}${unit} (${metric.rating}) on ${metric.path}`;
}

/**
 * Dispatches a metric report to console (dev), Sentry measurements, or custom endpoint.
 */
export function reportMetric(
  metric: Metric,
  customReporter?: (payload: SanitizedMetric) => void
): void {
  const payload = sanitizeMetricPayload(metric);

  // 1. Development logging
  if (import.meta.env.DEV) {
    console.info(formatMetricForDisplay(payload));
  }

  // 2. Custom reporter callback if provided (useful for tests and custom telemetry pipelines)
  if (customReporter) {
    customReporter(payload);
  }

  // 3. Sentry Performance measurement integration (if Sentry is initialized)
  try {
    const unit = metric.name === "CLS" ? "" : "millisecond";
    Sentry.setMeasurement(metric.name, payload.value, unit as Parameters<typeof Sentry.setMeasurement>[2]);
  } catch {
    // Sentry measurement reporting is purely best-effort
  }

  // 4. Optional Beacon Reporting (if VITE_ANALYTICS_ENDPOINT is configured)
  const analyticsUrl = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  if (analyticsUrl && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon(analyticsUrl, blob);
    } catch {
      // Beacon errors are non-critical
    }
  }
}

/**
 * Initializes Core Web Vitals telemetry listeners.
 * Safe to call in browser environments; safely no-ops on SSR or when window is unavailable.
 */
export function initWebVitals(options?: {
  onReport?: (metric: SanitizedMetric) => void;
}): void {
  if (typeof window === "undefined") return;

  const handler = (metric: Metric) => reportMetric(metric, options?.onReport);

  try {
    onCLS(handler);
    onFCP(handler);
    onINP(handler);
    onLCP(handler);
    onTTFB(handler);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[Web Vitals] Failed to attach listeners:", err);
    }
  }
}
