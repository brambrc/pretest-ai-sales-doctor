# Deployment Guide

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Frontend   │────▶│     Backend      │────▶│   PostgreSQL     │
│   (Vercel)   │     │   (Railway)      │     │   (Neon)         │
│              │     │                  │     │                  │
│  Vite/React  │     │  Express + WS    │     │  Free tier:      │
│  Static SPA  │     │  Long-running    │     │  3 GiB storage   │
│              │     │  processes       │     │  100 hrs compute │
└──────────────┘     └──────────────────┘     └──────────────────┘
```

## Cost Summary

| Service  | Tier       | Cost     | Limits                        |
|----------|-----------|----------|-------------------------------|
| Vercel   | Hobby     | $0/month | 100 GB bandwidth              |
| Railway  | Trial     | $5 credit| 500 hrs/month                 |
| Neon     | Free      | $0/month | 3 GiB storage, 100 hrs compute|

**Total: $0/month** on all free tiers.

---

## Step-by-Step Deployment

### 1. Set Up Neon PostgreSQL

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project (e.g., `lead-management`)
3. Copy the connection string from the dashboard:
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```
4. Run the migration locally to create tables:
   ```bash
   DATABASE_URL="your-connection-string" npm run migrate --prefix backend
   ```
5. Optionally seed the database:
   ```bash
   DATABASE_URL="your-connection-string" npm run seed --prefix backend
   ```

### 2. Prepare Backend for Deployment

Update CORS to allow your frontend domain:

```bash
# In Railway, set this environment variable:
CORS_ORIGIN=https://your-app.vercel.app
```

### 3. Deploy Backend on Railway

1. Sign up at [railway.app](https://railway.app)
2. Create a new project → "Deploy from GitHub repo"
3. Select your repository
4. Configure the service:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables:

   | Variable              | Value                                    |
   |-----------------------|------------------------------------------|
   | `DATABASE_URL`        | Your Neon connection string              |
   | `JWT_SECRET`          | A strong random string (32+ chars)       |
   | `CORS_ORIGIN`        | `https://your-app.vercel.app`            |
   | `PORT`                | `3001` (Railway auto-assigns, but set as default) |
   | `TELEPHONY_PROVIDER`  | `mock` (default)                         |
   | `TRANSCRIPTION_PROVIDER` | `mock` (default)                      |

6. Railway will auto-deploy. Note the generated URL (e.g., `https://lead-mgmt-backend.up.railway.app`).

### 4. Prepare Frontend for Deployment

The frontend reads `VITE_API_URL` at build time:

```js
// frontend/src/api.js already uses:
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

### 5. Deploy Frontend on Vercel

1. Sign up at [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variable:

   | Variable        | Value                                          |
   |-----------------|------------------------------------------------|
   | `VITE_API_URL`  | `https://lead-mgmt-backend.up.railway.app`     |

5. Add SPA rewrite rule. Create `frontend/vercel.json`:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
6. Deploy. Vercel will build and serve the frontend.

### 6. End-to-End Verification

1. Open your Vercel URL
2. Register a new account
3. Log in
4. Verify leads are displayed (from DB seed or in-memory)
5. Select leads and start a dialer session
6. Verify calls simulate and CRM activities are created
7. Check WebSocket connection in browser DevTools (Network → WS tab)

---

## Backend Alternatives

### Render.com
- **Free tier**: 750 hours/month
- **Caveat**: Services spin down after 15 minutes of inactivity (cold starts of ~30 seconds)
- **Setup**: Similar to Railway — connect GitHub, set root to `backend`, add env vars

### Fly.io
- **Free tier**: 3 shared VMs
- **Setup**: Requires `fly.toml` configuration and Fly CLI
- **Good for**: WebSocket-heavy apps (persistent connections)

---

## Why NOT Vercel Serverless for Backend

The backend uses:
- **`setTimeout`** for call simulation (dialer engine)
- **In-memory Maps** for session state during active calls
- **WebSocket connections** for real-time updates

Vercel serverless functions are stateless and have execution time limits (10s on Hobby). They cannot:
- Maintain in-memory state across requests
- Run long-running `setTimeout` operations
- Hold persistent WebSocket connections

**Railway/Render/Fly.io** run the backend as a long-lived Node.js process, which is required for this architecture.

---

## Environment Variables Reference

### Backend

| Variable                | Required | Default   | Description                          |
|------------------------|----------|-----------|--------------------------------------|
| `DATABASE_URL`         | No       | —         | PostgreSQL connection string. Falls back to in-memory if not set |
| `JWT_SECRET`           | Yes*     | `dev-secret-change-in-production` | Secret for JWT signing. *Must set in production |
| `CORS_ORIGIN`          | No       | `*`       | Allowed CORS origin                  |
| `PORT`                 | No       | `3001`    | Server port                          |
| `TELEPHONY_PROVIDER`   | No       | `mock`    | `mock` or `twilio`                   |
| `TRANSCRIPTION_PROVIDER`| No      | `mock`    | `mock` or `whisper`                  |
| `TWILIO_ACCOUNT_SID`   | No       | —         | Required if `TELEPHONY_PROVIDER=twilio` |
| `TWILIO_AUTH_TOKEN`    | No       | —         | Required if `TELEPHONY_PROVIDER=twilio` |
| `TWILIO_PHONE_NUMBER`  | No       | —         | Required if `TELEPHONY_PROVIDER=twilio` |
| `OPENAI_API_KEY`       | No       | —         | Required if `TRANSCRIPTION_PROVIDER=whisper` |

### Frontend

| Variable        | Required | Default                 | Description              |
|-----------------|----------|-------------------------|--------------------------|
| `VITE_API_URL`  | No       | `http://localhost:3001`  | Backend API base URL     |

---

## Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGIN` on the backend matches your exact Vercel URL (including `https://`)
- Do not include a trailing slash
- Example: `CORS_ORIGIN=https://lead-management-app.vercel.app`

### 404 on Page Refresh (Frontend)
- Ensure `frontend/vercel.json` has the SPA rewrite rule
- All routes should redirect to `/index.html`

### Neon Database Timeouts
- Neon suspends compute after 5 minutes of inactivity on the free tier
- First query after suspension may take 1-2 seconds (cold start)
- The app handles this gracefully — the pg pool will reconnect automatically

### Dialer Sessions Don't Work on Serverless
- This is expected. The dialer requires a long-running process
- Use Railway, Render, or Fly.io for the backend
- See "Why NOT Vercel Serverless for Backend" above

### WebSocket Connection Fails
- Ensure your backend host supports WebSocket upgrades
- Railway and Render support WebSockets by default
- The frontend automatically falls back to HTTP polling after 3 failed WebSocket attempts
