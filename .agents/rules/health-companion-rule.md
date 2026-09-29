---
trigger: always_on
---

# AGENT RULES — Health Companion AI

> Read this file fully before ANY task. Rules are mandatory. If a request conflicts with a rule, explain the conflict and ask first. Medical-safety and security rules can never be overridden.

---

## 1. Project Identity
- **Name:** Health Companion AI (formerly InnerGlow Insights): AI health and wellness web app, built as a scalable startup product.
- **Mission:** BMI evaluation, categorical risk assessment (`Low` / `Medium` / `High`), non-prescriptive lifestyle guidance, history tracking, exportable reports.
- **Promise:** Safe, honest, non-diagnostic. **"This is not a medical diagnosis."**
- **Repo:** github.com/Huzaifa-Ansari-AI/Health-Companion-AI (branch `main`).
- **Owner:** Huzaifa, CS student learning Agentic AI. Keep code readable and explain simply.

## 2. Current State
- ✅ M0 Foundation Hardening: DONE (commit `54e9844`)
- ⏳ M1 AI Symptom Chatbot + Report Generation: NEXT
- 📋 M2 Reports and PDF Export → M3 Vitals Analytics → M4 Profile and Privacy → M5 CI/CD and Launch
- Never break existing features: auth, demo mode, protected routes, assessment, dashboard, print report, ErrorBoundary.
- Baseline: 7 tests pass, 0 lint errors, `tsc --noEmit` clean, build passes, no secrets in repo.
- Follow milestone order in `docs/ROADMAP.md`. Never start a later milestone before the current one is verified.

## 3. Stack (no changes without approval)
React 18 + TypeScript 5 (strict), Vite 5, Tailwind 3, shadcn/ui + Radix, Lucide, react-router 6, TanStack Query + Context, Supabase (Postgres, Auth, RLS, Deno Edge Functions), Vitest + React Testing Library, Recharts (M3).
- Add no new library if an existing one works. If truly needed: explain why, then wait for approval.
- No major-version upgrades unless asked. Never bring back Lovable.

## 4. Golden Rules
1. **Plan first.** For anything bigger than a tiny fix: goal, files, risks, tests. Wait for approval on large or risky changes.
2. **Small steps.** One feature or fix at a time. No giant rewrites.
3. **Never break working features.** Verify before saying "done".
4. **Never guess.** Ask when unclear. Check docs and existing code first.
5. **Be honest.** Report failures and limits. Never claim it works without checking.
6. **Safety and security beat speed.**
7. **Clean code.** No dead code, debug logs, or commented-out blocks.
8. **Simple English** in all explanations.

## 5. Medical Safety (CRITICAL)
This is a wellness tool, NOT a medical device or doctor.

**NEVER:** diagnose ("you have X"), prescribe medicine or doses, tell users to change medication, claim clinical accuracy or doctor replacement, give false reassurance.

**ALWAYS:**
- Show the disclaimer *"This is not a medical diagnosis. It is general wellness guidance. Please consult a qualified healthcare professional."* on assessment results, chatbot (start and summaries), dashboard summaries, and all reports.
- Use only `Low`, `Medium`, `High` as risk labels. Never show or use a numeric disease probability.
- Use cautious wording ("may be related to", "worth discussing with a doctor").
- Suggest a professional for `Medium`/`High` risk, persistent symptoms, or doubt.

**Emergency detection (mandatory):**
- Red flags: chest pain/pressure, breathing trouble, stroke signs, severe bleeding, fainting, sudden severe headache, suicidal thoughts, overdose, severe allergic reaction.
- On detection: stop normal flow, show a clear emergency warning, advise contacting local emergency services (911 or local number) or the nearest ER.
- Works even if the AI fails: rule-based keyword layer plus AI check. Add many unit tests with varied phrasings.
- Self-harm or crisis: reply with empathy, urge crisis or emergency help, never give harmful details.
- Any change to prompts, risk logic, or disclaimers needs tests proving guardrails still hold.

## 6. AI / LLM Rules
- **All AI calls run server-side** in Supabase Edge Functions. Never from React.
- Provider keys only in Supabase secrets. Never in client code, logs, or commits.
- Every Edge Function: verify JWT, validate input (type, length, allowed values), set timeouts, return consistent JSON, give safe error messages.
- Keep system prompts in versioned files (e.g. `supabase/functions/_shared/prompts/`). Each includes: role, safety rules, disclaimer, allowed risk labels, output format.
- Require strict JSON output, validate with a schema (Zod). On failure retry once, then return a safe fallback. Never render unvalidated AI output.
- Treat user text as untrusted: limit length, strip control characters, and never let it override safety rules (prompt injection).
- Send the minimum data. No email or full name to the AI unless required.
- Use a small provider adapter so Gemini/OpenAI can be swapped.
- Add per-user rate limits. Never log full sensitive chats.
- Streaming (M1) must handle partial output, network drop, cancel, and errors.

## 7. Architecture
```
src/components/{auth,common,landing,chat,dashboard,ui}
src/{context,hooks,lib,pages,services,types}
supabase/{functions,migrations}   docs/
```
- **Pages:** compose components, call hooks/services, no heavy logic.
- **Components:** UI only, no direct Supabase calls.
- **Services:** business logic and Supabase/Edge calls, pure and testable.
- **Hooks:** wrap React Query and stateful logic.
- Shared types in `src/types/`. Use `@/*` alias. Split files over ~250 lines.

## 8. Coding Standards
- TypeScript strict. **No `any`** (use `unknown` and narrow). No `@ts-ignore` without a written reason.
- Explicit types on public functions, service returns, props. Validate all external data (API, DB, AI) at the boundary.
- Function components and hooks only. Server state via React Query.
- Every async UI has **loading, empty, and error** states.
- Small single-purpose functions. Comments explain *why*. JSDoc on services.
- Use named constants, not magic numbers.
- No `console.log` in committed code. Never swallow errors: friendly user message, technical detail in logs.

## 9. Database and Supabase
- Every schema change is a **new timestamped migration**. Never edit an applied one.
- **RLS on every table**, owner-only policies (`auth.uid() = user_id` or `= id`), with separate policies per operation.
- Service-role key only inside Edge Functions, and only when needed. Never in the client.
- Use `NOT NULL`, `CHECK` (risk in `Low|Medium|High`), foreign keys with correct `ON DELETE`, indexes on `user_id` and `created_at`.
- Assessments are immutable logs: add new records, never overwrite history.
- Create tables only in their milestone: chat sessions and messages (M1), share links with expiry (M2), daily check-ins (M3), health profile and consent (M4).
- Keep demo data isolated.

## 10. Security and Privacy
- Never commit secrets. `.env` is git-ignored. `.env.example` has placeholders only. `VITE_*` holds public values only (Supabase URL and anon key).
- Validate and sanitize inputs on client AND server.
- No `dangerouslySetInnerHTML` with user or AI content. Render AI text safely.
- Keep `/dashboard`, `/assessment` and all future private routes protected, and test the redirects.
- Health data is sensitive: collect the minimum, explain why, never share with third parties without consent. Never log health details or tokens.
- M4: data export, full account and data deletion (cascade), AI consent toggles. Never claim HIPAA/GDPR compliance unless truly achieved.
- Share links (M2): unguessable, expiring, read-only, revocable.

## 11. UX and Accessibility
- Keep the wellness design (soft teal, calm mint, slate). Reuse tokens from `src/index.css` and shadcn components. No random colors.
- Mobile-first and responsive (phone, tablet, desktop).
- Calm, empathetic, simple language. Avoid scary medical wording.
- Semantic HTML, input labels, keyboard navigation, visible focus, good contrast, `aria-*`. Never use color alone for risk (add text or icon).
- Chatbot: typing indicator, quick-reply chips, auto-scroll, retry, "AI, not a doctor" label, emergency banner.

## 12. Testing and Quality Gates
Before any task is "done", all must pass:
```
npm run lint        # 0 errors, 0 warnings
npx tsc --noEmit    # no type errors
npm run test        # all tests pass
npm run build       # build succeeds
```
- Every new service or utility gets unit tests (normal, edge, error). Key user flows get component tests.
- Mandatory tests: BMI, risk logic, emergency detection, disclaimer presence, auth guards, AI schema validation.
- Mock Supabase and AI. Tests never call real external services.
- Never delete or weaken a test to make it pass. Test count never drops below the baseline (7).

## 13. Git and Docs
- Use feature branches for big work (`feat/m1-chat-ui`). Merge to `main` only when gates pass.
- Conventional Commits: `feat(scope):`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`. One logical change per commit.
- Never commit `.env`, `node_modules`, `dist`. Never force-push `main`.
- No destructive actions (drop DB, mass delete, `git reset --hard`) without approval.
- Keep docs in sync with code: `ROADMAP` (tick items), `ARCHITECTURE`, `ROUTES`, `SUPABASE`, `SECURITY`, `DEPLOYMENT`, `README`. Outdated docs are a bug.

## 14. Milestone 1 Build Order
1. **Data layer:** migration for chat sessions and messages with RLS, types, `chatService`.
2. **Edge Function `chat-consult`:** JWT check, validation, system prompt, emergency layer, AI call, safe errors.
3. **Chat UI:** page or drawer, messages, typing indicator, quick chips, loading/error states, saved history.
4. **Safety:** emergency detection (rules + AI), disclaimers, `Low/Medium/High` risk.
5. **Report:** AI extracts symptoms, duration, intensity, lifestyle into a validated "Health Assessment Summary".
6. **Sync:** save the summary to `health_assessments` so it shows on the dashboard.
7. **Tests and docs**, then milestone review.

**M1 Done =** all ROADMAP M1 items complete, emergency flow tested, gates pass, docs updated, no secrets exposed, works on mobile and desktop, demo mode safe (limits or mock replies, never real keys).

For M2 to M5: give a short implementation plan for approval first, then apply the same rules.

## 15. Workflow for Every Task
1. **Understand:** restate the goal in 2-3 lines, list assumptions, ask if unclear.
2. **Plan:** files, DB or function changes, risks, tests. Wait for approval on big changes.
3. **Implement:** small increments.
4. **Verify:** run all gates. Check empty input, network failure, logged-out user, mobile view.
5. **Report** in simple English:
```
✅ Done:
📁 Files changed:
🧪 Verification (lint/types/tests/build):
⚠️ Known issues:
➡️ Next step:
```

## 16. Strictly Forbidden
- Secrets in client code or git history; AI calls from the browser.
- Diagnoses, prescriptions, or dosage advice anywhere; removing disclaimers.
- Disabling RLS or using `USING (true)` on user data.
- Using `any`, disabling lint rules, or skipping tests.
- Deleting data, migrations, or big code parts without approval.
- Silent stack changes or heavy new dependencies.
- Calling a task complete without running the gates.
- Inventing features, medical facts, statistics, or compliance claims.
- Leaving TODOs or fake data in production paths.

## 17. When in Doubt
Choose the **safer** option (medical safety, then security, then user data). Choose the **simpler** option. **Ask** before assuming. Keep the project clean, tested, documented, and production-ready.
