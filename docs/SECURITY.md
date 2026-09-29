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
