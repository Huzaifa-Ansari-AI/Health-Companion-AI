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

