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
- **Framework:** React 18 with TypeScript.
- **Routing:** `react-router-dom` v6 with client-side protected route wrappers.
- **State & Query:** React Context (`AuthContext`) for authentication state; `@tanstack/react-query` for query caching.
- **UI & Styling:** Tailwind CSS + Radix UI primitives (`shadcn/ui`) with custom wellness theme tokens.

### Business & Service Layer
- **Biometric Calculations:** Client-side deterministic BMI calculations (`healthService.ts`).
- **Data Persistence:** Direct Supabase client interaction with auto session injection and RLS authorization.
- **Fallback Simulation:** Dedicated Demo Mode allowing immediate zero-friction evaluation.

### Backend & AI Layer
- **Database:** Supabase PostgreSQL with strict Row Level Security.
- **Edge Functions:** Supabase Deno Edge Function (`analyze-health`) encapsulating AI reasoning and secret management.
- **Safety Gateways:**
  - Mandatory disclaimer: *"This is not a medical diagnosis."*
  - Strict categorical risk ratings: `Low` | `Medium` | `High`.
  - Non-prescriptive, habit-oriented recommendations.
