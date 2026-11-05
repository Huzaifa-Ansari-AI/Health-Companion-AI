# Health Companion AI — Personalized Health & Wellness Insights

An independent, production-grade AI Health Companion web application that helps users monitor wellness metrics, calculate BMI, evaluate potential health risk patterns, and receive personalized lifestyle recommendations.

---

## Key Features

- **Doctor-Ready Editable Reports (Milestone 4.5):** Patient refinement of symptoms timeline, chief complaint, vitals, and doctor discussion points with "Edited by you" badge, single-click reset to AI original, and synced vector PDF downloads.
- **Gemini AI Integration (English & Roman Urdu):** Multi-turn conversational AI engine powered by Google Gemini via serverless Edge Functions, with bilingual Roman Urdu/English support and automatic language alignment.
- **Regional Substance & Lifestyle Assessment:** 3-step dynamic biometric and lifestyle evaluation covering height (ft/in + cm), weight (kg/lbs), 12 symptoms, and regional oral substances (Gutka, Chhalia, Paan, Naswar, VELO/ZYN, energy drinks).
- **Dynamic Risk Indicators Grid:** Real-time categorical risk indicators displaying only actionable Medium/High risks tied directly to user inputs (or 1 positive Low Risk card if clear).
- **Interactive AI Symptom Consultation:** Conversational AI exploring symptoms with emergency red-flag interceptors and structured consultation synthesis.
- **Dynamic Health & Wellness Reports:** 8-section standardized wellness summary with patient vitals, symptoms timeline, lifestyle scoring (0-100), categorical risk assessment (`Low` / `Medium` / `High`), optional 7-day vitals trends, and doctor discussion points.
- **Client-Side Vector PDF Export:** High-fidelity, multi-page vector PDF generation (`pdf-lib`) with selectable text, A4 layout, dynamic pagination, and embedded QR code verification (`qrcode`).
- **Secure Expiring Share Links:** Share immutable wellness snapshots with doctors via 32-byte cryptographic tokens, SHA-256 server-side hashing, privacy anonymization toggles, and zero public database policies.
- **Longitudinal Trend Analytics (`Recharts`):** Interactive visualization suite (`/trends`) featuring BMI progression, sleep vs. fatigue correlations (≥7 logs), hydration tracking, physical activity timelines, and mood & energy distribution.
- **Daily 30-Second Wellness Check-in:** Rapid daily habit tracking (`/checkin`) capturing sleep, hydration, activity, mood, and private notes with integrated client/server crisis intervention guards.
- **Streak & Achievement Gamification:** Calendar-accurate streak counting, milestones (First Check-in, 3-Day & 7-Day Streaks, Hydration Hero, Sleep Champion), and positive motivation without guilt mechanics.
- **Patient Health Profile & Personalization (`/profile`):** Known allergies with severity ratings, health conditions, family health history, current medications (strictly non-prescriptive background context), and profile completeness scoring (0-100%).
- **Privacy-Focused Data Management Center:** 5 granular opt-in consent toggles (default OFF), append-only audit trail logging, single-click machine-readable JSON data export, and permanent two-step cascade account & data deletion.
- **Consent-Guarded AI Personalization:** AI consultation context minimization filter mapping exact ages to brackets, stripping identifiers, and enforcing non-diagnostic boundaries.
- **Public Verified Doctor View:** Read-only report view (`/shared/:token`) with automatic `noindex, nofollow` SEO privacy headers, expiration banners, and uniform error masking.
- **Personalized Health Assessment:** Step-by-step biometric evaluation covering height, weight, BMI, symptoms, and daily habits.
- **Persistent Dashboard & History:** Track health assessments over time with instant "View Report" actions.
- **Isolated Demo Mode:** Zero-friction offline testing without requiring an external database connection across all assessments, check-ins, achievements, and trend charts.
- **Strict Medical Boundaries:** Mandatory disclaimers (*"This is not a medical diagnosis"*) and non-prescriptive lifestyle guidance.

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI primitives (`shadcn/ui`), Lucide React icons
- **State & Routing:** `react-router-dom` (v6), `@tanstack/react-query`
- **Backend:** Supabase (PostgreSQL with Row Level Security, GoTrue Auth)
- **AI Processing:** Serverless Supabase Edge Functions with server-side AI provider isolation

---

## Architecture

```
Antigravity IDE
      ↓
Local Git Repository
      ↓
Independent GitHub Repository
      ↓
Deployment Platform (Vercel / Netlify / Cloudflare)
      ↓
React + Vite Frontend
      ↓
Supabase Backend
      ├── Authentication (GoTrue)
      ├── PostgreSQL Database (Profiles & Assessments)
      ├── Row Level Security (RLS)
      └── Edge Functions (AI Reasoning)
```

---

## Getting Started

### 1. Prerequisites
- Node.js (version 18+ or 20 LTS recommended)
- `npm`

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env
```
Fill in your Supabase project parameters:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-anon-key
```

### 4. Running the Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5174`.

### 5. Production Build
```bash
npm run build
```
The optimized production bundle will be output to the `dist/` directory.

### 6. AI Engine Configuration (Google Gemini)
The consultation chatbot, AI health summaries, dynamic risk assessments, and doctor questions run server-side via Supabase Edge Functions (`chat-consult`, `analyze-health`, and `generate-doctor-questions`).

Configure the following secrets in your Supabase project dashboard (**Project Settings** -> **Edge Functions** -> **Manage Secrets**):
```env
GEMINI_API_KEY=AIzaSy...              # Your Google AI Studio API Key (Required)
GEMINI_MODEL=gemini-1.5-flash        # Primary active model (e.g. gemini-1.5-flash)
GEMINI_FALLBACK_MODEL=gemini-2.0-flash # Optional fallback model on rate-limits, timeouts, or 503s
```
*Note: In Demo Mode, an offline simulated health analysis engine runs locally without requiring an API key or network connection.*

### 7. Deploying Edge Functions
Whenever Edge Function code is updated, redeploy each changed function using the Supabase CLI:
```bash
npx supabase functions deploy chat-consult --no-verify-jwt
npx supabase functions deploy analyze-health --no-verify-jwt
npx supabase functions deploy generate-doctor-questions --no-verify-jwt
```
*(JWT verification is enforced programmatically within the Deno handler via Supabase Auth).*

### 8. Reading Edge Function Logs
To inspect real-time server-side logs without exposing sensitive health information or secrets:
1. Open your **Supabase Dashboard** -> **Edge Functions**.
2. Click on the target function (e.g. `chat-consult`).
3. Navigate to the **Logs** tab.
4. Each entry includes safe telemetry: `[ai] [requestId] fn=callGemini model=gemini-1.5-flash status=200 latency=1240ms`.

### 9. AI Troubleshooting Guide

| Error Category | Likely Cause | Actionable Resolution |
| :--- | :--- | :--- |
| `key_missing` | Secret `GEMINI_API_KEY` is missing in Supabase Edge Functions. | Add `GEMINI_API_KEY` under Edge Functions > Manage Secrets. |
| `auth_invalid` | `GEMINI_API_KEY` is mistyped, expired, or rejected by Google. | Check Google AI Studio and re-save the valid API key in Supabase secrets. |
| `model_not_found` | Model name in `GEMINI_MODEL` has been retired or doesn't exist. | Update `GEMINI_MODEL` to an active model (e.g. `gemini-1.5-flash`). |
| `rate_limited` | Google AI Studio RPM or token quota reached (429). | Wait 15–30 seconds. Edge Functions automatically retry twice with backoff & jitter. |
| `timeout` | Upstream Gemini response exceeded server timeout (25s). | Configure `thinkingBudget: 0` (default) or set `GEMINI_FALLBACK_MODEL`. |
| `upstream_unavailable` | Google Gemini API temporary 500/503 overload. | Wait a moment and click Retry. Automatic exponential backoff will attempt recovery. |
| `bad_request` | Invalid generation parameters or empty request payload. | Verify message content and retry. |
| `internal` | Unexpected schema validation failure or edge error. | Inspect the Supabase Edge Function logs for the specific request ID. |


---

## Documentation

- [Roadmap & Milestone Status](docs/ROADMAP.md)
- [M4.5 AI Hardening Implementation Plan](docs/M4.5_PLAN.md)
- [Project Audit](docs/PROJECT_AUDIT.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Supabase Setup & Schema](docs/SUPABASE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Security & Medical Standards](docs/SECURITY.md)
- [Route Registry](docs/ROUTES.md)

---

## License
MIT

