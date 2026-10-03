# AI Health Assistant — Personalized Health Insights

An independent, production-ready AI Health Assistant web application that helps users monitor wellness metrics, calculate BMI, evaluate potential health risk patterns, and receive personalized lifestyle recommendations.

---

## Key Features

- **Interactive AI Symptom Consultation:** Conversational AI engine exploring symptoms with emergency red-flag interceptors and structured consultation synthesis.
- **Dynamic Health & Wellness Reports:** 8-section standardized wellness summary with patient vitals, symptoms timeline, lifestyle scoring (0-100), categorical risk assessment (`Low` / `Medium` / `High`), and doctor discussion points.
- **Client-Side Vector PDF Export:** High-fidelity, multi-page vector PDF generation (`pdf-lib`) with selectable text, A4 layout, dynamic pagination, and embedded QR code verification (`qrcode`).
- **Secure Expiring Share Links:** Share immutable wellness snapshots with doctors via 32-byte cryptographic tokens, SHA-256 server-side hashing, privacy anonymization toggles, and zero public database policies.
- **Public Verified Doctor View:** Read-only report view (`/shared/:token`) with automatic `noindex, nofollow` SEO privacy headers, expiration banners, and uniform error masking.
- **Personalized Health Assessment:** Step-by-step biometric evaluation covering height, weight, BMI, symptoms, and daily habits.
- **Persistent Dashboard & History:** Track health assessments over time with instant "View Report" actions.
- **Isolated Demo Mode:** Zero-friction offline testing without requiring an external database connection.
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
Open your browser at `http://localhost:8080`.

### 5. Production Build
```bash
npm run build
```
The optimized production bundle will be output to the `dist/` directory.

---

## Documentation

- [Project Audit](docs/PROJECT_AUDIT.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Supabase Setup & Schema](docs/SUPABASE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Security & Medical Standards](docs/SECURITY.md)
- [Route Registry](docs/ROUTES.md)

---

## License
MIT
