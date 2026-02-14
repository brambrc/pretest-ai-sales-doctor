# Lead Management App

Multi-line dialer + CRM for AI Sales Doctor. Agents select leads, launch a 2-line dialer session that simulates concurrent outbound calls, and sync results to a mock CRM.

## Tech Stack

| Layer    | Tech                                    |
|----------|-----------------------------------------|
| Backend  | Node.js, Express 4, ES modules          |
| Frontend | React 19, Vite 7, React Router 7        |
| Storage  | In-memory Maps (default) or PostgreSQL   |
| Realtime | WebSocket (ws) with HTTP polling fallback|
| Auth     | JWT (bcrypt + jsonwebtoken)              |
| HTTP     | Axios (frontend → backend)              |
| Testing  | Vitest, Supertest, React Testing Library |

## Quick Start

```bash
npm install          # installs root + backend + frontend deps
npm run dev          # starts both concurrently (backend :3002, frontend :5173)
npm test             # runs backend + frontend tests
npm run test:backend # backend only
npm run test:frontend # frontend only
```

Backend only: `npm run dev:backend` — Frontend only: `npm run dev:frontend`

## Architecture

```
backend/src/
├── index.js                    # Server startup, seeds data, inits WebSocket
├── app.js                      # Express app, CORS, route mounting, middleware
├── engine/
│   └── DialerEngine.js         # Core dialer simulation (state machine)
├── routes/
│   ├── auth.js                 # Register/login (public, rate-limited)
│   ├── leads.js                # Lead CRUD + enrichment
│   ├── dialer.js               # Session create/get/stop
│   ├── calls.js                # Call details + transcription
│   ├── crm.js                  # Mock CRM inspection
│   └── leadCrm.js              # Lead-CRM activity linking
├── dal/                        # Data Access Layer (abstracts Map vs Postgres)
│   ├── leads.js, calls.js, sessions.js
│   ├── crmActivities.js, mockCrm.js, users.js
├── services/
│   └── MockCRMService.js       # CRM upsert + activity creation
├── providers/                  # Provider pattern for telephony & transcription
│   ├── TelephonyProvider.js    # Base class
│   ├── MockProvider.js         # setTimeout-based call simulation
│   ├── TwilioProvider.js       # Real Twilio integration
│   ├── TranscriptionProvider.js # Base class
│   ├── MockTranscriptionProvider.js
│   └── WhisperTranscriptionProvider.js
├── events/
│   └── DialerEventBus.js       # Event bus for session/call updates
├── ws/
│   └── WebSocketServer.js      # Pushes real-time updates to frontend
├── middleware/
│   ├── auth.js                 # JWT verification (authRequired)
│   └── rateLimiter.js          # Rate limiting (general + auth-specific)
├── store/
│   ├── index.js                # In-memory Maps (6 stores)
│   └── seed.js                 # Seeds 6 sample leads
├── db/
│   ├── pool.js                 # PostgreSQL connection pool
│   ├── migrate.js              # DB migration script
│   └── seed.js                 # DB seed script
└── utils/
    ├── random.js               # weightedRandom, randomInt
    └── scoring.js              # Lead scoring

frontend/src/
├── main.jsx                    # Entry point
├── App.jsx                     # Router + AuthProvider
├── api.js                      # Axios client, all API calls, auth interceptors
├── contexts/
│   └── AuthContext.jsx         # Auth state provider (token in localStorage)
├── components/
│   ├── CallCard.jsx            # Single call display with CRM sync status
│   ├── SessionMetrics.jsx      # Attempted/connected/failed/canceled counters
│   ├── SessionHistory.jsx      # Past session list
│   ├── FilterBar.jsx           # Industry & headcount filters
│   ├── LeadForm.jsx            # Create-lead form
│   ├── LeadTable.jsx           # Lead list with selection + enrich
│   └── ProtectedRoute.jsx     # Redirects to /login if not authed
├── hooks/
│   ├── usePolling.js           # Generic polling hook
│   └── useWebSocket.js         # WebSocket connection hook
└── pages/
    ├── LoginPage.jsx           # Login form
    ├── RegisterPage.jsx        # Registration form
    ├── LeadsPage.jsx           # Lead list + dialer launcher
    ├── AddLeadspage.jsx        # Create new lead
    └── DialerPage.jsx          # Live dialer session view
```

## Key Patterns

- **ES modules everywhere** — both packages use `"type": "module"`. Always `import`/`export`.
- **DAL pattern** — `dal/` abstracts storage. Works with in-memory Maps or PostgreSQL depending on `DATABASE_URL`.
- **Provider pattern** — `providers/` abstracts telephony (mock vs Twilio) and transcription (mock vs Whisper). Set via `TELEPHONY_PROVIDER` and `TRANSCRIPTION_PROVIDER` env vars.
- **Event bus** — `DialerEventBus` decouples engine events from WebSocket broadcasting.
- **Dual CRM store** — `crmActivities` (app-side) + `mockCrmActivities` (simulated external CRM) with back-references. Mirrors real-world CRM integration pattern.
- **Auth flow** — JWT stored in localStorage. Axios interceptor attaches Bearer token. 401 responses auto-redirect to `/login`.
- **Polling + WebSocket** — DialerPage uses WebSocket for real-time updates, falls back to HTTP polling (1.5s interval) if WS fails.

## Naming Conventions

- **Variables & functions:** camelCase (`leadQueue`, `processQueue`)
- **React components:** PascalCase (`CallCard`, `SessionMetrics`)
- **API response fields:** snake_case (`phone_number`, `job_title`)
- **Constants & enums:** UPPERCASE (`RUNNING`, `CONNECTED`, `CANCELED_BY_DIALER`)

## Dialer Engine Flow

1. **createSession(agentId, leadIds)** → builds session (status `RUNNING`), calls `processQueue`
2. **processQueue** → while active calls < concurrency (2) and queue not empty: shift next lead, create Call (`RINGING`), run `simulateCall`
3. **simulateCall** → setTimeout 3-8s, weighted random outcome (40% CONNECTED, 25% NO_ANSWER, 20% BUSY, 15% VOICEMAIL), mark `COMPLETED`
4. **onCallComplete** → if CONNECTED and no winner yet: set `winnerCallId`, cancel other active calls, sync to CRM, stop session. Otherwise: update metrics, sync to CRM, refill slot via `processQueue`
5. **syncCrmActivity** → upsert CRM contact, create activity (idempotent by callId), dual-store write, emit updates via event bus → WebSocket

**Winner rule:** first CONNECTED call wins → all other active calls get `CANCELED_BY_DIALER` → session auto-stops.

## API Routes

All routes except `/auth/*` and `GET /` require JWT auth (`Authorization: Bearer <token>`).

**Auth:** `POST /auth/register`, `POST /auth/login`
**Leads:** `GET /leads`, `GET /leads/:id`, `POST /leads`, `POST /leads/:id/enrich`, `GET /filters/options`
**Dialer:** `POST /dialer/sessions`, `GET /dialer/sessions/:id`, `GET /dialer/sessions`, `POST /dialer/sessions/:id/stop`
**Calls:** `GET /calls/:id`, `POST /calls/:id/transcribe`, `GET /calls/:id/transcription`
**CRM:** `GET /mock-crm/contacts`, `GET /mock-crm/activities`, `GET /leads/:id/crm-activities`

## Testing

- **Framework:** Vitest for both backend and frontend
- **Backend tests:** `backend/src/__tests__/` — uses Supertest for route tests. Config: `backend/vitest.config.js`
- **Frontend tests:** `frontend/src/__tests__/` — uses React Testing Library + jsdom. Setup: `frontend/src/__tests__/setup.js`
- **Run:** `npm test` (both), `npm run test:backend`, `npm run test:frontend`
- **Watch mode:** `cd backend && npm run test:watch` or `cd frontend && npm run test:watch`

## Environment Variables

**Backend** (see `backend/.env.example`):
- `PORT` — default `3002`
- `DATABASE_URL` — PostgreSQL connection string (omit for in-memory)
- `JWT_SECRET` — required in production (default: `dev-secret-change-in-production`)
- `CORS_ORIGIN` — default `*`
- `TELEPHONY_PROVIDER` — `mock` (default) or `twilio`
- `TRANSCRIPTION_PROVIDER` — `mock` (default) or `whisper`

**Frontend**: `VITE_API_URL` — backend URL (default: `http://localhost:3002`)

## Common Gotchas

- **Port is 3002**, not 3001. The NOTES.md file is outdated on this.
- **In-memory data resets on restart.** All Maps clear when the backend process restarts. Use `DATABASE_URL` for persistence.
- **WebSocket URL** is derived from `VITE_API_URL` by replacing `http` with `ws` and appending `/ws`.
- **Auth required** — almost all API routes need a JWT. Register/login first, or tests will get 401s.
- **Rate limiting** is on — auth routes have a stricter limiter than general routes.
- **Frontend 401 handling** — Axios interceptor auto-clears localStorage and redirects to `/login` on 401.
