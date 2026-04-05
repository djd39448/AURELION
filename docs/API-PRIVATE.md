# AURELION PRIVATE API DOCUMENTATION

**Audience:** Internal use by the React frontend only
**Base URL:** `http://localhost:3001/api` (dev) | Production TBD
**Authentication:** Session-based (HTTP-only cookies set via express-session)
**NOT for external use:** No stability guarantees, may change without notice
**Total Endpoints:** 30
**TypeScript Errors:** 0

> Every endpoint, request body, response shape, and error code in this document
> was extracted directly from the source code in `artifacts/api-server/src/routes/`.

---

## Table of Contents

1. [Health](#1-health-1-endpoint)
2. [Authentication](#2-authentication-4-endpoints)
3. [Activities](#3-activities-4-endpoints)
4. [Itineraries](#4-itineraries-9-endpoints)
5. [Purchases](#5-purchases-3-endpoints)
6. [Chat (AI Concierge)](#6-chat-ai-concierge-4-endpoints)
7. [Dashboard](#7-dashboard-1-endpoint)
8. [Admin](#8-admin-4-endpoints)
9. [Endpoint Summary Table](#endpoint-summary-table)

---

## 1. Health (1 endpoint)

### GET /api/healthz

**Purpose:** Uptime monitoring and load balancer health probes.
**Auth:** None
**Source:** `routes/health.ts`

**Response (200):**
```json
{ "status": "ok" }
```

**Used by:** Uptime monitors, load balancers, Paperclip agents
**React Query Hook:** N/A (not called from frontend)

---

## 2. Authentication (4 endpoints)

### GET /api/auth/me

**Purpose:** Get current user session. Returns user profile if logged in, or unauthenticated stub.
**Auth:** Optional (returns different response based on session state)
**Source:** `routes/auth.ts`
**Database:** SELECT from `users`

**Response (200) — Authenticated:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "tier": "free",
  "isAuthenticated": true
}
```

**Response (200) — Not Authenticated:**
```json
{ "isAuthenticated": false }
```

**Notes:**
- Admin users have `tier` elevated to `"premium"` regardless of DB value.
- If session references a deleted user, session is silently cleared.

**Errors:** `500` Internal server error
**Used by:** Navbar.tsx, Dashboard.tsx, Pricing.tsx, ActivityDetail.tsx, Chat.tsx, ItineraryDetail.tsx
**React Query Hook:** `useGetMe()`

---

### POST /api/auth/register

**Purpose:** Create new user account and establish session.
**Auth:** None
**Source:** `routes/auth.ts`
**Database:** SELECT + INSERT on `users`
**Zod Schema:** `RegisterBody`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response (201):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "tier": "free",
  "isAuthenticated": true
}
```

**Errors:**
- `400` — Zod validation failure (missing/invalid fields)
- `400` — `"Email already registered"` (uniqueness check)
- `500` — Internal server error

**Notes:**
- Password is bcrypt-hashed (12 rounds) before storage.
- Session is established immediately (user is logged in after registration).
- New users default to `role: "user"`, `tier: "free"`.

**Used by:** Register.tsx
**React Query Hook:** `useRegister()`

---

### POST /api/auth/login

**Purpose:** Authenticate user and establish session.
**Auth:** None
**Source:** `routes/auth.ts`
**Database:** SELECT from `users`
**Zod Schema:** `LoginBody`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "tier": "free",
  "isAuthenticated": true
}
```

**Errors:**
- `400` — Zod validation failure
- `401` — `"Invalid credentials"` (wrong email OR wrong password — same message for anti-enumeration)
- `500` — Internal server error

**Notes:**
- Admin users get `tier` elevated to `"premium"` in the session.
- Session stores both `userId` and cached `user` object.

**Used by:** Login.tsx
**React Query Hook:** `useLogin()`

---

### POST /api/auth/logout

**Purpose:** Destroy the server-side session.
**Auth:** Implicit (destroys whatever session exists)
**Source:** `routes/auth.ts`

**Request Body:** None

**Response (200):**
```json
{ "success": true }
```

**Notes:** Always returns success, even if no session existed.

**Used by:** Navbar.tsx
**React Query Hook:** `useLogout()`

---

## 3. Activities (4 endpoints)

### GET /api/activities

**Purpose:** List activities with optional filtering and full-text search.
**Auth:** None
**Source:** `routes/activities.ts`
**Database:** SELECT from `activities`
**Zod Schema:** `ListActivitiesQueryParams`

**Query Parameters (all optional):**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | ILIKE search on title, description, category |
| `category` | string | Exact match on category |
| `difficulty` | string | Exact match on difficulty |
| `minPrice` | number | Minimum `priceLow` (inclusive) |
| `maxPrice` | number | Maximum `priceHigh` (inclusive) |
| `maxDuration` | number | Maximum `durationMinutes` (inclusive) |

**Response (200):**
```json
[
  {
    "id": 16,
    "title": "Island Ultimate Jeep Safari",
    "category": "Off-Road Expeditions",
    "difficulty": "easy",
    "durationMinutes": 480,
    "priceLow": 130,
    "priceHigh": 130,
    "location": "Island-wide (Natural Pool, Baby Beach, Arikok)",
    "imageUrl": null,
    "reviewSummary": "TripAdvisor #1 Caribbean Experience...",
    "tags": ["jeep", "safari", "natural-pool"],
    "description": "The only Aruba tour that visits both...",
    "whatToBring": "Swimsuit, water shoes...",
    "whatToExpect": "Hotel pickup at 8:30 AM...",
    "createdAt": "2026-04-05T12:41:25.123Z"
  }
]
```

**Notes:**
- Omits premium fields: `premiumBookingGuide`, `insiderTips`, `basicBookingGuide`, `providerName`, `providerWebsite`, `providerPhone`.
- Filters are ANDed. Search is ORed across title/description/category, then ANDed with other filters.
- Ordered by `createdAt` ascending.

**Errors:** `500` Internal server error
**Used by:** Activities.tsx, Home.tsx
**React Query Hook:** `useListActivities()`

---

### GET /api/activities/featured

**Purpose:** Get up to 6 featured activities for homepage carousel.
**Auth:** None
**Source:** `routes/activities.ts`
**Database:** SELECT from `activities` WHERE `isFeatured = 1`

**Response (200):** Same shape as `GET /api/activities` (array of up to 6 items).

**Notes:**
- If fewer than 6 featured activities exist, falls back to ANY 6 activities (complete replacement, not merge).

**Errors:** `500` Internal server error
**Used by:** Home.tsx
**React Query Hook:** `useListFeaturedActivities()`

---

### GET /api/activities/categories

**Purpose:** Get activity category counts with representative images.
**Auth:** None
**Source:** `routes/activities.ts`
**Database:** SELECT with GROUP BY on `activities`

**Response (200):**
```json
[
  {
    "category": "Ocean Exploration",
    "count": 7,
    "imageUrl": null
  },
  {
    "category": "Off-Road Expeditions",
    "count": 4,
    "imageUrl": null
  }
]
```

**Notes:** `imageUrl` is selected via SQL `MAX()` — deterministic but arbitrary.

**Errors:** `500` Internal server error
**Used by:** Home.tsx, Activities.tsx
**React Query Hook:** `useGetCategories()`

---

### GET /api/activities/:id

**Purpose:** Get full activity detail including provider info and basic booking guide.
**Auth:** None
**Source:** `routes/activities.ts`
**Zod Schema:** `GetActivityParams`

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | number | Activity ID |

**Response (200):**
```json
{
  "id": 16,
  "title": "Island Ultimate Jeep Safari",
  "category": "Off-Road Expeditions",
  "difficulty": "easy",
  "durationMinutes": 480,
  "priceLow": 130,
  "priceHigh": 130,
  "location": "Island-wide (Natural Pool, Baby Beach, Arikok)",
  "imageUrl": null,
  "reviewSummary": "...",
  "tags": ["jeep", "safari"],
  "description": "...",
  "whatToBring": "...",
  "whatToExpect": "...",
  "basicBookingGuide": "Book online at abc-aruba.com...",
  "providerName": "ABC Tours Aruba",
  "providerWebsite": "https://abc-aruba.com/",
  "providerPhone": "+297 582-5600",
  "createdAt": "2026-04-05T12:41:25.123Z"
}
```

**Notes:**
- Includes `basicBookingGuide`, `providerName`, `providerWebsite`, `providerPhone` (not in list view).
- Still omits `premiumBookingGuide`, `insiderTips` (Premium-only, served elsewhere).

**Errors:**
- `400` — Invalid activity ID
- `404` — `"Activity not found"`
- `500` — Internal server error

**Used by:** ActivityDetail.tsx
**React Query Hook:** `useGetActivity()`

---

## 4. Itineraries (9 endpoints)

> All itinerary endpoints require authentication. All queries are scoped to the
> authenticated user's ID (multi-tenant isolation).

### GET /api/itineraries

**Purpose:** List all itineraries belonging to the authenticated user.
**Auth:** Required
**Source:** `routes/itineraries.ts`
**Database:** SELECT from `itineraries` WHERE `userId = session.userId`

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": 1,
    "title": "My Aruba Trip",
    "totalDays": 5,
    "tierType": "FREE",
    "status": "draft",
    "createdAt": "2026-04-05T10:00:00.000Z",
    "updatedAt": "2026-04-05T10:00:00.000Z"
  }
]
```

**Errors:** `401` Unauthorized | `500` Internal server error
**Used by:** Dashboard.tsx
**React Query Hook:** `useListItineraries()`

---

### POST /api/itineraries

**Purpose:** Create a new itinerary.
**Auth:** Required
**Zod Schema:** `CreateItineraryBody`

**Request Body:**
```json
{
  "title": "My Aruba Trip",
  "totalDays": 5
}
```

**Response (201):** Full itinerary object (same shape as list item).

**Notes:** Always created with `tierType: "FREE"`, `status: "draft"`.

**Errors:** `400` Validation | `401` Unauthorized | `500` Internal server error
**Used by:** ItineraryNew.tsx
**React Query Hook:** `useCreateItinerary()`

---

### GET /api/itineraries/:id

**Purpose:** Get itinerary with populated activity items.
**Auth:** Required (owner only)
**Zod Schema:** `GetItineraryParams`

**Response (200):**
```json
{
  "id": 1,
  "userId": 1,
  "title": "My Aruba Trip",
  "totalDays": 5,
  "tierType": "FREE",
  "status": "draft",
  "createdAt": "...",
  "updatedAt": "...",
  "items": [
    {
      "id": 1,
      "itineraryId": 1,
      "activityId": 16,
      "dayNumber": 1,
      "timeSlot": "morning",
      "notes": null,
      "activity": {
        "id": 16,
        "title": "Island Ultimate Jeep Safari",
        "category": "Off-Road Expeditions",
        "difficulty": "easy",
        "durationMinutes": 480,
        "priceLow": 130,
        "priceHigh": 130,
        "location": "...",
        "imageUrl": null,
        "reviewSummary": "...",
        "tags": [],
        "description": "...",
        "whatToBring": "...",
        "whatToExpect": "...",
        "createdAt": "..."
      }
    }
  ]
}
```

**Notes:** N+1 query pattern (each item fetches its activity). Orphaned items (deleted activity) are filtered out.

**Errors:** `400` Invalid ID | `401` Unauthorized | `404` Not found | `500` Internal server error
**Used by:** ItineraryDetail.tsx
**React Query Hook:** `useGetItinerary()`

---

### PATCH /api/itineraries/:id

**Purpose:** Partial update of itinerary fields.
**Auth:** Required (owner only)
**Zod Schema:** `UpdateItineraryBody`

**Request Body (all optional):**
```json
{
  "title": "Updated Title",
  "totalDays": 7,
  "status": "published"
}
```

**Response (200):** Updated itinerary object.

**Errors:** `400` | `401` | `404` | `500`
**Used by:** ItineraryDetail.tsx
**React Query Hook:** `useUpdateItinerary()`

---

### DELETE /api/itineraries/:id

**Purpose:** Delete itinerary and all its items (cascading).
**Auth:** Required (owner only)
**Zod Schema:** `DeleteItineraryParams`

**Response:** `204 No Content`

**Notes:** Deletes items first, then itinerary. Not transactional.

**Errors:** `400` | `401` | `404` | `500`
**Used by:** ItineraryDetail.tsx
**React Query Hook:** `useDeleteItinerary()`

---

### POST /api/itineraries/:id/items

**Purpose:** Add an activity to an itinerary at a specific day/timeSlot.
**Auth:** Required (owner only)
**Zod Schema:** `AddItineraryItemBody`

**Request Body:**
```json
{
  "activityId": 16,
  "dayNumber": 1,
  "timeSlot": "morning",
  "notes": "Pick up from hotel"
}
```

**Response (201):**
```json
{
  "id": 1,
  "itineraryId": 1,
  "activityId": 16,
  "dayNumber": 1,
  "timeSlot": "morning",
  "notes": "Pick up from hotel",
  "createdAt": "..."
}
```

**Errors:** `400` | `401` | `404` Itinerary not found | `500`
**Used by:** ItineraryDetail.tsx
**React Query Hook:** `useAddItineraryItem()`

---

### PATCH /api/itineraries/:id/items/:itemId

**Purpose:** Update an itinerary item (change day, time slot, notes).
**Auth:** Required (owner only)
**Zod Schema:** `UpdateItineraryItemBody`

**Request Body (all optional):**
```json
{
  "dayNumber": 2,
  "timeSlot": "afternoon",
  "notes": "Updated notes"
}
```

**Response (200):** Updated item object.

**Errors:** `400` | `401` | `404` Item not found | `500`
**Used by:** ItineraryDetail.tsx
**React Query Hook:** `useUpdateItineraryItem()`

---

### DELETE /api/itineraries/:id/items/:itemId

**Purpose:** Remove an activity from an itinerary.
**Auth:** Required (owner only)

**Response:** `204 No Content`

**Errors:** `400` | `401` | `404` | `500`
**Used by:** ItineraryDetail.tsx
**React Query Hook:** `useRemoveItineraryItem()`

---

### GET /api/itineraries/:id/export

**Purpose:** Export full itinerary data for PDF generation.
**Auth:** Required (owner only)
**Tier:** BASIC or PREMIUM required (entitlement-gated via `canExportItinerary`)

**Response (200):**
```json
{
  "itinerary": {
    "id": 1,
    "userId": 1,
    "title": "My Aruba Trip",
    "totalDays": 5,
    "tierType": "BASIC",
    "status": "draft",
    "createdAt": "...",
    "updatedAt": "...",
    "items": [ /* same as GET /:id items */ ]
  },
  "tierType": "BASIC",
  "exportedAt": "2026-04-05T12:00:00.000Z"
}
```

**Errors:**
- `400` Invalid ID
- `401` Unauthorized
- `403` `"Upgrade to Basic or Premium to export your itinerary"`
- `404` Not found
- `500` Internal server error

**Used by:** ItineraryDetail.tsx
**React Query Hook:** `useExportItinerary()`

---

## 5. Purchases (3 endpoints)

### GET /api/purchases

**Purpose:** List user's purchase history.
**Auth:** Required
**Source:** `routes/purchases.ts`
**Database:** SELECT from `purchases` WHERE `userId = session.userId`

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": 1,
    "itineraryId": 1,
    "productType": "BASIC",
    "amount": 9.99,
    "status": "completed",
    "stripeSessionId": "cs_test_...",
    "createdAt": "2026-04-05T12:00:00.000Z"
  }
]
```

**Errors:** `401` | `500`
**Used by:** Pricing.tsx, ActivityDetail.tsx, Dashboard.tsx, Chat.tsx
**React Query Hook:** `useListPurchases()`

---

### POST /api/purchases/checkout

**Purpose:** Create a Stripe checkout session (or mock purchase in dev).
**Auth:** Required
**Zod Schema:** `CreateCheckoutBody`
**Database:** INSERT into `purchases`, SELECT + UPDATE `itineraries`

**Request Body:**
```json
{
  "itineraryId": 1,
  "productType": "BASIC"
}
```

**Response (200):**
```json
{
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

**Notes:**
- `productType` must be `"BASIC"` ($9.99 = 999 cents) or `"PREMIUM"` ($49.99 = 4999 cents).
- **Mock mode** (no `STRIPE_SECRET_KEY`): Instantly creates a `"completed"` purchase, upgrades itinerary tier, returns redirect to `/dashboard?success=true`.
- **Live mode**: Creates a Stripe checkout session, stores a `"pending"` purchase, returns Stripe URL.
- App URL fallback chain: `NEXT_PUBLIC_APP_URL` -> `REPLIT_DOMAINS` -> `localhost`.

**Errors:**
- `400` — Validation error or `"Invalid product type"`
- `401` — Unauthorized
- `404` — `"Itinerary not found"`
- `500` — Internal server error

**Used by:** Pricing.tsx
**React Query Hook:** `useCreateCheckout()`

---

### POST /api/purchases/webhook

**Purpose:** Stripe webhook handler for payment completion.
**Auth:** None (Stripe signature verification)
**Source:** `routes/purchases.ts`

**Request:** Raw body (`application/json`) with `stripe-signature` header.

**Response (200):**
```json
{ "received": true }
```

**Notes:**
- Disabled (returns immediately) if no `STRIPE_WEBHOOK_SECRET`.
- Handles `checkout.session.completed` events.
- Updates purchase status to `"completed"` and upgrades itinerary `tierType`.
- Signature verification via `stripe.webhooks.constructEvent()`.

**Errors:**
- `400` — `"No signature"` or signature verification failed

**Used by:** Stripe (not called from frontend)
**React Query Hook:** N/A

---

## 6. Chat — AI Concierge (4 endpoints)

> Chat requires Premium tier for session creation and message sending.
> Session listing and message reading require auth only (not tier-gated).

### GET /api/chat/sessions

**Purpose:** List user's chat sessions.
**Auth:** Required
**Source:** `routes/chat.ts`

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": 1,
    "itineraryId": null,
    "createdAt": "2026-04-05T12:00:00.000Z"
  }
]
```

**Errors:** `401` | `500`
**Used by:** Chat.tsx
**React Query Hook:** `useListChatSessions()`

---

### POST /api/chat/sessions

**Purpose:** Create a new AI concierge chat session.
**Auth:** Required
**Tier:** PREMIUM (entitlement-gated via `canUseAIChat`)
**Zod Schema:** `CreateChatSessionBody`

**Request Body (optional):**
```json
{
  "itineraryId": 1
}
```

**Response (201):**
```json
{
  "id": 1,
  "userId": 1,
  "itineraryId": 1,
  "createdAt": "2026-04-05T12:00:00.000Z"
}
```

**Notes:** `itineraryId` is optional — session can exist without an itinerary link.

**Errors:**
- `401` — Unauthorized
- `403` — `"Upgrade to Concierge Intelligence to access AI chat"`
- `500` — Internal server error

**Used by:** Chat.tsx, Dashboard.tsx
**React Query Hook:** `useCreateChatSession()`

---

### GET /api/chat/sessions/:sessionId/messages

**Purpose:** Get message history for a chat session.
**Auth:** Required (session ownership verified)
**Zod Schema:** `GetChatMessagesParams`

**Response (200):**
```json
[
  {
    "id": 1,
    "sessionId": 1,
    "role": "user",
    "content": "What snorkeling tours do you recommend?",
    "createdAt": "2026-04-05T12:00:00.000Z"
  },
  {
    "id": 2,
    "sessionId": 1,
    "role": "assistant",
    "content": "I'd recommend the Pelican Adventures Aqua Champagne Brunch Cruise...",
    "createdAt": "2026-04-05T12:00:01.000Z"
  }
]
```

**Errors:** `400` Invalid session ID | `401` | `404` Session not found | `500`
**Used by:** Chat.tsx
**React Query Hook:** `useGetChatMessages()`

---

### POST /api/chat/sessions/:sessionId/messages

**Purpose:** Send a message and receive AI concierge response.
**Auth:** Required
**Tier:** PREMIUM (re-checked on every message)
**Zod Schema:** `SendChatMessageBody`
**Database:** INSERT into `chat_messages` (user + assistant), SELECT from `activities`

**Request Body:**
```json
{
  "content": "What's the best snorkeling tour for beginners?"
}
```

**Response (200):**
```json
{
  "id": 3,
  "sessionId": 1,
  "role": "assistant",
  "content": "For beginners, I recommend the **Pelican Adventures Afternoon Snorkel Cruise** ($50)...",
  "createdAt": "2026-04-05T12:01:00.000Z"
}
```

**Notes:**
- System prompt includes ALL activities from DB as JSON context.
- AI uses gpt-4o-mini with 800 max tokens.
- Full conversation history sent with each request.
- **Mock mode** (no `OPENAI_API_KEY`): Returns suggestions from first 3 activities.

**Errors:** `400` | `401` | `403` `"Premium required"` | `404` | `500`
**Used by:** Chat.tsx
**React Query Hook:** `useSendChatMessage()`

---

## 7. Dashboard (1 endpoint)

### GET /api/dashboard/summary

**Purpose:** Aggregate statistics for the user's dashboard overview.
**Auth:** Required
**Source:** `routes/dashboard.ts`
**Database:** SELECT from `itineraries`, `activities`, `purchases`

**Response (200):**
```json
{
  "totalItineraries": 3,
  "totalActivities": 15,
  "recentItineraries": [
    {
      "id": 1,
      "userId": 1,
      "title": "My Aruba Trip",
      "totalDays": 5,
      "tierType": "FREE",
      "status": "draft",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "activitiesByCategory": [
    { "category": "Ocean Exploration", "count": 7, "imageUrl": null }
  ],
  "hasPremium": false
}
```

**Notes:**
- `totalActivities` and `activitiesByCategory` are global (not user-scoped).
- `recentItineraries` is the 3 most recent (newest first).
- `hasPremium` checks for ANY completed PREMIUM purchase (not itinerary-scoped).

**Errors:** `401` | `500`
**Used by:** Dashboard.tsx
**React Query Hook:** `useDashboardSummary()`

---

## 8. Admin (4 endpoints)

> All admin endpoints require authentication AND `role === "admin"`.

### POST /api/admin/activities

**Purpose:** Create a new activity.
**Auth:** Required (admin only)
**Zod Schema:** `AdminCreateActivityBody`

**Request Body:**
```json
{
  "title": "New Tour",
  "category": "Ocean Exploration",
  "difficulty": "easy",
  "description": "A great tour...",
  "durationMinutes": 180,
  "priceLow": 65,
  "priceHigh": 85,
  "location": "Palm Beach",
  "imageUrl": "https://...",
  "reviewSummary": "...",
  "whatToBring": "...",
  "whatToExpect": "...",
  "basicBookingGuide": "...",
  "premiumBookingGuide": "...",
  "insiderTips": "...",
  "warnings": "...",
  "bestTimeOfDay": "Morning",
  "tags": ["snorkeling", "beginner"],
  "providerName": "ABC Tours",
  "providerWebsite": "https://abc-aruba.com",
  "providerPhone": "+297 582-5600",
  "providerEmail": "hello@abcaruba.com",
  "providerWhatsapp": null
}
```

**Required fields:** `title`, `category`, `difficulty`, `description`, `durationMinutes`, `priceLow`, `priceHigh`, `location`
**Optional fields:** All others (default to null/empty)

**Response (201):** Full activity object with all fields + `createdAt`.

**Errors:** `400` | `401` | `403` `"Admin access required"` | `500`
**Used by:** Admin.tsx
**React Query Hook:** `useCreateActivity()`

---

### PATCH /api/admin/activities/:id

**Purpose:** Partial update of any activity fields.
**Auth:** Required (admin only)
**Zod Schema:** `AdminUpdateActivityBody`

**Request Body:** Any subset of activity fields.

**Response (200):** Updated activity object.

**Errors:** `400` | `401` | `403` | `404` | `500`
**Used by:** Admin.tsx
**React Query Hook:** `useUpdateActivity()`

---

### DELETE /api/admin/activities/:id

**Purpose:** Permanently delete an activity.
**Auth:** Required (admin only)

**Response:** `204 No Content`

**Notes:** Hard delete. Itinerary items referencing this activity become orphaned (filtered out in detail views).

**Errors:** `400` | `401` | `403` | `404` | `500`
**Used by:** Admin.tsx
**React Query Hook:** `useDeleteActivity()`

---

### POST /api/admin/ingest

**Purpose:** Scrape a URL to extract activity metadata for pre-populating the creation form.
**Auth:** Required (admin only)
**Zod Schema:** `AdminIngestUrlBody`

**Request Body:**
```json
{
  "url": "https://abc-aruba.com/jeep-tours/"
}
```

**Response (200):**
```json
{
  "title": "Aruba Jeep Tours and Excursions | ABC Tours Aruba",
  "description": "Explore Aruba's rugged northeast coast...",
  "url": "https://abc-aruba.com/jeep-tours/",
  "suggestedCategory": "Off-Road Expeditions",
  "rawText": "ABC Tours Aruba Welcome to the premier..."
}
```

**Notes:**
- Uses `fetch()` with 10-second timeout.
- User-Agent: `AURELION/1.0 (activity-research)`
- Category suggestion via keyword matching against 6 predefined categories.
- `rawText` is first 2000 chars of HTML stripped of tags.

**Errors:** `400` | `401` | `403` | `500` `"Failed to fetch URL"`
**Used by:** Admin.tsx
**React Query Hook:** `useIngestUrl()`

---

## Endpoint Summary Table

| # | Method | Path | Auth | Tier | Source File |
|---|--------|------|------|------|-------------|
| 1 | GET | `/api/healthz` | None | — | health.ts |
| 2 | GET | `/api/auth/me` | Optional | — | auth.ts |
| 3 | POST | `/api/auth/register` | None | — | auth.ts |
| 4 | POST | `/api/auth/login` | None | — | auth.ts |
| 5 | POST | `/api/auth/logout` | Implicit | — | auth.ts |
| 6 | GET | `/api/activities` | None | — | activities.ts |
| 7 | GET | `/api/activities/featured` | None | — | activities.ts |
| 8 | GET | `/api/activities/categories` | None | — | activities.ts |
| 9 | GET | `/api/activities/:id` | None | — | activities.ts |
| 10 | GET | `/api/itineraries` | Required | — | itineraries.ts |
| 11 | POST | `/api/itineraries` | Required | — | itineraries.ts |
| 12 | GET | `/api/itineraries/:id` | Required | — | itineraries.ts |
| 13 | PATCH | `/api/itineraries/:id` | Required | — | itineraries.ts |
| 14 | DELETE | `/api/itineraries/:id` | Required | — | itineraries.ts |
| 15 | POST | `/api/itineraries/:id/items` | Required | — | itineraries.ts |
| 16 | PATCH | `/api/itineraries/:id/items/:itemId` | Required | — | itineraries.ts |
| 17 | DELETE | `/api/itineraries/:id/items/:itemId` | Required | — | itineraries.ts |
| 18 | GET | `/api/itineraries/:id/export` | Required | BASIC+ | itineraries.ts |
| 19 | GET | `/api/purchases` | Required | — | purchases.ts |
| 20 | POST | `/api/purchases/checkout` | Required | — | purchases.ts |
| 21 | POST | `/api/purchases/webhook` | Stripe sig | — | purchases.ts |
| 22 | GET | `/api/chat/sessions` | Required | — | chat.ts |
| 23 | POST | `/api/chat/sessions` | Required | PREMIUM | chat.ts |
| 24 | GET | `/api/chat/sessions/:sessionId/messages` | Required | — | chat.ts |
| 25 | POST | `/api/chat/sessions/:sessionId/messages` | Required | PREMIUM | chat.ts |
| 26 | GET | `/api/dashboard/summary` | Required | — | dashboard.ts |
| 27 | POST | `/api/admin/activities` | Admin | — | admin.ts |
| 28 | PATCH | `/api/admin/activities/:id` | Admin | — | admin.ts |
| 29 | DELETE | `/api/admin/activities/:id` | Admin | — | admin.ts |
| 30 | POST | `/api/admin/ingest` | Admin | — | admin.ts |

### What's Missing (Not Implemented)

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `GET /api/providers` | List all providers | P1 |
| `GET /api/providers/:id` | Get provider detail + intelligence | P1 |
| `GET /api/activities/:id/booking-guide` | Premium booking intelligence | P2 |
| `PATCH /api/auth/me` | Update user profile | P2 |
| `POST /api/auth/forgot-password` | Password reset | P2 |
| `GET /api/admin/providers` | Admin provider management | P3 |
| `PATCH /api/admin/providers/:id` | Admin provider editing | P3 |
| `GET /api/admin/users` | Admin user listing | P3 |

### OpenAPI Spec Accuracy

The OpenAPI spec at `lib/api-spec/openapi.yaml` is generally accurate but has these discrepancies:
- `UserSession` was missing `tier` field (fixed during annotation pass)
- No provider endpoints documented (because they don't exist yet)
- Admin ingest endpoint response shape not fully specified
- Dashboard summary response shape not specified
