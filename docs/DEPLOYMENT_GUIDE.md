# Afiyat AI — Production Deployment Guide (Vercel & Supabase)

> **Application:** Afiyat AI (عافیت AI) — AI Health & Wellness Companion  
> **Repository:** `Huzaifa-Ansari-AI/Health-Companion-AI`  
> **Platform:** Vercel (Frontend SPA) + Supabase (Database, Auth & Edge Functions)  

---

## 1. Vercel Configuration & Environment Variables

When importing the project on Vercel, the framework is automatically detected as **Vite**.

### Build & Output Settings
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install` (or `npm ci`)

### Environment Variables Checklist
Add the following environment variables in Vercel under **Project Settings -> Environment Variables**:

| Variable Name | Required? | Environments | Description |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | **Yes** | Production, Preview, Development | Your Supabase project URL (e.g. `https://xxxx.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Production, Preview, Development | Your Supabase anonymous public key. |
| `VITE_APP_URL` | Recommended | Production, Preview | The canonical URL (e.g. `https://afiyat-ai.vercel.app`). |
| `VITE_SENTRY_DSN` | Optional | Production, Preview | Sentry DSN for error telemetry (configured in Phase 4). |

> [!CAUTION]
> **Never enter `GEMINI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in Vercel.**  
> Server-side secrets are securely stored inside Supabase Vault/Secrets for Deno Edge Functions and must never be exposed to client-side code or Vercel environment variables.

---

## 2. Supabase Authentication URL Configuration

For email authentication, magic links, and redirects to work properly on Vercel:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Authentication -> URL Configuration**.
3. **Site URL:**
   - Set to your Vercel production domain:
     ```text
     https://afiyat-ai.vercel.app
     ```
4. **Redirect URLs:**
   - Add wildcard patterns to allow preview branch deployments to authenticate:
     ```text
     https://afiyat-ai.vercel.app/**
     https://*.vercel.app/**
     http://localhost:5174/**
     http://localhost:5173/**
     ```
5. Click **Save Changes**.

---

## 3. Client-Side Routing & SPA Fallback (`vercel.json`)

Vite applications are Single Page Applications (SPAs). When a user navigates to `/dashboard` or `/assessment` and refreshes the browser, Vercel must route the request back to `/index.html` rather than searching for a nonexistent static HTML file.

This repository includes a preconfigured `vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 4. Custom Domain Setup (Optional / Launch)

When ready to link a custom domain (e.g. `afiyatai.com`):
1. In Vercel, go to **Project Settings -> Domains**.
2. Enter your domain name and click **Add**.
3. Add the required DNS records at your domain registrar:
   - **Type A:** `@` pointing to `76.76.21.21` (Vercel IP)
   - **Type CNAME:** `www` pointing to `cname.vercel-dns.com`
4. Once DNS propagates, Vercel will automatically provision a free SSL certificate.
5. Update your Supabase **Site URL** to `https://afiyatai.com`.
