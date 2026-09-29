# AI Health Assistant — Personalized Health Insights

An independent, production-ready AI Health Assistant web application that helps users monitor wellness metrics, calculate BMI, evaluate potential health risk patterns, and receive personalized lifestyle recommendations.

---

## Key Features

- **Personalized Health Assessment:** Step-by-step evaluation covering biometrics, symptom awareness, and daily habits (sleep, hydration, activity).
- **Automated BMI Calculation:** Real-time BMI scoring with categorical health range indicators.
- **Categorical Risk Assessment:** Transparent risk level classifications (`Low` / `Medium` / `High`).
- **Actionable AI Recommendations:** Practical lifestyle advice for nutrition, exercise, sleep, and hydration.
- **Persistent Dashboard & History:** Track health assessments over time.
- **Downloadable Health Report:** Quick browser-native print and export feature for records.
- **Isolated Demo Mode:** Instant exploration without requiring immediate account creation.
- **Strict Medical Boundaries:** Enforces clear safety disclaimers (*"This is not a medical diagnosis"*).

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
