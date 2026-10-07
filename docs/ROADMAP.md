# Health Companion AI — Startup Development Roadmap & Milestones

**Mission:** Build a production-grade, patient-friendly AI Health & Wellness Companion that solves real-world health awareness challenges through conversational AI, structured risk assessments, and actionable lifestyle intelligence.

---

## Roadmap Overview

```mermaid
flowchart LR
    M0["Milestone 0<br/>Foundation & Audit Hardening"] --> M1["Milestone 1<br/>AI Symptom Chatbot"]
    M1 --> M2["Milestone 2<br/>Dynamic Health Reports & PDF"]
    M2 --> M3["Milestone 3<br/>Health Vitals & Trends"]
    M3 --> M4["Milestone 4<br/>User Profile & Compliance"]
    M4 --> M45["Milestone 4.5<br/>AI Quality & Product Hardening"]
    M45 --> M5["Milestone 5<br/>Production CI/CD & Launch"]
```

---

## Milestone 0: Foundation Hardening, Debugging & Delivery Readiness
> **Goal:** Ensure the current codebase is 100% bug-free, fully responsive, cleanly tested, and ready for high-velocity feature development.

- [x] **0.1 UX & Navigation Consistency:**
  - Verify all CTAs across Landing Page (`Header`, `Hero`, `Features`, `Footer`) route dynamically based on auth state (direct to `/assessment` or `/dashboard` if logged in, `/auth` if guest).
  - Polish mobile drawer/navbar toggle and responsive layout on all screen sizes.
- [x] **0.2 Robust Error Handling & Boundaries:**
  - Implement a global React Error Boundary with fallback UI so the app never shows a blank white screen on unexpected errors.
  - Implement network retry and user-friendly toast notifications for Supabase connection hiccups.
- [x] **0.3 Automated Testing Foundation:**
  - Set up Vitest and React Testing Library.
  - Add unit tests for core utilities (`calculateBMI`, risk indicator logic, auth state helpers).
- [x] **0.4 Code Cleanliness & Production Verification:**
  - Clean build output, verify strict TypeScript checks (`tsc --noEmit`), zero ESLint warnings/errors.
  - Commit milestone completion to GitHub with a clean semantic tag.

---

## Milestone 1: Interactive AI Symptom Consultation Chatbot
> **Goal:** Empower users to chat naturally about their symptoms, concerns, and health questions, receiving empathetic, safe, and structured AI guidance.

- [x] **1.1 Chatbot Interface & Experience:**
  - Full-screen / drawer conversational interface with smooth micro-animations.
  - Typing indicator, quick-reply suggestion chips (e.g., "Frequent headaches", "Sleep issues", "Digestive problems").
  - Persistent chat history per user saved in Supabase.
- [x] **1.2 Conversational AI Engine (Gemini / OpenAI Integration):**
  - Multi-turn conversation maintaining contextual symptom discovery.
  - Guardrails & Safety Filters: Emergency detection (e.g. chest pain, stroke symptoms triggers immediate emergency warning + 911/emergency dispatch advice).
  - Categorical risk determination (Low / Medium / High).
- [x] **1.3 Automated Consultation Report Generation:**
  - AI extracts reported symptoms, duration, intensity, and lifestyle factors from the chat.
  - Synthesizes a structured "Health Assessment Summary" ready for review or export.
- [x] **1.4 Direct Database Sync:**
  - Automatically saves the synthesized assessment into the user's Supabase dashboard.

---

## Milestone 2: Dynamic Health Reports & PDF Export
> **Goal:** Provide patients and doctors with beautifully formatted, professional health summaries they can view, print, download, or share.

- [x] **2.1 Standardized Report Template:**
  - Patient demographics (age, gender, BMI).
  - Chief complaints / symptoms timeline.
  - Lifestyle factors (sleep, hydration, activity score).
  - Categorical Risk Assessment with clear disclaimers.
  - Doctor discussion points (suggested questions the patient can ask their physician).
- [x] **2.2 High-Fidelity PDF Generator:**
  - Client-side vector PDF (`pdf-lib`) with clean typography, branded headers, page numbers, selectable text, and QR code verification (`qrcode`).
- [x] **2.3 Secure Shareable Links:**
  - Temporary read-only access link with expiration (24h, 3d, 7d), token hashing (SHA-256), immutable snapshots, and privacy toggles.

---

## Milestone 3: Health Vitals Analytics & Longitudinal Tracking
> **Goal:** Transform single-use assessments into a continuous health journey with trend tracking and habit adherence.

- [x] **3.1 Visual Trend Charts (`Recharts`):**
  - BMI history progression graph over weeks/months.
  - Sleep duration vs. reported fatigue correlation.
  - Hydration and physical activity tracking.
- [x] **3.2 Daily Habit & Wellness Check-in:**
  - 30-second daily check-in (mood, sleep hours, water intake, daily energy score).
  - Streak tracking and milestone achievements.

---

## Milestone 4: Patient Profile, Personalization & Privacy Readiness
> **Goal:** Medical history context, profile customization, and healthcare data privacy standards.

- [x] **4.1 Comprehensive Health Profile:**
  - Patient demographics (age, gender, timezone).
  - Known allergies with severity levels (mild, moderate, severe).
  - Health conditions with status (active, managed, past).
  - Family health history tracking.
  - Current medications (background context only, strictly non-prescriptive, no dosage changes).
  - Profile completeness meter (0-100%) with actionable next steps.
  - AI data minimization filter (`buildAiProfileContext`) mapping exact age to brackets and stripping identifiers.
- [x] **4.2 Data Privacy & Security (Privacy-Focused, Aligned with Good Privacy Practices):**
  - "Download My Data" full machine-readable JSON archive export.
  - Complete account & data deletion flow with explicit two-step confirmation (`DELETE MY DATA`) and Supabase CASCADE cleanup.
  - Granular opt-in privacy toggles (5 distinct consents, default OFF) with append-only audit trail log.
  - Strict owner-only Row-Level Security (RLS) on all 8 health profile and privacy tables.

---

## Milestone 4.5: AI Quality & Product Hardening (Gemini LLM, Assessment Redesign & Editable Reports)
> **Goal:** Upgrade the consultation engine, redesign the 3-step assessment (Lovable Reference Images 4 & 5), and provide doctor-ready editable health summaries prior to production launch.

- [x] **4.5.1 Robust Gemini Integration & Diagnostics:**
  - Standardized on Google AI Studio secret `GEMINI_API_KEY` with fallback to `GEMINI_MODEL` (e.g. `gemini-1.5-flash`).
  - Added in-app AI Diagnostics Dialog (`AiDiagnosticDialog.tsx`) with real-time ping and model latency checks.
  - Removed silent fake fallbacks; explicit, honest error propagation.
- [x] **4.5.2 Multilingual AI Consultation Engine (English + Roman Urdu):**
  - Upgraded consultation prompt (`consultPrompt.ts`) with Roman Urdu & English auto-detection, light emojis, and 4-step consultative flow.
  - Critical oncology & palliative distress interception with empathetic specialized support.
  - Automatic conversation titling (`suggested_title`) and greeting sanitization from extracted symptoms.
  - Rolling conversation memory (up to 16 messages) + AI Memory Dialog (`AiMemoryDialog.tsx`).
- [x] **4.5.3 3-Step Health Risk Assessment Form Redesign:**
  - Renamed all CTAs to "Health Risk Assessment" / "New Assessment".
  - **Step 1 (Body Basics):** Height in feet/inches with live cm conversion; weight with kg/lbs toggle; real-time BMI gauge.
  - **Step 2 (Symptoms & Lifestyle - Image 4):** 12 multi-select symptoms, habit selectors (smoking, alcohol, regional oral substances like Gutka, Chhalia, Paan, Naswar, VELO/ZYN, energy drinks), family history chips, sleep/water sliders.
- [x] **4.5.4 Dynamic Risk Assessment Result (Step 3 - Image 5):**
  - Connected `analyze-health` Edge Function to Gemini with structured Zod output validation.
  - Dynamic risk indicators grid displaying only Medium and High risks with concise 1-sentence rationales tied directly to user inputs (or 1 positive Low Risk card if all clear).
  - High-impact BMI hero card, personalized summary card, and actionable wellness steps.
- [x] **4.5.5 Doctor-Ready Editable Health Reports & PDF Sync:**
  - `EditReportDialog` allows patients to refine chief complaints, symptoms timeline, vitals, observations, and doctor discussion points.
  - "Edited by you" badge on reports and PDF exports.
  - Full propagation of customized edits to vector PDF downloads (`pdfService.ts`) and expiring doctor share links (`shareService.ts`).
  - Single-click "Reset to AI Original" option.

---

## Milestone 5: Production CI/CD, Deployment & Startup Launch
> **Goal:** Deploy to global edge CDN with automated testing, error tracking, and custom domain setup.

- [ ] **5.1 Automated CI/CD Pipeline:**
  - GitHub Actions workflow running lint, typecheck, and unit tests on every pull request and push to `main`.
- [ ] **5.2 Edge Production Hosting:**
  - Deployment on Vercel or Cloudflare Pages with custom domain configuration.
- [ ] **5.3 Monitoring & Observability:**
  - Sentry error monitoring integration.
  - Web Vitals performance tracking.
- [ ] **5.4 Launch Readiness & Marketing Landing:**
  - SEO optimization (dynamic OpenGraph cards, schema.org medical structured data, sitemap.xml).
