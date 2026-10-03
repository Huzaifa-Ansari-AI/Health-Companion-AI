# Application Route Registry

| Path | Component | Protection | Description |
|---|---|---|---|
| `/` | `Index.tsx` | Public | Marketing landing page with hero, features, how it works, and trust section |
| `/auth` | `Auth.tsx` | Public | Email/Password login, registration form, and Demo Mode trigger |
| `/dashboard` | `Dashboard.tsx` | Protected (`ProtectedRoute`) | User dashboard displaying latest BMI, risk level, recommendations, and assessment history |
| `/assessment` | `Assessment.tsx` | Protected (`ProtectedRoute`) | Multi-step interactive health check (Biometrics, Symptoms, Lifestyle, AI Review) |
| `/chat` | `Chat.tsx` | Protected (`ProtectedRoute`) | Full-screen conversational AI symptom consultation, quick reply chips, emergency detection, and history |
| `/reports/:assessmentId` | `Report.tsx` | Protected (`ProtectedRoute`) | Structured 8-section wellness summary report, on-screen view, A4 print, PDF export, and share controls |
| `/shared/:token` | `SharedReport.tsx` | Public (Token Verified) | Read-only doctor view of shared wellness report, expiring access, noindex/nofollow privacy header |
| `*` | `NotFound.tsx` | Public | 404 Not Found error page |
