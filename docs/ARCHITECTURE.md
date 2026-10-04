# System Architecture — AI Health Assistant

## Overview

The **AI Health Assistant** is an independent, production-ready health awareness web application designed with modern cloud-native standards.

---

## 1. System Topology

```
                       [ Antigravity IDE ]
                               │
                       [ Local Git Repository ]
                               │
                 [ Independent GitHub Repository ]
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
 [ Production Hosting (Vercel/Netlify) ]  [ Supabase Cloud Backend ]
  - Vite Single Page Application (SPA)    - PostgreSQL Database (RLS)
  - React 18 + TypeScript + Tailwind     - Supabase GoTrue Auth
  - Responsive Dashboard & Assessment     - Serverless Edge Functions
                                                  │
                                          [ AI Provider SDK ]
                                          - Categorical Risk Logic
                                          - Lifestyle Recommendations
```

---

## 2. Layer Responsibilities

### Presentation Layer (Frontend)
- **Framework:** React 18 with TypeScript (strict mode).
- **Routing:** `react-router-dom` v6 with client-side protected route wrappers (`ProtectedRoute`) and public verified share routes (`/shared/:token`).
- **State & Query:** React Context (`AuthContext`) for authentication state; `@tanstack/react-query` for query caching.
- **UI & Styling:** Tailwind CSS + Radix UI primitives (`shadcn/ui`) with custom wellness theme tokens.
- **Report & Document Components:** `ReportView.tsx` (8-section responsive & printable template with optional 7-day vitals), `CompleteDetailsDialog.tsx` (demographics), `ShareReportDialog.tsx` (privacy-first sharing), `SharedLinksManager.tsx`.
- **Longitudinal Tracking & Trends UI (Milestone 3):**
  - `/checkin`: Quick 30-second daily check-in form (`CheckinForm.tsx`, `TodayCheckinCard.tsx`).
  - `/trends`: Lazy-loaded interactive analytics view (`Trends.tsx`, `TrendsSummaryCard.tsx`) rendered with `Recharts`.
  - Recharts component suite: `BmiProgressionChart.tsx`, `SleepFatigueChart.tsx`, `HydrationChart.tsx`, `PhysicalActivityChart.tsx`, `MoodEnergyChart.tsx`.
  - Habit adherence & Gamification: `StreakProgressCard.tsx` with streak tracking and milestones.

### Business & Service Layer
- **Biometric Calculations:** Client-side deterministic BMI calculations (`healthService.ts`).
- **Tracking & Longitudinal Analytics (Milestone 3):**
  - `trackingService.ts`: Check-in upserts, body measurement logs, achievement unlocking, and historical query fetchers.
  - `streaks.ts`: Timezone-resilient calendar streak calculation, today's status, milestone detection.
  - `trendAggregation.ts`: Data smoothing, empty-state interpolation, and non-causal wellness correlation insights (requires ≥7 check-ins).
- **Report Synthesizer:** Pure `buildReportData` builder function, activity habit scoring (0-100), and doctor discussion points generator (`reportService.ts`).
- **Vector PDF Generator:** Client-side vector PDF generation with selectable text, A4 layout, dynamic multi-page flow, and embedded QR verification code (`pdfService.ts` via `pdf-lib` and `qrcode`).
- **Cryptographic Share Service:** 32-byte secure token handling, SHA-256 hashing, immutable snapshotting, and revocation management (`shareService.ts`).
- **Fallback Simulation:** Dedicated Demo Mode allowing immediate zero-friction offline evaluation across assessments, check-ins, achievements, and trend charts.

### Backend & AI Layer
- **Database:** Supabase PostgreSQL with strict Row Level Security (tables: `profiles`, `health_assessments`, `chat_sessions`, `chat_messages`, `report_shares`, `daily_checkins`, `body_measurements`, `user_achievements`).
- **Edge Functions:**
  - `analyze-health`: Multi-variable risk assessment and habit generation.
  - `chat-consult`: Multi-turn conversational symptom exploration with emergency interceptor.
  - `create-share-link`: Authenticated link creation with SHA-256 token hashing and snapshot immutability.
  - `get-shared-report`: Public read-only endpoint with per-IP rate limiting and uniform error masking.
  - `revoke-share-link`: Immediate access revocation.
  - `generate-doctor-questions`: Non-diagnostic physician discussion questions generator.
- **Safety Gateways:**
  - Mandatory disclaimer: *"This is not a medical diagnosis."*
  - Strict categorical risk ratings: `Low` | `Medium` | `High`.
  - Non-prescriptive, habit-oriented recommendations.
  - Crisis / Emergency keyword interceptor applied to daily reflection notes.
  - Personal reflections and mood scores are strictly excluded from exported reports and shared physician links.
  - No public database policies: public sharing mediated strictly via verified token hashes.
