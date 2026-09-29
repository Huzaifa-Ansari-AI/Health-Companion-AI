# Deployment Guide — Independent Hosting

This project is completely decoupled from Lovable and can be deployed directly from the new GitHub repository to modern hosting platforms such as **Vercel**, **Netlify**, or **Cloudflare Pages**.

---

## 1. Build Specifications

- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node.js Version:** >= 18.0.0 (Recommended: Node 20 LTS)
- **Package Manager:** `npm`

---

## 2. Environment Variables Configuration

Configure the following environment variables in your deployment dashboard (e.g. Vercel / Netlify Settings > Environment Variables):

| Variable Name | Required | Description | Example |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase Project URL | `https://xyzcompany.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | Your Supabase Anon / Public Key (or `VITE_SUPABASE_PUBLISHABLE_KEY`) | `eyJhbGciOiJIUzI1...` |

> [!IMPORTANT]
> Never configure `SUPABASE_SERVICE_ROLE_KEY` or AI Provider API keys in frontend hosting environments.

---

## 3. SPA Routing & Fallback

Since this application utilizes client-side routing via `react-router-dom`, all requests must rewrite to `/index.html`.

### Vercel
Add a `vercel.json` in the root directory:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Netlify
Add a `public/_redirects` file:
```
/*    /index.html   200
```

---

## 4. Step-by-Step Deployment Steps (Vercel Example)

1. Push your local repository to your new GitHub repository.
2. Log into your [Vercel Dashboard](https://vercel.com).
3. Click **Add New Project** and import the newly created GitHub repository.
4. Select Framework Preset: **Vite**.
5. Add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` environment variables.
6. Click **Deploy**.
