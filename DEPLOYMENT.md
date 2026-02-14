# Deployment Guide — All on Vercel + Neon

## Architecture

```
┌──────────────────┐     ┌──────────────────┐
│   Frontend       │     │   PostgreSQL     │
│   (Vercel)       │     │   (Neon)         │
│   Vite/React     │     │                  │
│   Static SPA     │     │   Free tier:     │
├──────────────────┤────▶│   3 GiB storage  │
│   Backend        │     │   100 hrs compute│
│   (Vercel)       │     │                  │
│   Serverless Fn  │     └──────────────────┘
└──────────────────┘
```

Both frontend and backend deploy on Vercel. Database on Neon.

## Cost

| Service | Tier  | Cost     | Limits                         |
|---------|-------|----------|--------------------------------|
| Vercel  | Hobby | $0/month | 100 GB bandwidth, 10s fn limit |
| Neon    | Free  | $0/month | 3 GiB storage, 100 hrs compute |

**Total: $0/month**

---

## Prerequisites

- Vercel account ([vercel.com](https://vercel.com))
- Neon account ([neon.tech](https://neon.tech)) — already set up
- GitHub repo pushed

---

## Step 1: Neon Database (already done)

You've already set up Neon. Make sure you have your connection string:

```
postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

Run migrations and seed if you haven't:

```bash
DATABASE_URL="your-connection-string" npm run migrate --prefix backend
DATABASE_URL="your-connection-string" npm run seed --prefix backend
```

---

## Step 2: Prepare Backend for Vercel Serverless

The backend needs a serverless entry point. Create `backend/api/index.js`:

```js
import app from '../src/app.js';
export default app;
```

And a `backend/vercel.json` to route all requests through the serverless function:

```json
{
  "version": 2,
  "builds": [
    { "src": "api/index.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "api/index.js" }
  ]
}
```

---

## Step 3: Deploy Backend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Configure:
   - **Root Directory**: `backend`
   - **Framework Preset**: Other
4. Add environment variables:

   | Variable                  | Value                              |
   |---------------------------|------------------------------------|
   | `DATABASE_URL`            | Your Neon connection string        |
   | `JWT_SECRET`              | A strong random string (32+ chars) |
   | `CORS_ORIGIN`             | `https://your-frontend.vercel.app` |
   | `TELEPHONY_PROVIDER`      | `mock`                             |
   | `TRANSCRIPTION_PROVIDER`  | `mock`                             |

5. Deploy. Note the generated URL (e.g., `https://lead-mgmt-api.vercel.app`)

---

## Step 4: Deploy Frontend on Vercel

1. **Add New Project** again (same repo, separate project)
2. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
3. Add environment variable:

   | Variable       | Value                                  |
   |----------------|----------------------------------------|
   | `VITE_API_URL` | `https://lead-mgmt-api.vercel.app`     |

4. `frontend/vercel.json` already handles SPA rewrites:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
5. Deploy.

---

## Step 5: Verify

1. Open your frontend Vercel URL
2. Register a new account → Login
3. Verify leads load (from Neon seed data)
4. Select leads → Start dialer session
5. Check CRM activities sync

---

## Important: Serverless Limitations

Vercel serverless functions are **stateless** with a **10s execution limit** (Hobby). This means:

| Feature              | Status | Why                                              |
|----------------------|--------|--------------------------------------------------|
| Auth (login/register)| Works  | Stateless request-response                       |
| Lead CRUD            | Works  | Stateless request-response via Neon              |
| Lead enrichment      | Works  | Stateless request-response                       |
| CRM endpoints        | Works  | Stateless request-response via Neon              |
| Dialer engine        | Limited| `setTimeout` simulation may hit 10s limit        |
| WebSocket            | No     | Vercel doesn't support persistent connections    |
| In-memory Maps       | No     | State doesn't persist across function invocations|

**What this means for the dialer:**
- The dialer uses `setTimeout` (3-8s per call) and in-memory state to track active sessions. On serverless, each request is isolated — the session state won't survive between the "start session" request and the "get session" polling request.
- **With Neon:** if the DAL is wired to Postgres (via `DATABASE_URL`), CRUD operations work fine. The dialer engine specifically needs adaptation to work in serverless (e.g., store session state in Postgres instead of Maps).
- **WebSocket** won't work on Vercel. The frontend already falls back to HTTP polling automatically.

**For a demo/portfolio** this is fine — lead management, auth, and CRM features all work. The dialer is the one feature that needs a long-running process (Railway, Render, Fly.io) to work fully.

---

## Environment Variables Reference

### Backend (Vercel)

| Variable                  | Required | Default                           | Description                        |
|---------------------------|----------|-----------------------------------|------------------------------------|
| `DATABASE_URL`            | Yes      | —                                 | Neon PostgreSQL connection string  |
| `JWT_SECRET`              | Yes      | `dev-secret-change-in-production` | Must set a real secret in prod     |
| `CORS_ORIGIN`             | Yes      | `*`                               | Your frontend Vercel URL           |
| `TELEPHONY_PROVIDER`      | No       | `mock`                            | `mock` or `twilio`                 |
| `TRANSCRIPTION_PROVIDER`  | No       | `mock`                            | `mock` or `whisper`                |

### Frontend (Vercel)

| Variable       | Required | Default                | Description          |
|----------------|----------|------------------------|----------------------|
| `VITE_API_URL` | Yes      | `http://localhost:3002` | Backend Vercel URL   |

---

## Troubleshooting

### CORS Errors
- `CORS_ORIGIN` must match your exact frontend URL including `https://`
- No trailing slash: `https://lead-management-app.vercel.app` (not `...app/`)

### 404 on Page Refresh
- `frontend/vercel.json` has the SPA rewrite — should work out of the box

### Neon Cold Starts
- Neon free tier suspends after 5 min of inactivity
- First query after suspension takes 1-2s — the pg pool reconnects automatically

### Backend Returns 500
- Check Vercel function logs: **Project → Deployments → Functions tab**
- Most likely cause: missing `DATABASE_URL` or `JWT_SECRET` env var

### Dialer Doesn't Complete Sessions
- Expected on Vercel serverless — see limitations table above
- For full dialer functionality, deploy backend on Railway/Render instead
