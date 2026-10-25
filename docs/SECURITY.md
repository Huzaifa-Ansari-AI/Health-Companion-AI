# Security & Privacy Policy

## 1. Principles of Security

1. **No Client-Side Secrets:** Private keys, including AI Provider API keys and Supabase `service_role` keys, are never embedded in client bundles or public repositories.
2. **Strict Row Level Security (RLS):** All database operations against PostgreSQL tables are guarded by Row Level Security policies checking `auth.uid() = id` or `auth.uid() = user_id`.
3. **Defense in Depth for AI:** Sensitive calculations and AI calls flow through secure serverless Edge Functions where inputs are sanitized before inference.
4. **Data Minimization & User Privacy:** Health biometrics and assessment records are scoped strictly to the authenticated user account and never shared with unverified third parties.

---

## 2. Medical Safety Standards

- **Informational Awareness Only:** The application strictly enforces the disclaimer:  
  *"This is not a medical diagnosis."*
- **No Direct Medical Prescriptions:** The AI output strictly restricts itself to lifestyle habits (sleep, hydration, activity, balanced diet).
- **Categorical Risk Assessment:** Outputs are limited to `Low`, `Medium`, or `High` categorical indicators rather than probabilistic diagnostic claims.

---

## 3. Authentication Security & Email Verification

- **Password Policy:** Enforces minimum 8 characters and checks against known trivial passwords.
- **Email Verification & Session Guard:** Accounts created while email confirmation is active receive no session until verified. Premature access to protected routes is guarded by `ProtectedRoute`.
- **Anti-Abuse Throttling:** Resend confirmation requests enforce a client-side 60-second cooldown timer alongside Supabase server-side rate limits.
- **Error Obfuscation:** Authentication error mapping avoids leaking whether an account exists to mitigate email enumeration vectors.

---

## 4. Secret Scans & Audits

- Codebase regularly verified against patterns like `sk-`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and sensitive tokens.
- All `.env*` files excluded by `.gitignore`.

---

## 5. Report Sharing Threat Model & Protections (Milestone 2)

Sharing personal health data requires defense-in-depth against unauthorized access, eavesdropping, indexing, and brute-force attacks:

1. **High-Entropy Tokens:** Every share link uses a 32-byte cryptographically secure random token (256 bits of entropy) generated using `crypto.getRandomValues`. Guessing a valid token is mathematically infeasible.
2. **Zero Plaintext Storage (SHA-256 Hashing):** The database stores only the SHA-256 hash of the token. The raw token is returned to the user exactly once at creation and cannot be retrieved from the database even by administrators or database dumps.
3. **Owner-Only Database Access (No Public RLS):** The `report_shares` table allows SELECT/INSERT/UPDATE/DELETE exclusively for `auth.uid() = user_id`. There are zero public database policies on health data. Public access is strictly mediated through the server-side `get-shared-report` Edge Function.
4. **Anti-Brute-Force Rate Limiting:** The public retrieval endpoint enforces per-IP sliding window rate limiting (maximum 30 requests per minute) to block automated scanning.
5. **Uniform Error Masking (No Oracle Attacks):** Invalid tokens, expired links, and revoked shares all return the exact same generic HTTP 404 error response (`"This health report link is invalid, expired, or has been revoked."`). The endpoint never reveals whether a link ever existed or why it was denied.
6. **Immutable Sanitized Snapshots:** Shared reports freeze a standalone JSONB snapshot at creation time. Subsequent updates to the user's live health assessments will never alter what a doctor previously reviewed.
7. **Privacy-by-Default Controls:** Links default to anonymizing the user's full name and sanitizing consultation excerpts, minimizing data exposure.
8. **Anti-Indexing Protection:** The `/shared/:token` page programmatically injects `<meta name="robots" content="noindex, nofollow" />` directives to prevent search engine indexing.
9. **Time-Limited & Revocable Access:** Links strictly expire after 24 hours, 3 days, or 7 days (maximum 7 days). Users can instantaneously revoke any active link from the management panel.

---

## 6. Longitudinal Tracking & Privacy Boundaries (Milestone 3)

Daily wellness tracking requires clear privacy boundaries between objective biometric trends and private personal reflections:

1. **Strict Reflection Isolation:** Freeform notes and daily mood scores are strictly private to the user. They are NEVER included in generated vector PDF reports, printed summaries, or public doctor share links.
2. **Client-Side & Server-Side Crisis Interception:** The daily check-in freeform notes field is screened through the `detectEmergencyOrCrisis` detector. Any language indicating self-harm, severe distress, or emergency triggers an immediate empathetic crisis intervention modal with direct access to crisis lifelines (988 Suicide & Crisis Lifeline) before submission.
3. **Non-Causal Analytics Phrasing:** The correlation between sleep duration and reported fatigue strictly requires ≥7 data points and uses neutral non-causal phrasing ("In your logged data, higher fatigue occurred on days with..."). It never claims diagnostic causation or replaces clinical sleep evaluation.
4. **Optional Report Inclusion:** Longitudinal vitals trends in generated reports are strictly OFF by default and require deliberate user opt-in via toolbar toggle.
5. **Owner-Only RLS Policies:** `daily_checkins`, `body_measurements`, and `user_achievements` strictly enforce `auth.uid() = user_id` on all CRUD operations. No public database policies exist.

---

## 7. User Health Profile, Privacy Center & GDPR/HIPAA-Ready Architecture (Milestone 4)

Patient health records require rigorous privacy safeguards, explicit consent management, and granular user autonomy:

1. **Strict Opt-in Defaults (Default OFF):** All 5 privacy consent toggles (`store_health_profile`, `ai_personalization`, `analytics_participation`, `doctor_share_retention`, `email_digest`) default to `false` until the user deliberately grants permission.
2. **Append-Only Consent Audit Trail:** Every consent state transition is recorded in the immutable `privacy_consents` audit table with timestamp, client metadata, and user ID. Previous records are never overwritten.
3. **AI Context Minimization (`aiProfileContext.ts`):** When `ai_personalization` is enabled, data passed to the AI is strictly minimized:
   - Full names, emails, and identifiers are completely stripped.
   - Exact ages are converted to age brackets (e.g., "25-34 years").
   - Freeform reflections and daily mood logs are excluded.
   - Profile context is injected with mandatory non-diagnostic system constraints.
4. **Machine-Readable Data Portability (`exportUserData`):** Users can export their complete health record at any time into a formatted, machine-readable JSON archive containing demographics, assessments, chat summaries, check-ins, allergies, conditions, medications, and consent history.
5. **Irreversible Two-Step Cascade Deletion (`deleteUserDataCascade`):** Users retain the absolute right to be forgotten. Account deletion requires explicit two-step confirmation (typing `"DELETE"`), immediately executing an atomic database cascade that purges all records across 16 tables and terminates the Supabase auth account.
6. **Zero Third-Party Ad Trackers or Telemetry:** Health data is never sold, shared, or passed to external advertising networks or unverified tracking scripts.

---

## 8. Gemini LLM Integration & Medical Guardrails Hardening (Milestone 4.5)

To ensure clinical safety, reliability, and security across the conversational and assessment pipelines:

1. **Zero Client-Side LLM Access:** The frontend browser application never calls Gemini or any AI provider directly. All AI requests flow exclusively through authenticated Supabase Edge Functions (`chat-consult`, `analyze-health`).
2. **Environment Secret Isolation:** `GEMINI_API_KEY` and model configuration reside strictly inside Supabase Edge Function secrets and are never exposed in client bundles or network requests.
3. **Structured Zod Schema Validation & Safe Fallback:** All Edge Functions enforce strict JSON schema parsing using Zod. In the event of malformed LLM responses or timeouts, the functions fall back gracefully to deterministic, non-diagnostic baseline structures rather than failing or returning unvalidated text.
4. **Dual-Layer Emergency Interceptor (Rules + AI):** High-sensitivity regex rules and keyword interceptors run before and alongside LLM inference. Detection of acute emergencies (chest pain, stroke signs, anaphylaxis, severe respiratory distress, suicidal ideation) or oncology alarms immediately overrides normal flow and displays emergency medical hotline guidance.
5. **Multilingual Safety Equivalence:** AI prompts and safety boundary rules operate identically across both English and Roman Urdu, preventing safety guardrail bypass via language-switching prompt injection attacks.


