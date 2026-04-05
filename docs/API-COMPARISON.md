# AURELION API COMPARISON: PRIVATE vs. PUBLIC

> This document explains the relationship between AURELION's two API surfaces,
> when to use each one, and how the private API informs the public API design.

---

## Table of Contents

1. [Side-by-Side Comparison](#1-side-by-side-comparison)
2. [When to Use Which](#2-when-to-use-which)
3. [Migration Path: Private to Public](#3-migration-path-private-to-public)
4. [Shared Infrastructure](#4-shared-infrastructure)

---

## 1. Side-by-Side Comparison

| Feature | Private API | Public API |
|---------|-------------|------------|
| **Path prefix** | `/api/*` (no version) | `/api/v1/*` (versioned) |
| **Authentication** | Session cookies (`express-session`, HTTP-only) | API keys (Bearer tokens, format `ak_live_xxx` / `ak_test_xxx`) |
| **Audience** | React frontend only | AI agents, travel partners, external developers |
| **Stability guarantee** | None. May change without notice when the frontend needs change. | Versioned contract. Breaking changes only in new major versions (`/v2/`). Non-breaking additions within a version. |
| **Documentation** | `docs/API-PRIVATE.md` -- extracted from source code, internal reference | `docs/API-PUBLIC.md` -- design spec with full JSON examples, use-case flows, agent integration guides |
| **Rate limiting** | None (frontend trusted, session-based) | Tiered: Unauth 20/hr, Free 100/hr, Basic 500/hr, Premium 2,000/hr. Per-key sliding window with Redis. |
| **Error format** | Inconsistent. Some return `{ message }`, some return `{ error }`, some return plain strings. HTTP status codes are the primary signal. | Structured envelope on every response: `{ success, data, error: { code, message, details }, meta }`. Machine-readable error codes (`UNAUTHORIZED`, `RATE_LIMIT_EXCEEDED`, etc.). |
| **Response envelope** | No standard envelope. List endpoints return bare arrays. Detail endpoints return bare objects. | Every response wrapped in `{ success, data, error, meta }`. No exceptions. |
| **Pagination** | No pagination. List endpoints return all results. | Offset-based pagination with `limit`, `offset`, `total_count`, `has_more` in `meta.pagination`. |
| **Versioning** | Unversioned. The URL path is simply `/api/...`. | URL path versioned (`/v1/`). Each major version is a separate, stable contract. |
| **Tier gating** | Enforced via `canUseAIChat`, `canExportItinerary` entitlement checks in route handlers. Returns `403` with plain message. | Enforced via API key tier. Returns structured `TIER_UPGRADE_REQUIRED` error with `required_tier`, `current_tier`, and `upgrade_url` in `error.details`. |
| **Tier-aware data** | Premium fields simply omitted from non-premium responses (no indication they exist). | Non-premium responses include a `booking_intelligence.preview` with `full_access: false` and `upgrade_url`, so agents know what they are missing. |
| **Field naming** | camelCase (`priceLow`, `durationMinutes`, `providerName`) | snake_case (`price_low`, `duration_minutes`, `provider.name`) |
| **Provider data** | Flattened into activity fields (`providerName`, `providerWebsite`, `providerPhone`). No provider endpoints. | Nested `provider` object on activities. Dedicated provider endpoints (`/v1/providers`, `/v1/providers/:id`, `/v1/providers/:id/intelligence`). |
| **AI Concierge** | Stateful chat sessions. History preserved server-side. Multiple endpoints (`sessions`, `messages`). | Stateless single endpoint (`POST /v1/concierge/ask`). Agent maintains its own conversation state. |
| **Itinerary structure** | Flat `items` array on itinerary detail. Each item has `dayNumber` and `timeSlot`. | Structured `days` array with activities nested under each day. Agent-friendly hierarchical format. |
| **Delete responses** | `204 No Content` (empty body) | `200` with `{ deleted: true, item_id }` confirmation body |
| **Export** | `GET /api/itineraries/:id/export` returns JSON payload of itinerary data for client-side PDF generation. | `POST /v1/itineraries/:id/export` generates PDF server-side and returns `download_url` with expiry. |
| **Admin endpoints** | Yes (4 endpoints for activity CRUD and URL ingestion) | No. Admin operations are internal only. |
| **Purchase/Stripe endpoints** | Yes (checkout, webhook, purchase history) | No. Billing is handled through the web dashboard, not the API. |
| **Auth/registration endpoints** | Yes (register, login, logout, me) | No. API key management is handled through the web dashboard. |
| **OpenAPI spec** | Partial (`lib/api-spec/openapi.yaml`), some discrepancies noted | Planned: auto-generated from Zod schemas via `zod-to-openapi`, hosted at `/v1/docs` |
| **Total endpoints** | 30 (implemented) | 14 (designed, not yet implemented) |
| **Examples in docs** | JSON response shapes only | Full curl commands for every endpoint, plus multi-step use-case flows |

---

## 2. When to Use Which

### Use the Private API When...

**You are the React frontend.** The private API was designed exclusively for the AURELION single-page application. It uses session cookies that the browser manages automatically, and its response shapes are tailored to what the React components need.

- **Session-based auth is appropriate.** The user logs in once, gets a cookie, and every subsequent request is authenticated transparently. No API keys to manage.
- **You can handle inconsistent shapes.** The frontend knows which endpoint returns a bare array vs. an object. The code is co-located with the API, so changes can be coordinated.
- **You need admin and billing endpoints.** Activity CRUD, URL ingestion, Stripe checkout, and webhook handling are private API concerns. External consumers should never touch these.
- **You accept instability.** The private API will change whenever the frontend needs change. A new React component might require a new field, a refactored page might need a different response shape. There is no deprecation process.

**In short:** The private API is a backend-for-frontend (BFF). It exists to serve one client, and it changes with that client.

### Use the Public API When...

**You are building something external.** Any consumer that is not the AURELION React app should use the public API.

- **AI agents** that search for activities, build itineraries, and query the concierge on behalf of their users. The structured envelope, machine-readable error codes, and use-case documentation are designed specifically for LLM-based agents.
- **Travel partners** (hotel concierge systems, OTAs, aggregators) that want to embed Aruba activity data in their own platforms. The versioning guarantee means their integration will not break when AURELION ships frontend changes.
- **Developer tools** (MCP servers, LangChain tools, Zapier integrations) that wrap AURELION capabilities. The stateless concierge endpoint and predictable pagination make tool-building straightforward.
- **Data consumers** that want to display AURELION activity data in dashboards, reports, or alternative UIs.

**In short:** The public API is a platform API. It exists to serve many clients, and it changes on a predictable, versioned schedule.

### Decision Flowchart

```
Is this the AURELION React frontend?
  YES --> Use Private API (/api/*)
  NO  --> Is this an internal tool with database access?
            YES --> Consider direct DB queries via Drizzle ORM
            NO  --> Use Public API (/api/v1/*)
```

---

## 3. Migration Path: Private to Public

The public API is not a fork of the private API. It is a redesign that uses the private API's battle-tested queries as a starting point, then applies a consistent structure on top. Here is what changes, what stays, and what is new.

### What Changes

These private API patterns are intentionally different in the public API:

| Aspect | Private API | Public API | Why the Change |
|--------|-------------|------------|----------------|
| **Response shape** | Bare arrays and objects | `{ success, data, error, meta }` envelope | Agents need a predictable parser. One shape for every endpoint eliminates guesswork. |
| **Field names** | camelCase (`priceLow`) | snake_case (`price_low`) | snake_case is the convention for REST APIs consumed by Python, Ruby, and multi-language agents. The React frontend uses camelCase because that is JavaScript convention. |
| **Provider data** | Flat fields on activity (`providerName`, `providerWebsite`) | Nested `provider` object + dedicated endpoints | Agents often want to work with providers as first-class entities (e.g., "show me all activities by this provider"). Flattened fields make that awkward. |
| **Pagination** | None | `limit`/`offset` with `total_count`/`has_more` | The private API returns all 15 activities at once because the frontend renders them all. External consumers may have thousands of activities in the future and need pagination from day one. |
| **Chat architecture** | Stateful sessions with server-managed history | Stateless `POST /concierge/ask` | AI agents maintain their own conversation state. Forcing them through session management adds complexity with no benefit. |
| **Delete responses** | `204 No Content` | `200 { deleted: true }` | Agents need confirmation bodies to verify operations succeeded, especially when orchestrating multi-step flows. |
| **Export** | `GET` returns JSON for client-side PDF | `POST` generates server-side PDF, returns URL | External consumers cannot run client-side PDF generation. Server-side generation with a download URL is universally accessible. |
| **Itinerary item URLs** | `/itineraries/:id/items` | `/itineraries/:id/activities` | "Activities" is more descriptive than "items" for external consumers who have not seen the internal data model. |
| **Itinerary detail shape** | Flat `items[]` with `dayNumber` | Nested `days[].activities[]` | Agents building day-by-day plans need data organized by day, not a flat list they have to group themselves. |

### What Stays the Same

These aspects are preserved from the private API because they work well:

| Aspect | Details |
|--------|---------|
| **Database queries** | The same Drizzle ORM queries power both APIs. A `SELECT * FROM activities WHERE category = ?` is the same regardless of which API surface serves it. |
| **Business logic** | Tier entitlement checks (`canUseAIChat`, `canExportItinerary`) are shared. The public API wraps them in a different error format but the logic is identical. |
| **Activity data model** | The same fields, the same data types, the same validation rules. snake_case is a presentation transformation, not a data model change. |
| **AI concierge engine** | The same OpenAI integration (`gpt-4o-mini`, same system prompt, same activity catalog injection). The public API just removes the session wrapper. |
| **Filter logic** | AND-based filtering with ILIKE search is the same algorithm. The public API adds relevance scoring on top. |

### What Is New (No Private Equivalent)

These public API features have no counterpart in the private API:

| Feature | Description | Why It Is Public-Only |
|---------|-------------|-----------------------|
| **API key authentication** | `api_keys` table, Bearer token middleware, key management UI | The private API uses session cookies. External consumers cannot use cookies. |
| **Rate limiting** | Redis-backed sliding window counter, tiered limits, `X-RateLimit-*` headers | The private API trusts the frontend. External consumers are untrusted and need rate limits. |
| **Provider endpoints** | `GET /v1/providers`, `GET /v1/providers/:id`, `GET /v1/providers/:id/intelligence` | The private API does not have provider-centric views. Provider data is embedded in activity responses. External consumers need providers as first-class entities. |
| **Provider intelligence** | Full intelligence reports with booking strategy, pricing tips, cancellation policy | Premium-only detailed intelligence reports aggregated across all provider activities. |
| **Activity search with relevance** | `POST /v1/activities/search` with natural language `q` and `relevance_score` | The private API has basic ILIKE search via query params. The public API adds structured search with scoring for agent use. |
| **Booking guide endpoint** | `GET /v1/activities/:id/booking-guide` | The private API serves `premiumBookingGuide` as a field on activity detail (only visible to premium users). The public API makes it a dedicated endpoint with richer structure. |
| **Structured error codes** | `UNAUTHORIZED`, `FORBIDDEN`, `TIER_UPGRADE_REQUIRED`, etc. | The private API returns HTTP status codes with text messages. Agents need machine-readable codes to branch on. |
| **Versioning** | URL path versioning (`/v1/`) | The private API is unversioned because the frontend and API deploy together. External consumers need version stability. |

---

## 4. Shared Infrastructure

Both APIs run in the same Node.js process and share the same infrastructure. This is a deliberate architectural choice: it avoids data synchronization issues and keeps the deployment simple.

### Same Database

Both APIs query the same PostgreSQL database through the same Drizzle ORM schema:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React Frontend │────>│  Private API      │────>│                 │
│  (SPA)          │     │  /api/*           │     │   PostgreSQL    │
└─────────────────┘     │  (session auth)   │────>│   via Drizzle   │
                        └──────────────────┘     │                 │
┌─────────────────┐     ┌──────────────────┐     │   Tables:       │
│  AI Agents      │────>│  Public API       │────>│   - users       │
│  Partners       │     │  /api/v1/*        │     │   - activities  │
│  MCP Servers    │     │  (API key auth)   │────>│   - itineraries │
└─────────────────┘     └──────────────────┘     │   - itin_items  │
                                                  │   - purchases   │
                                                  │   - chat_*      │
                                                  │   - api_keys    │ <-- new
                                                  └─────────────────┘
```

**Implications:**
- An activity created via the admin private API is immediately visible through the public API. No replication lag.
- An itinerary created via the public API appears in the user's dashboard on the React frontend. Same database, same user ID.
- A tier upgrade purchased through the React frontend immediately upgrades the user's API key capabilities. The `api_keys.tier` field is derived from the user's current tier.

### Same Drizzle ORM Schema

Both APIs import from the same `db/schema.ts` file. The public API does not have its own schema -- it queries the same tables with the same types. The only addition is the `api_keys` table, which is used exclusively by the public API middleware.

### Same Entitlements Logic

Tier-gating logic lives in a shared module (currently inline in route handlers, planned extraction to `lib/entitlements.ts`):

```
canUseAIChat(user)         --> tier === "premium"
canExportItinerary(user)   --> tier === "basic" || tier === "premium"
canAccessIntelligence(user) --> tier === "premium"  (new, for public API)
```

The private API calls these checks against the session user. The public API calls the same checks against the API key's associated user. The logic is identical.

### Same OpenAI Integration

The AI concierge in both APIs uses:
- Model: `gpt-4o-mini`
- Max tokens: 800
- System prompt: AURELION-specific, includes full activity catalog as JSON context
- Mock mode: When `OPENAI_API_KEY` is not set, returns suggestions from first 3 activities

The private API wraps this in stateful chat sessions. The public API wraps it in a stateless single-call endpoint. The underlying AI call is the same.

### Routing Architecture

Both API surfaces are mounted on the same Express app, differentiated by path prefix:

```
Express App
├── /api/healthz          (private: health check)
├── /api/auth/*           (private: session auth)
├── /api/activities/*     (private: activity routes)
├── /api/itineraries/*    (private: itinerary routes)
├── /api/purchases/*      (private: billing routes)
├── /api/chat/*           (private: AI chat routes)
├── /api/dashboard/*      (private: dashboard routes)
├── /api/admin/*          (private: admin routes)
│
├── /api/v1/activities/*  (public: activity routes)
├── /api/v1/providers/*   (public: provider routes)
├── /api/v1/itineraries/* (public: itinerary routes)
├── /api/v1/concierge/*   (public: AI concierge)
└── /api/v1/docs          (public: OpenAPI spec / Swagger UI)
```

**Middleware stacks differ:**
- Private routes: `cookieParser` -> `session` -> `requireAuth` (where needed)
- Public routes: `authenticateApiKey` -> `requireScope` -> `rateLimiter` -> `responseEnvelope`

This means you can run both APIs with a single `node server.js` command. No separate process, no separate deployment, no data synchronization.

### What Is NOT Shared

These concerns are API-specific and not shared:

| Concern | Private API | Public API |
|---------|-------------|------------|
| Auth middleware | `express-session` + cookie parser | API key extraction + hash verification |
| Error formatting | Ad-hoc `res.status(X).json({ message })` | Centralized `responseEnvelope` middleware |
| Rate limiting | None | Redis sliding window |
| Response transformation | None (returns DB shapes directly) | snake_case conversion + envelope wrapping |
| Pagination | None | Offset-based with meta |
| Logging | Basic `console.log` | Structured request logging with `request_id` |
