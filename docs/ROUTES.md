# Application Route Registry

| Path | Component | Protection | Description |
|---|---|---|---|
| `/` | `Index.tsx` | Public | Marketing landing page with hero, features, how it works, and trust section |
| `/auth` | `Auth.tsx` | Public | Email/Password login, registration form, and Demo Mode trigger |
| `/dashboard` | `Dashboard.tsx` | Protected (`ProtectedRoute`) | User dashboard displaying latest BMI, risk level, recommendations, and assessment history |
| `/assessment` | `Assessment.tsx` | Protected (`ProtectedRoute`) | Multi-step interactive health check (Biometrics, Symptoms, Lifestyle, AI Review) |
| `/chat` | `Chat.tsx` | Protected (`ProtectedRoute`) | Full-screen conversational AI symptom consultation, quick reply chips, emergency detection, and history |
| `*` | `NotFound.tsx` | Public | 404 Not Found error page |
