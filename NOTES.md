# Multi-Line Dialer + CRM — Project Spec & Notes

## Project Overview

**What this is:** A Multi-Line Dialer + CRM application for AI Sales Doctor. Agents select leads, launch a 2-line dialer session that simulates concurrent outbound calls, and sync results to a mock CRM.

**Tech stack:**

| Layer    | Tech                          |
| -------- | ----------------------------- |
| Backend  | Node.js, Express 4, ES modules |
| Frontend | React 19, Vite 7, React Router 7 |
| Storage  | In-memory JavaScript `Map` objects (no database) |
| HTTP     | Axios (frontend → backend)    |

**How to run:**

```bash
npm install        # installs backend + frontend deps
npm run dev        # starts both concurrently (backend :3001, frontend :5173)
npm run dev:backend   # backend only
npm run dev:frontend  # frontend only
```

---

## Architecture

### Directory Tree

```
backend/src/
├── index.js                    # Express server setup & route mounting
├── engine/
│   └── DialerEngine.js         # Core dialer simulation logic
├── routes/
│   ├── leads.js                # Lead CRUD & enrichment endpoints
│   ├── dialer.js               # Dialer session management endpoints
│   ├── crm.js                  # Mock CRM inspection endpoints
│   └── leadCrm.js              # Lead-CRM activity linking endpoints
├── services/
│   └── MockCRMService.js       # CRM upsert & activity creation
├── store/
│   ├── index.js                # In-memory data stores (6 Maps)
│   └── seed.js                 # Initial seed data (6 leads)
└── utils/
    └── random.js               # weightedRandom, randomInt

frontend/src/
├── main.jsx                    # Entry point
├── App.jsx                     # Router setup
├── App.css / index.css         # Global styles
├── api.js                      # Axios client (base URL: localhost:3001)
├── components/
│   ├── CallCard.jsx            # Single call display card
│   ├── SessionMetrics.jsx      # Attempted/connected/failed/canceled counters
│   ├── FilterBar.jsx           # Industry & headcount filters
│   ├── LeadForm.jsx            # Create-lead form
│   └── LeadTable.jsx           # Lead list with selection & enrich action
├── hooks/
│   └── usePolling.js           # Generic polling hook
└── pages/
    ├── LeadsPage.jsx           # Main leads list + dialer launcher
    ├── AddLeadspage.jsx        # Create new lead
    └── DialerPage.jsx          # Live dialer session view
```

### Backend Layers

**routes** → HTTP handling, request/response shaping
**engine** → Business logic (DialerEngine class)
**services** → Integration layer (MockCRMService)
**store** → In-memory data (Maps + seed)

### Frontend Layers

**pages** → Route-level components (LeadsPage, DialerPage, AddLeadspage)
**components** → Reusable UI (CallCard, LeadTable, FilterBar, etc.)
**hooks** → Shared logic (usePolling)
**api.js** → All HTTP calls to backend

---

## Data Models

### Lead

```
id              string (UUID)
name            string
job_title       string
phone_number    string
company         string
email           string
headcount       '1-10' | '11-50' | '51-200' | '201-500' | '500+'
industry        'Technology' | 'Construction' | 'Logistics' | 'Healthcare' | 'Finance' | 'Manufacturing'
enriched        boolean
enrichment_data object | null   → { linkedin_url, company_size_verified, company_revenue, technologies_used, recent_funding, decision_maker_score }
crmExternalId   string | null   → links to MockCrmContact.id
```

### DialerSession

```
id              string (UUID)
agentId         string          → e.g. 'agent-1'
leadQueue       string[]        → remaining leadIds to call
concurrency     number          → max simultaneous calls (fixed: 2)
activeCallIds   string[]        → currently in-progress call IDs
winnerCallId    string | null   → first CONNECTED call ID
status          'RUNNING' | 'STOPPED'
calls           string[]        → all call IDs (cumulative)
metrics         { attempted, connected, failed, canceled }
```

### Call

```
id                string (UUID)
leadId            string
sessionId         string
status            'RINGING' | 'COMPLETED'
callStatus        'CONNECTED' | 'NO_ANSWER' | 'BUSY' | 'VOICEMAIL' | 'CANCELED_BY_DIALER' | null
startedAt         ISO 8601 timestamp
endedAt           ISO 8601 timestamp | null
providerCallId    string          → simulated provider ID
crmActivityId     string | null   → CRM activity ID after successful sync
crmActivityStatus 'PENDING' | 'SYNCED' | 'FAILED' | null → CRM sync status per call
```

**Outcome weights:** CONNECTED 40%, NO_ANSWER 25%, BUSY 20%, VOICEMAIL 15%

### CRMActivity (app store)

```
id              string (UUID)
leadId          string
crmExternalId   string          → MockCrmContact.id
type            'CALL'
callId          string          → idempotency key (one activity per call)
disposition     string          → mapped from callStatus
notes           string          → mapped from callStatus
createdAt       ISO 8601 timestamp
```

**Disposition mapping:**

| callStatus          | disposition              | notes                                                        |
| ------------------- | ------------------------ | ------------------------------------------------------------ |
| CONNECTED           | Connected - Conversation | Call connected successfully. Lead engaged in conversation.   |
| NO_ANSWER           | No Answer                | Call went unanswered after multiple rings.                   |
| BUSY                | Busy                     | Line was busy. Will retry later.                             |
| VOICEMAIL           | Left Voicemail           | Reached voicemail. No message left.                          |
| CANCELED_BY_DIALER  | Canceled by Dialer       | Call was canceled because another line connected first.       |

### MockCrmContact (external CRM store)

```
id              string (CRM-XXXXXXXX)
leadId          string
name            string
email           string
phone           string
company         string
createdAt       ISO 8601 timestamp
```

### MockCrmActivity (external CRM store)

```
id              string (MOCK-XXXXXXXX)
leadId          string
crmExternalId   string
type            'CALL'
callId          string
disposition     string
notes           string
createdAt       ISO 8601 timestamp
sourceActivityId string         → links back to CRMActivity.id
```

---

## API Reference

### Leads

| Method | Path                     | Purpose                | Request Body                                                          | Response                    |
| ------ | ------------------------ | ---------------------- | --------------------------------------------------------------------- | --------------------------- |
| GET    | `/leads`                 | List leads (filterable)| Query: `?industry=X&headcount=Y`                                      | `{ leads[], total }`        |
| GET    | `/leads/:id`             | Get single lead        | —                                                                     | Lead object                 |
| POST   | `/leads`                 | Create lead            | `{ name, job_title, phone_number, company, email, headcount, industry }` | `{ message, lead }`      |
| POST   | `/leads/:id/enrich`      | Enrich with mock data  | —                                                                     | `{ message, lead }`         |
| GET    | `/leads/filters/options` | Filter dropdown values | —                                                                     | `{ industries[], headcounts[] }` |

### Dialer

| Method | Path                          | Purpose                | Request Body                    | Response               |
| ------ | ----------------------------- | ---------------------- | ------------------------------- | ---------------------- |
| POST   | `/dialer/sessions`            | Create & start session | `{ agentId, leadIds[] }`        | DialerSession object   |
| GET    | `/dialer/sessions/:id`        | Get session state      | —                               | Session + enriched calls |
| POST   | `/dialer/sessions/:id/stop`   | Stop session manually  | —                               | DialerSession object   |

### CRM

| Method | Path                          | Purpose                     | Response                                          |
| ------ | ----------------------------- | --------------------------- | ------------------------------------------------- |
| GET    | `/mock-crm/contacts`          | List mock CRM contacts      | `{ contacts[], total }`                           |
| GET    | `/mock-crm/activities`         | List mock CRM activities    | `{ activities[], total }`                         |
| GET    | `/leads/:id/crm-activities`   | Activities for a specific lead | `{ leadId, leadName, crmExternalId, activities[], total }` |

---

## Key System Behaviors

### Dialer Engine Flow

1. **createSession(agentId, leadIds)** — builds session, sets status `RUNNING`, calls `processQueue`
2. **processQueue(session)** — while `activeCallIds.length < concurrency && leadQueue.length > 0`, shifts next lead, creates Call (`RINGING`), calls `simulateCall`. If no active calls and queue empty → `STOPPED`.
3. **simulateCall(call, session)** — `setTimeout` with random 3-8s delay, then picks outcome via `weightedRandom`, marks call `COMPLETED`, calls `onCallComplete`.
4. **onCallComplete(call, session)** — removes call from active list, then:
   - **If CONNECTED and no winner yet:** sets `winnerCallId`, cancels all other active calls, syncs to CRM, stops session.
   - **If not winner:** updates metrics, syncs to CRM, calls `processQueue` to refill slot.
5. **cancelCall(callId, session)** — clears timer, sets `CANCELED_BY_DIALER`, increments `metrics.canceled`, syncs to CRM.
6. **syncCrmActivity(call, session)** — sets `crmActivityStatus = 'PENDING'`, calls `createActivity(call)`, then sets `SYNCED` on success or `FAILED` on error. Emits session update via WebSocket at each step so the frontend shows real-time CRM sync status.

**Winner rule:** first CONNECTED call wins → all other active calls canceled → session stops automatically.

### CRM Sync Flow

1. **upsertContact(leadId)** — if `lead.crmExternalId` exists, return it; otherwise create `MockCrmContact` (ID: `CRM-XXXXXXXX`), set `lead.crmExternalId`.
2. **createActivity(call)** — idempotency check by `callId`; if activity exists, return it. Otherwise: upsert contact, map disposition, then **dual-store write**: save to `crmActivities` (app store) AND `mockCrmActivities` (external CRM store, ID: `MOCK-XXXXXXXX`, with `sourceActivityId` back-reference).
3. **syncCrmActivity(call, session)** — wraps `createActivity()` with status tracking on the call object (`PENDING` → `SYNCED` / `FAILED`). The frontend displays this status as a badge on each call card and in the call log table's CRM column.

### Frontend Polling

`usePolling(fetchFn, intervalMs, enabled)` — custom hook that:
- Fires `fetchFn` immediately on mount
- Sets `setInterval` at `intervalMs` (1500ms in DialerPage)
- Cleans up interval on unmount or when `enabled` becomes false
- DialerPage stops polling on error; session auto-stops when status is `STOPPED`

---

## Dev Guidelines & Conventions

### Module System

ES6 modules everywhere — both `backend/package.json` and `frontend/package.json` set `"type": "module"`. Use `import`/`export`, not `require`/`module.exports`.

### Naming

- **Variables & functions:** camelCase (`leadQueue`, `processQueue`)
- **React components:** PascalCase (`CallCard`, `SessionMetrics`)
- **API response fields:** snake_case (`phone_number`, `job_title`)
- **Constants & enums:** UPPERCASE (`RUNNING`, `CONNECTED`, `CANCELED_BY_DIALER`)

### Backend Organization

| Directory  | Responsibility                                         |
| ---------- | ------------------------------------------------------ |
| `routes/`  | HTTP layer — parse requests, return responses          |
| `engine/`  | Business logic — dialer state machine, call simulation |
| `services/`| Integration layer — CRM sync, external system abstraction |
| `store/`   | Data layer — in-memory Maps, seed data                 |
| `utils/`   | Pure helpers — random number generation                |

### Frontend Organization

| Directory      | Responsibility                                    |
| -------------- | ------------------------------------------------- |
| `pages/`       | Route-level components (one per route)            |
| `components/`  | Reusable UI pieces                                |
| `hooks/`       | Shared stateful logic                             |
| `api.js`       | All backend HTTP calls (single file)              |

### Error Handling

- **Backend:** return appropriate HTTP status codes (400, 404, 500) with `{ detail: "message" }` body
- **Frontend:** `try/catch` around API calls, surface errors via `useState` + conditional rendering

### State Management

- **Backend:** in-memory `Map` objects (6 maps in `store/index.js`) — no database, all data resets on restart
- **Frontend:** React `useState` — no external state library (Redux, Zustand, etc.)

### In-Memory Store Layout

```
leads              Map<leadId, Lead>
calls              Map<callId, Call>
sessions           Map<sessionId, DialerSession>
crmActivities      Map<activityId, CRMActivity>
mockCrmContacts    Map<crmId, MockCrmContact>
mockCrmActivities  Map<mockActivityId, MockCrmActivity>
```

---

## Tradeoffs & Design Decisions

### In-Memory Storage
All data lives in JavaScript `Map` objects. This keeps the project zero-dependency on databases, making it trivial to run with `npm install && npm run dev`. The tradeoff is data resets on server restart.

### Simulated Calls via setTimeout
Real telephony (Twilio, etc.) was replaced with `setTimeout` (3-8s random delay) + weighted random outcomes. This lets the dialer logic be fully tested without external services or API keys.

### Polling vs WebSocket
The frontend polls `GET /dialer/sessions/:id` every 1.5 seconds. Polling was chosen because:
- Simpler to implement and debug
- No WebSocket library dependency
- Adequate for demo-scale latency requirements
- Session durations are short (under 60 seconds typically)

### Dual CRM Store
Two separate stores simulate the real-world pattern where your app has its own activity records AND syncs to an external CRM. This demonstrates the integration pattern without requiring actual CRM credentials.

### Idempotent CRM Activity Creation
Activities are keyed by `callId`. If the CRM sync is triggered twice for the same call, the second call returns the existing record. This prevents duplicates in a production scenario where retries might occur.

## What I'd Do Next

1. **Persistent database** — PostgreSQL or MongoDB to survive restarts
2. **WebSocket** — Replace polling with real-time push for immediate call status updates
3. **Real telephony** — Integrate Twilio or Vonage for actual calls
4. **Authentication** — JWT-based auth for agents, route protection
5. **Multi-agent** — Support multiple agents running dialer sessions concurrently
6. **Call recording & transcription** — Store call recordings, run AI transcription
7. **Queue prioritization** — Score-based lead ordering instead of FIFO
8. **Rate limiting** — Protect API endpoints from abuse
9. **Testing** — Unit tests for DialerEngine, integration tests for API routes
10. **Deployment** — Docker compose for backend + frontend, or serverless on AWS/Vercel

## How AI Tools Were Used

Claude Code (AI coding assistant) was used to accelerate implementation across the full stack:
- Generated the Express server structure, route handlers, and in-memory store setup
- Built the DialerEngine class with concurrent call simulation logic
- Created React components (CallCard, SessionMetrics, DialerPage) with polling
- Wrote CSS for the dialer UI (call cards, status badges, animations)
- Helped ensure idempotency in CRM activity creation

All generated code was reviewed for correctness, tested end-to-end (backend API calls → frontend rendering → CRM sync verification), and adjusted where needed.
