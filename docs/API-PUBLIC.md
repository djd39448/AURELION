# AURELION PUBLIC API DESIGN SPECIFICATION

**Status:** Design Phase -- Not Yet Implemented
**Audience:** AI agents, travel partners, external developers
**Base URL:** `https://api.aurelion.com/v1` (production) | `http://localhost:3001/api/v1` (dev)
**Authentication:** API keys (Bearer tokens)
**Versioning:** URL path versioning (`/v1/`, `/v2/`, etc.)
**Total Endpoints:** 14 (designed)
**Format:** JSON only (`Content-Type: application/json`)

> This document is a design specification for the AURELION Public API. None of these
> endpoints exist yet. The purpose is to define a stable, versioned contract that AI
> agents and external partners can build against, separate from the private API that
> serves the React frontend.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Response Format Standard](#3-response-format-standard)
4. [Error Codes](#4-error-codes)
5. [Rate Limits](#5-rate-limits)
6. [Agent Use Cases](#6-agent-use-cases)
7. [Endpoint Catalog](#7-endpoint-catalog)
   - [Activities](#activities)
   - [Providers](#providers)
   - [Itineraries](#itineraries)
   - [Concierge](#concierge)
8. [Implementation Status](#8-implementation-status)
9. [Implementation Plan](#9-implementation-plan)

---

## 1. Overview

### Why a Public API?

The AURELION platform has a private API (`/api/*`) that powers the React frontend. That API uses session cookies, has no versioning guarantees, and changes whenever the frontend needs change. It is unsuitable for external consumers.

The Public API exists to serve a different audience with different needs:

- **AI travel agents** that search activities, build itineraries, and query the concierge on behalf of users
- **Partner integrations** (hotel concierge systems, travel aggregators) that embed Aruba activity data
- **Developer tools** (MCP servers, LangChain tools) that wrap AURELION as a capability

### Design Principles

1. **Versioned and stable.** Breaking changes only happen in new major versions (`/v2/`). Non-breaking additions (new fields, new optional params) happen within a version.
2. **Structured responses.** Every response follows the same envelope: `{ success, data, error, meta }`. Agents never have to guess the shape.
3. **Explicit errors.** Machine-readable error codes, not just HTTP status codes. Agents can branch on `error.code` without parsing messages.
4. **Tier-aware.** Some endpoints return richer data for Premium keys. The response itself tells you what tier you have and what you are missing.
5. **Agent-friendly.** Documentation includes use-case flows (not just endpoint specs) so agents understand multi-step workflows.

### Base URL

| Environment | Base URL |
|-------------|----------|
| Production | `https://api.aurelion.com/v1` |
| Staging | `https://staging-api.aurelion.com/v1` |
| Development | `http://localhost:3001/api/v1` |

### Versioning Policy

- Current version: `v1`
- The version is part of the URL path, not a header
- `v1` will remain supported for at least 12 months after `v2` ships
- Deprecation notices will appear in the `meta.deprecation_notice` field before any removal

---

## 2. Authentication

### API Key Format

All API keys follow a predictable format so agents and middleware can validate keys before making requests:

| Key Type | Format | Example |
|----------|--------|---------|
| Live (production) | `ak_live_` + 32 hex chars | `ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4` |
| Test (development) | `ak_test_` + 32 hex chars | `ak_test_f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3` |

### Generating an API Key

API keys are generated through the AURELION web dashboard:

1. Log in at `https://aurelion.com`
2. Navigate to Settings > API Keys
3. Click "Create API Key"
4. Choose a name, select scopes, confirm
5. Copy the key immediately -- it will not be shown again

Each user account can have up to 5 active API keys. Keys inherit the tier of the user account (Free, Basic, or Premium).

### Using the API Key

Pass the key in the `Authorization` header using the Bearer scheme:

```bash
curl -X GET "https://api.aurelion.com/v1/activities" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

Some endpoints allow unauthenticated access (at lower rate limits and without tier-gated fields). To make an unauthenticated request, simply omit the `Authorization` header.

### Scopes

API keys can be created with limited scopes to follow the principle of least privilege:

| Scope | Description | Grants Access To |
|-------|-------------|-----------------|
| `activities:read` | Browse and search activities | GET /v1/activities, POST /v1/activities/search, GET /v1/activities/:id |
| `activities:intelligence` | Access premium booking intelligence | GET /v1/activities/:id/booking-guide |
| `providers:read` | Browse providers | GET /v1/providers, GET /v1/providers/:id |
| `providers:intelligence` | Access premium provider intelligence | GET /v1/providers/:id/intelligence |
| `itineraries:write` | Create and manage itineraries | All /v1/itineraries endpoints |
| `concierge:ask` | Query the AI concierge | POST /v1/concierge/ask |

A key with no scopes specified defaults to all scopes available for its tier.

---

## 3. Response Format Standard

Every response from the Public API follows this envelope. No exceptions.

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "request_id": "req_abc123def456",
    "timestamp": "2026-04-04T14:30:00.000Z",
    "rate_limit": {
      "limit": 500,
      "remaining": 487,
      "reset_at": "2026-04-04T15:00:00.000Z"
    }
  }
}
```

### Success Response (List with Pagination)

```json
{
  "success": true,
  "data": [ ... ],
  "error": null,
  "meta": {
    "request_id": "req_abc123def456",
    "timestamp": "2026-04-04T14:30:00.000Z",
    "pagination": {
      "total_count": 15,
      "limit": 10,
      "offset": 0,
      "has_more": true
    },
    "rate_limit": {
      "limit": 500,
      "remaining": 486,
      "reset_at": "2026-04-04T15:00:00.000Z"
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key.",
    "details": null
  },
  "meta": {
    "request_id": "req_abc123def456",
    "timestamp": "2026-04-04T14:30:00.000Z",
    "rate_limit": {
      "limit": 20,
      "remaining": 19,
      "reset_at": "2026-04-04T15:00:00.000Z"
    }
  }
}
```

### Why This Matters for Agents

Agents can use a single response parser for every endpoint:
1. Check `success` -- boolean, always present
2. If `true`, read `data` -- the shape varies by endpoint but is always non-null
3. If `false`, read `error.code` -- a machine-readable enum you can switch on
4. Always read `meta.rate_limit.remaining` to self-throttle before hitting limits

---

## 4. Error Codes

| Code | HTTP Status | Meaning | Agent Action |
|------|-------------|---------|--------------|
| `UNAUTHORIZED` | 401 | Missing or invalid API key | Check key format, regenerate if needed |
| `FORBIDDEN` | 403 | Valid key but insufficient scope | Request a key with the required scope |
| `NOT_FOUND` | 404 | Resource does not exist | Check the ID, do not retry |
| `RATE_LIMIT_EXCEEDED` | 429 | Hourly rate limit hit | Wait until `meta.rate_limit.reset_at`, then retry |
| `VALIDATION_ERROR` | 422 | Request body or params failed validation | Fix the request, check `error.details` for field-level errors |
| `TIER_UPGRADE_REQUIRED` | 403 | Endpoint or field requires a higher tier | Inform user they need to upgrade, or use a non-premium alternative |
| `SERVER_ERROR` | 500 | Unexpected server error | Retry with exponential backoff (max 3 attempts) |

### Validation Error Details

When the error code is `VALIDATION_ERROR`, the `error.details` field contains field-level information:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      { "field": "min_price", "issue": "Must be a non-negative number" },
      { "field": "category", "issue": "Must be one of: Ocean Exploration, Off-Road Expeditions, Cultural & Culinary, Aerial Adventures, Water Sports, Relaxation & Wellness" }
    ]
  },
  "meta": { ... }
}
```

---

## 5. Rate Limits

Rate limits are enforced per API key (or per IP for unauthenticated requests) on a rolling 1-hour window.

| Tier | Requests per Hour | Concurrent Requests | Notes |
|------|-------------------|--------------------:|-------|
| Unauthenticated | 20 | 2 | Read-only endpoints only |
| Free | 100 | 5 | All scoped endpoints |
| Basic ($9.99/mo) | 500 | 10 | All scoped endpoints |
| Premium ($49.99/mo) | 2,000 | 20 | All endpoints including intelligence and concierge |

### Rate Limit Headers

Every response includes these headers:

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Max requests in the current window | `500` |
| `X-RateLimit-Remaining` | Requests remaining in the current window | `487` |
| `X-RateLimit-Reset` | ISO 8601 timestamp when the window resets | `2026-04-04T15:00:00.000Z` |
| `Retry-After` | Seconds until next request allowed (only on 429) | `1832` |

The same information is in the `meta.rate_limit` object of the response body so agents do not need to parse headers if they prefer not to.

### Best Practices for Agents

- **Check `remaining` before each request.** If it is below 10, slow down.
- **On 429, wait until `reset_at`.** Do not retry immediately.
- **Cache activity listings.** Activities change infrequently. A 5-minute cache is safe.
- **Batch itinerary operations.** Add multiple activities in sequence rather than in parallel to avoid bursts.

---

## 6. Agent Use Cases

These use cases show how an AI agent would combine multiple endpoints to accomplish common tasks. Each flow lists the exact API calls in order.

### Use Case 1: Browse and Search Activities

**Scenario:** An AI travel agent wants to find snorkeling activities under $100 for a user planning an Aruba trip.

**Step 1:** Search with structured filters.
```bash
curl -X GET "https://api.aurelion.com/v1/activities?category=Ocean+Exploration&max_price=100&limit=5" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**Step 2:** If the user's query is more natural ("something fun in the water for beginners"), use the search endpoint.
```bash
curl -X POST "https://api.aurelion.com/v1/activities/search" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "fun water activity for beginners",
    "filters": { "max_price": 100 },
    "sort": "relevance"
  }'
```

**Step 3:** Get full detail on a specific activity.
```bash
curl -X GET "https://api.aurelion.com/v1/activities/3" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

---

### Use Case 2: Build an Itinerary

**Scenario:** An agent is helping a user plan a 3-day Aruba trip. The user has selected activities and the agent needs to organize them into a day-by-day plan.

**Step 1:** Create the itinerary.
```bash
curl -X POST "https://api.aurelion.com/v1/itineraries" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "3-Day Aruba Adventure",
    "start_date": "2026-05-10",
    "end_date": "2026-05-12",
    "notes": "Honeymoon trip, prefer morning activities"
  }'
```

**Step 2:** Add activities to specific days.
```bash
curl -X POST "https://api.aurelion.com/v1/itineraries/42/activities" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4" \
  -H "Content-Type: application/json" \
  -d '{
    "activity_id": 16,
    "day": 1,
    "time": "08:30",
    "notes": "Hotel pickup included"
  }'
```

**Step 3:** Review the full itinerary.
```bash
curl -X GET "https://api.aurelion.com/v1/itineraries/42" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**Step 4:** Export to PDF for the user.
```bash
curl -X POST "https://api.aurelion.com/v1/itineraries/42/export" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

---

### Use Case 3: Get Booking Intelligence (Premium)

**Scenario:** A Premium-tier agent wants to provide its users with insider tips and detailed booking guidance for a specific activity.

**Step 1:** Get the activity detail (includes a preview of booking intelligence for non-Premium, full data for Premium).
```bash
curl -X GET "https://api.aurelion.com/v1/activities/16" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**Step 2:** Get the full booking guide (Premium only).
```bash
curl -X GET "https://api.aurelion.com/v1/activities/16/booking-guide" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**Step 3:** Optionally, get the provider's full intelligence report.
```bash
curl -X GET "https://api.aurelion.com/v1/providers/5/intelligence" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**What non-Premium keys see:** The `booking_intelligence` field on activity detail will contain `{ "preview": "Book online at abc-aruba.com...", "full_access": false, "upgrade_url": "https://aurelion.com/pricing" }` instead of the full report.

---

### Use Case 4: Ask the AI Concierge (Premium)

**Scenario:** A Premium-tier agent wants to ask the AURELION concierge a natural language question about Aruba activities, getting back a structured answer with activity suggestions.

**Step 1:** Ask a question.
```bash
curl -X POST "https://api.aurelion.com/v1/concierge/ask" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the best half-day activity for a family with young kids?",
    "context": {
      "budget_max": 200,
      "group_size": 4,
      "interests": ["beach", "animals"]
    }
  }'
```

**What happens:** The concierge uses GPT-4o-mini with the full AURELION activity catalog as context, plus the optional structured context you provide. It returns a natural language answer along with specific activity references the agent can use for follow-up calls.

---

## 7. Endpoint Catalog

### Activities

#### GET /v1/activities

**Purpose:** List activities with optional filters and pagination. Designed for agents that want to browse the catalog programmatically.

**Auth:** Optional (unauthenticated gets lower rate limit)
**Tier:** Any
**Scopes:** `activities:read`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `category` | string | — | Exact match. One of: `Ocean Exploration`, `Off-Road Expeditions`, `Cultural & Culinary`, `Aerial Adventures`, `Water Sports`, `Relaxation & Wellness` |
| `min_price` | number | — | Minimum price in USD (inclusive) |
| `max_price` | number | — | Maximum price in USD (inclusive) |
| `difficulty` | string | — | One of: `easy`, `moderate`, `challenging` |
| `duration_max` | number | — | Maximum duration in minutes (inclusive) |
| `limit` | number | 10 | Results per page (1-50) |
| `offset` | number | 0 | Pagination offset |

**Request:**
```bash
curl -X GET "https://api.aurelion.com/v1/activities?category=Off-Road+Expeditions&max_price=150&limit=5" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 16,
      "title": "Island Ultimate Jeep Safari",
      "category": "Off-Road Expeditions",
      "difficulty": "easy",
      "duration_minutes": 480,
      "price_low": 130,
      "price_high": 130,
      "location": "Island-wide (Natural Pool, Baby Beach, Arikok)",
      "image_url": "https://cdn.aurelion.com/activities/jeep-safari.jpg",
      "review_summary": "TripAdvisor #1 Caribbean Experience. Guests rave about the Natural Pool visit and knowledgeable guides.",
      "tags": ["jeep", "safari", "natural-pool", "family-friendly"],
      "provider": {
        "id": 5,
        "name": "ABC Tours Aruba",
        "website": "https://abc-aruba.com/"
      }
    },
    {
      "id": 17,
      "title": "Arikok National Park 4x4 Adventure",
      "category": "Off-Road Expeditions",
      "difficulty": "moderate",
      "duration_minutes": 240,
      "price_low": 95,
      "price_high": 120,
      "location": "Arikok National Park",
      "image_url": "https://cdn.aurelion.com/activities/arikok-4x4.jpg",
      "review_summary": "Breathtaking scenery and expert guides. The cave visits are a highlight.",
      "tags": ["4x4", "arikok", "caves", "nature"],
      "provider": {
        "id": 5,
        "name": "ABC Tours Aruba",
        "website": "https://abc-aruba.com/"
      }
    }
  ],
  "error": null,
  "meta": {
    "request_id": "req_7f8a9b0c1d2e",
    "timestamp": "2026-04-04T14:30:00.000Z",
    "pagination": {
      "total_count": 4,
      "limit": 5,
      "offset": 0,
      "has_more": false
    },
    "rate_limit": {
      "limit": 500,
      "remaining": 492,
      "reset_at": "2026-04-04T15:00:00.000Z"
    }
  }
}
```

**Notes:**
- Filters are ANDed. All must match for an activity to be returned.
- The `provider` object is nested inline to avoid requiring a separate call for basic provider info.
- Results are ordered by `title` ascending by default.
- Premium fields (`premiumBookingGuide`, `insiderTips`) are never exposed in list view, regardless of tier.

---

#### POST /v1/activities/search

**Purpose:** Advanced search combining natural language queries with structured filters. This is the primary endpoint for AI agents that receive free-text user queries.

**Auth:** Optional
**Tier:** Any
**Scopes:** `activities:read`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Natural language search query |
| `filters` | object | No | Structured filters (same as GET params: `category`, `min_price`, `max_price`, `difficulty`, `duration_max`) |
| `sort` | string | No | One of: `relevance` (default), `price_asc`, `price_desc`, `duration_asc`, `duration_desc` |
| `limit` | number | No | Results per page (1-50, default 10) |
| `offset` | number | No | Pagination offset (default 0) |

**Request:**
```bash
curl -X POST "https://api.aurelion.com/v1/activities/search" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "fun water activity for beginners under $80",
    "filters": {
      "difficulty": "easy",
      "max_price": 80
    },
    "sort": "relevance",
    "limit": 5
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "title": "Afternoon Snorkel Cruise",
      "category": "Ocean Exploration",
      "difficulty": "easy",
      "duration_minutes": 240,
      "price_low": 50,
      "price_high": 75,
      "location": "Palm Beach, Malmok Reef",
      "image_url": "https://cdn.aurelion.com/activities/snorkel-cruise.jpg",
      "review_summary": "Perfect for beginners. Crystal clear water and friendly crew.",
      "tags": ["snorkeling", "cruise", "beginner-friendly", "reef"],
      "provider": {
        "id": 2,
        "name": "Pelican Adventures",
        "website": "https://pelican-aruba.com/"
      },
      "relevance_score": 0.94
    },
    {
      "id": 8,
      "title": "Kayak & Snorkel Mangel Halto",
      "category": "Water Sports",
      "difficulty": "easy",
      "duration_minutes": 180,
      "price_low": 65,
      "price_high": 65,
      "location": "Mangel Halto, Pos Chiquito",
      "image_url": "https://cdn.aurelion.com/activities/kayak-mangel.jpg",
      "review_summary": "Hidden gem. Calm waters ideal for first-time kayakers and snorkelers.",
      "tags": ["kayak", "snorkeling", "mangroves", "calm-water"],
      "provider": {
        "id": 7,
        "name": "Aruba Kayak Adventure",
        "website": "https://arubakayak.com/"
      },
      "relevance_score": 0.87
    }
  ],
  "error": null,
  "meta": {
    "request_id": "req_e3f4a5b6c7d8",
    "timestamp": "2026-04-04T14:32:00.000Z",
    "pagination": {
      "total_count": 6,
      "limit": 5,
      "offset": 0,
      "has_more": true
    },
    "rate_limit": {
      "limit": 500,
      "remaining": 491,
      "reset_at": "2026-04-04T15:00:00.000Z"
    }
  }
}
```

**Notes:**
- The `q` field is matched via ILIKE against title, description, category, and tags.
- When `sort` is `relevance`, results include a `relevance_score` (0.0-1.0) based on text match quality.
- Structured `filters` are applied AFTER text matching, further narrowing results.
- This endpoint counts as 1 request against rate limits regardless of query complexity.

---

#### GET /v1/activities/:id

**Purpose:** Get full detail for a single activity, including provider info and tier-appropriate booking intelligence.

**Auth:** Optional
**Tier:** Any (Premium gets richer data)
**Scopes:** `activities:read`

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | number | Activity ID |

**Request:**
```bash
curl -X GET "https://api.aurelion.com/v1/activities/16" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**Response (200) -- Free/Basic Tier:**
```json
{
  "success": true,
  "data": {
    "id": 16,
    "title": "Island Ultimate Jeep Safari",
    "category": "Off-Road Expeditions",
    "difficulty": "easy",
    "duration_minutes": 480,
    "price_low": 130,
    "price_high": 130,
    "location": "Island-wide (Natural Pool, Baby Beach, Arikok)",
    "image_url": "https://cdn.aurelion.com/activities/jeep-safari.jpg",
    "review_summary": "TripAdvisor #1 Caribbean Experience. Guests rave about the Natural Pool visit and knowledgeable guides. Full-day tour covers the entire island.",
    "tags": ["jeep", "safari", "natural-pool", "baby-beach", "arikok", "family-friendly"],
    "description": "The only Aruba tour that visits both the Natural Pool and Baby Beach in a single day. Eight hours of island exploration in open-air Jeep Wranglers with certified guides, including lunch at a local restaurant and unlimited drinks.",
    "what_to_bring": "Swimsuit, water shoes, reef-safe sunscreen, towel, camera, cash for tips",
    "what_to_expect": "Hotel pickup at 8:30 AM. First stop: Arikok National Park and the Natural Pool. Mid-morning: Bushiribana Gold Mill ruins. Lunch at a seaside restaurant. Afternoon: Baby Beach, cave paintings at Fontein Cave. Return to hotel by 5:00 PM.",
    "provider": {
      "id": 5,
      "name": "ABC Tours Aruba",
      "website": "https://abc-aruba.com/",
      "phone": "+297 582-5600"
    },
    "booking_intelligence": {
      "preview": "Book directly on abc-aruba.com for best rates. Morning departures fill up 2+ weeks in advance during high season.",
      "full_access": false,
      "upgrade_url": "https://aurelion.com/pricing"
    }
  },
  "error": null,
  "meta": {
    "request_id": "req_1a2b3c4d5e6f",
    "timestamp": "2026-04-04T14:33:00.000Z",
    "rate_limit": {
      "limit": 500,
      "remaining": 490,
      "reset_at": "2026-04-04T15:00:00.000Z"
    }
  }
}
```

**Response (200) -- Premium Tier:**
```json
{
  "success": true,
  "data": {
    "id": 16,
    "title": "Island Ultimate Jeep Safari",
    "category": "Off-Road Expeditions",
    "difficulty": "easy",
    "duration_minutes": 480,
    "price_low": 130,
    "price_high": 130,
    "location": "Island-wide (Natural Pool, Baby Beach, Arikok)",
    "image_url": "https://cdn.aurelion.com/activities/jeep-safari.jpg",
    "review_summary": "TripAdvisor #1 Caribbean Experience. Guests rave about the Natural Pool visit and knowledgeable guides. Full-day tour covers the entire island.",
    "tags": ["jeep", "safari", "natural-pool", "baby-beach", "arikok", "family-friendly"],
    "description": "The only Aruba tour that visits both the Natural Pool and Baby Beach in a single day. Eight hours of island exploration in open-air Jeep Wranglers with certified guides, including lunch at a local restaurant and unlimited drinks.",
    "what_to_bring": "Swimsuit, water shoes, reef-safe sunscreen, towel, camera, cash for tips",
    "what_to_expect": "Hotel pickup at 8:30 AM. First stop: Arikok National Park and the Natural Pool. Mid-morning: Bushiribana Gold Mill ruins. Lunch at a seaside restaurant. Afternoon: Baby Beach, cave paintings at Fontein Cave. Return to hotel by 5:00 PM.",
    "provider": {
      "id": 5,
      "name": "ABC Tours Aruba",
      "website": "https://abc-aruba.com/",
      "phone": "+297 582-5600"
    },
    "booking_intelligence": {
      "preview": "Book directly on abc-aruba.com for best rates. Morning departures fill up 2+ weeks in advance during high season.",
      "full_access": true,
      "basic_guide": "Book online at abc-aruba.com or call +297 582-5600. Group discounts available for 4+ guests. Free cancellation up to 48 hours before departure.",
      "premium_guide": "Best rates are through the direct website, not through hotel concierge desks (which add a 15% commission). Tuesday and Thursday departures have smaller groups (6-8 guests vs. 12-14 on weekends). Ask for guide 'Marco' — consistently rated highest by guests. The Natural Pool swim stop is 45 minutes; request extra time when booking if you want to cliff jump.",
      "insider_tips": "Bring water shoes, not flip-flops — the walk to the Natural Pool is rocky. The included lunch is at Zeerovers fish market; bring extra cash ($15-20) if you want to try additional dishes. Sit on the left side of the Jeep for better photo angles at the Gold Mill ruins."
    }
  },
  "error": null,
  "meta": {
    "request_id": "req_1a2b3c4d5e6f",
    "timestamp": "2026-04-04T14:33:00.000Z",
    "rate_limit": {
      "limit": 2000,
      "remaining": 1987,
      "reset_at": "2026-04-04T15:00:00.000Z"
    }
  }
}
```

**Errors:**
- `NOT_FOUND` (404) -- Activity ID does not exist
- `VALIDATION_ERROR` (422) -- Non-numeric ID

---

#### GET /v1/activities/:id/booking-guide

**Purpose:** Get the full booking intelligence report for an activity. This is the detailed, actionable booking guidance that makes AURELION Premium valuable.

**Auth:** Required
**Tier:** Premium only
**Scopes:** `activities:intelligence`

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | number | Activity ID |

**Request:**
```bash
curl -X GET "https://api.aurelion.com/v1/activities/16/booking-guide" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "activity_id": 16,
    "activity_title": "Island Ultimate Jeep Safari",
    "provider": {
      "name": "ABC Tours Aruba",
      "website": "https://abc-aruba.com/",
      "phone": "+297 582-5600",
      "email": "hello@abcaruba.com",
      "whatsapp": "+297 592-5600"
    },
    "basic_guide": "Book online at abc-aruba.com or call +297 582-5600. Group discounts available for 4+ guests. Free cancellation up to 48 hours before departure.",
    "premium_guide": "Best rates are through the direct website, not through hotel concierge desks (which add a 15% commission). Tuesday and Thursday departures have smaller groups (6-8 guests vs. 12-14 on weekends). Ask for guide 'Marco' — consistently rated highest by guests.",
    "insider_tips": "Bring water shoes, not flip-flops — the walk to the Natural Pool is rocky. The included lunch is at Zeerovers fish market; bring extra cash ($15-20) if you want to try additional dishes. Sit on the left side of the Jeep for better photo angles at the Gold Mill ruins.",
    "warnings": "Tour does NOT run on Sundays. Some routes become impassable after heavy rain (rare, but ABC will switch to alternate route). The Natural Pool can have strong currents — listen to guide instructions.",
    "best_time_of_day": "Morning (8:30 AM departure is cooler and has better light for photos)",
    "confidence_score": 0.92
  },
  "error": null,
  "meta": {
    "request_id": "req_a1b2c3d4e5f6",
    "timestamp": "2026-04-04T14:35:00.000Z",
    "rate_limit": {
      "limit": 2000,
      "remaining": 1985,
      "reset_at": "2026-04-04T15:00:00.000Z"
    }
  }
}
```

**Errors:**
- `UNAUTHORIZED` (401) -- Missing API key
- `TIER_UPGRADE_REQUIRED` (403) -- Non-Premium key
- `NOT_FOUND` (404) -- Activity does not exist

**Non-Premium Error Response:**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "TIER_UPGRADE_REQUIRED",
    "message": "The booking-guide endpoint requires a Premium API key. Upgrade at https://aurelion.com/pricing",
    "details": {
      "required_tier": "premium",
      "current_tier": "basic",
      "upgrade_url": "https://aurelion.com/pricing"
    }
  },
  "meta": { ... }
}
```

---

### Providers

#### GET /v1/providers

**Purpose:** List all activity providers in the AURELION network. Useful for agents that want to understand provider coverage or present provider-centric views.

**Auth:** Optional
**Tier:** Any
**Scopes:** `providers:read`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `category` | string | — | Filter by primary activity category |
| `limit` | number | 20 | Results per page (1-50) |
| `offset` | number | 0 | Pagination offset |

**Request:**
```bash
curl -X GET "https://api.aurelion.com/v1/providers?limit=3" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "ABC Tours Aruba",
      "category": "Off-Road Expeditions",
      "website": "https://abc-aruba.com/",
      "activity_count": 3,
      "confidence_score": 0.92
    },
    {
      "id": 2,
      "name": "Pelican Adventures",
      "category": "Ocean Exploration",
      "website": "https://pelican-aruba.com/",
      "activity_count": 4,
      "confidence_score": 0.89
    },
    {
      "id": 7,
      "name": "Aruba Kayak Adventure",
      "category": "Water Sports",
      "website": "https://arubakayak.com/",
      "activity_count": 2,
      "confidence_score": 0.85
    }
  ],
  "error": null,
  "meta": {
    "request_id": "req_f6e5d4c3b2a1",
    "timestamp": "2026-04-04T14:36:00.000Z",
    "pagination": {
      "total_count": 11,
      "limit": 3,
      "offset": 0,
      "has_more": true
    },
    "rate_limit": {
      "limit": 500,
      "remaining": 488,
      "reset_at": "2026-04-04T15:00:00.000Z"
    }
  }
}
```

---

#### GET /v1/providers/:id

**Purpose:** Get detail for a single provider, including their activity listing and basic contact info.

**Auth:** Optional
**Tier:** Any
**Scopes:** `providers:read`

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | number | Provider ID |

**Request:**
```bash
curl -X GET "https://api.aurelion.com/v1/providers/5" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "ABC Tours Aruba",
    "category": "Off-Road Expeditions",
    "website": "https://abc-aruba.com/",
    "phone": "+297 582-5600",
    "confidence_score": 0.92,
    "activities": [
      {
        "id": 16,
        "title": "Island Ultimate Jeep Safari",
        "price_low": 130,
        "price_high": 130,
        "difficulty": "easy",
        "duration_minutes": 480
      },
      {
        "id": 17,
        "title": "Arikok National Park 4x4 Adventure",
        "price_low": 95,
        "price_high": 120,
        "difficulty": "moderate",
        "duration_minutes": 240
      },
      {
        "id": 18,
        "title": "Sunset Beach Buggy Tour",
        "price_low": 85,
        "price_high": 85,
        "difficulty": "easy",
        "duration_minutes": 180
      }
    ]
  },
  "error": null,
  "meta": {
    "request_id": "req_d4c3b2a1e5f6",
    "timestamp": "2026-04-04T14:37:00.000Z",
    "rate_limit": {
      "limit": 500,
      "remaining": 487,
      "reset_at": "2026-04-04T15:00:00.000Z"
    }
  }
}
```

---

#### GET /v1/providers/:id/intelligence

**Purpose:** Get the full intelligence report for a provider -- booking strategies, insider tips, warnings, and contact details not available in the basic view.

**Auth:** Required
**Tier:** Premium only
**Scopes:** `providers:intelligence`

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | number | Provider ID |

**Request:**
```bash
curl -X GET "https://api.aurelion.com/v1/providers/5/intelligence" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "ABC Tours Aruba",
    "category": "Off-Road Expeditions",
    "website": "https://abc-aruba.com/",
    "phone": "+297 582-5600",
    "email": "hello@abcaruba.com",
    "whatsapp": "+297 592-5600",
    "confidence_score": 0.92,
    "booking_intelligence": {
      "summary": "ABC Tours is the largest and most established off-road tour operator on Aruba. Family-owned since 2003. Fleet of 15 Jeep Wranglers, all model year 2023+. They run 2-3 departures daily in high season.",
      "pricing_strategy": "Website prices are firm but they offer 10% group discounts for 4+ and 15% for 8+. Hotel concierge desks charge a 15% commission on top. No price matching.",
      "booking_tips": "Book 2+ weeks ahead during December-April high season. They accept same-day bookings in low season (May-November). WhatsApp is the fastest way to confirm availability.",
      "cancellation_policy": "Free cancellation 48 hours before. 50% refund 24-48 hours. No refund under 24 hours. Rain policy: full reschedule, no refund.",
      "insider_tips": "Ask for guide Marco for the best experience. Tuesday/Thursday tours have smaller groups. The included lunch is at Zeerovers — bring extra cash for additional dishes.",
      "warnings": "No tours on Sundays. Some routes impassable after heavy rain (they switch to alternate route, not cancel). Natural Pool can have strong currents."
    },
    "activities": [
      {
        "id": 16,
        "title": "Island Ultimate Jeep Safari",
        "price_low": 130,
        "price_high": 130
      },
      {
        "id": 17,
        "title": "Arikok National Park 4x4 Adventure",
        "price_low": 95,
        "price_high": 120
      },
      {
        "id": 18,
        "title": "Sunset Beach Buggy Tour",
        "price_low": 85,
        "price_high": 85
      }
    ]
  },
  "error": null,
  "meta": {
    "request_id": "req_c3b2a1d4e5f6",
    "timestamp": "2026-04-04T14:38:00.000Z",
    "rate_limit": {
      "limit": 2000,
      "remaining": 1983,
      "reset_at": "2026-04-04T15:00:00.000Z"
    }
  }
}
```

**Errors:**
- `UNAUTHORIZED` (401) -- Missing API key
- `TIER_UPGRADE_REQUIRED` (403) -- Non-Premium key
- `NOT_FOUND` (404) -- Provider does not exist

---

### Itineraries

#### POST /v1/itineraries

**Purpose:** Create a new itinerary. The itinerary is owned by the API key holder and can be built up with activities over subsequent calls.

**Auth:** Required
**Tier:** Any
**Scopes:** `itineraries:write`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Itinerary name (1-200 chars) |
| `start_date` | string | Yes | Start date in ISO 8601 format (YYYY-MM-DD) |
| `end_date` | string | Yes | End date in ISO 8601 format (YYYY-MM-DD) |
| `notes` | string | No | Freeform notes about the trip |

**Request:**
```bash
curl -X POST "https://api.aurelion.com/v1/itineraries" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "3-Day Aruba Adventure",
    "start_date": "2026-05-10",
    "end_date": "2026-05-12",
    "notes": "Honeymoon trip, prefer morning activities"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "name": "3-Day Aruba Adventure",
    "start_date": "2026-05-10",
    "end_date": "2026-05-12",
    "total_days": 3,
    "notes": "Honeymoon trip, prefer morning activities",
    "status": "draft",
    "created_at": "2026-04-04T14:40:00.000Z",
    "updated_at": "2026-04-04T14:40:00.000Z",
    "days": []
  },
  "error": null,
  "meta": {
    "request_id": "req_b2a1c3d4e5f6",
    "timestamp": "2026-04-04T14:40:00.000Z",
    "rate_limit": {
      "limit": 500,
      "remaining": 485,
      "reset_at": "2026-04-04T15:00:00.000Z"
    }
  }
}
```

---

#### GET /v1/itineraries/:id

**Purpose:** Get the full itinerary with a `days` array containing activities organized by day.

**Auth:** Required (owner only)
**Tier:** Any
**Scopes:** `itineraries:write`

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | number | Itinerary ID |

**Request:**
```bash
curl -X GET "https://api.aurelion.com/v1/itineraries/42" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "name": "3-Day Aruba Adventure",
    "start_date": "2026-05-10",
    "end_date": "2026-05-12",
    "total_days": 3,
    "notes": "Honeymoon trip, prefer morning activities",
    "status": "draft",
    "created_at": "2026-04-04T14:40:00.000Z",
    "updated_at": "2026-04-04T15:10:00.000Z",
    "days": [
      {
        "day": 1,
        "date": "2026-05-10",
        "activities": [
          {
            "item_id": 101,
            "activity_id": 16,
            "time": "08:30",
            "notes": "Hotel pickup included",
            "activity": {
              "title": "Island Ultimate Jeep Safari",
              "category": "Off-Road Expeditions",
              "duration_minutes": 480,
              "price_low": 130,
              "price_high": 130,
              "location": "Island-wide (Natural Pool, Baby Beach, Arikok)"
            }
          }
        ]
      },
      {
        "day": 2,
        "date": "2026-05-11",
        "activities": [
          {
            "item_id": 102,
            "activity_id": 3,
            "time": "13:00",
            "notes": null,
            "activity": {
              "title": "Afternoon Snorkel Cruise",
              "category": "Ocean Exploration",
              "duration_minutes": 240,
              "price_low": 50,
              "price_high": 75,
              "location": "Palm Beach, Malmok Reef"
            }
          }
        ]
      },
      {
        "day": 3,
        "date": "2026-05-12",
        "activities": []
      }
    ]
  },
  "error": null,
  "meta": {
    "request_id": "req_a1b2c3d4e5f6",
    "timestamp": "2026-04-04T15:10:00.000Z",
    "rate_limit": {
      "limit": 500,
      "remaining": 480,
      "reset_at": "2026-04-04T16:00:00.000Z"
    }
  }
}
```

**Notes:**
- The `days` array is always sorted by day number and always contains all days in the range, even if empty.
- Each activity item includes a summary of the activity (not the full detail) to keep payloads manageable.
- The `item_id` is used for PATCH and DELETE operations on individual items.

---

#### POST /v1/itineraries/:id/activities

**Purpose:** Add an activity to a specific day in the itinerary.

**Auth:** Required (owner only)
**Tier:** Any
**Scopes:** `itineraries:write`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `activity_id` | number | Yes | Activity to add |
| `day` | number | Yes | Day number (1-indexed, within itinerary range) |
| `time` | string | No | Time in HH:MM format (24h) |
| `notes` | string | No | Freeform notes |

**Request:**
```bash
curl -X POST "https://api.aurelion.com/v1/itineraries/42/activities" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4" \
  -H "Content-Type: application/json" \
  -d '{
    "activity_id": 16,
    "day": 1,
    "time": "08:30",
    "notes": "Hotel pickup included"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "item_id": 101,
    "itinerary_id": 42,
    "activity_id": 16,
    "day": 1,
    "time": "08:30",
    "notes": "Hotel pickup included",
    "created_at": "2026-04-04T14:45:00.000Z"
  },
  "error": null,
  "meta": {
    "request_id": "req_d4e5f6a1b2c3",
    "timestamp": "2026-04-04T14:45:00.000Z",
    "rate_limit": {
      "limit": 500,
      "remaining": 484,
      "reset_at": "2026-04-04T15:00:00.000Z"
    }
  }
}
```

**Errors:**
- `VALIDATION_ERROR` (422) -- `day` out of range, invalid `activity_id`, bad time format
- `NOT_FOUND` (404) -- Itinerary or activity does not exist

---

#### PATCH /v1/itineraries/:id/activities/:itemId

**Purpose:** Update an existing activity item in the itinerary (move to a different day, change time, update notes).

**Auth:** Required (owner only)
**Tier:** Any
**Scopes:** `itineraries:write`

**Request Body (all optional):**

| Field | Type | Description |
|-------|------|-------------|
| `day` | number | New day number |
| `time` | string | New time (HH:MM, 24h) |
| `notes` | string | Updated notes |

**Request:**
```bash
curl -X PATCH "https://api.aurelion.com/v1/itineraries/42/activities/101" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4" \
  -H "Content-Type: application/json" \
  -d '{
    "day": 2,
    "time": "09:00",
    "notes": "Moved to day 2 for better scheduling"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "item_id": 101,
    "itinerary_id": 42,
    "activity_id": 16,
    "day": 2,
    "time": "09:00",
    "notes": "Moved to day 2 for better scheduling",
    "updated_at": "2026-04-04T14:50:00.000Z"
  },
  "error": null,
  "meta": {
    "request_id": "req_e5f6a1b2c3d4",
    "timestamp": "2026-04-04T14:50:00.000Z",
    "rate_limit": {
      "limit": 500,
      "remaining": 483,
      "reset_at": "2026-04-04T15:00:00.000Z"
    }
  }
}
```

---

#### DELETE /v1/itineraries/:id/activities/:itemId

**Purpose:** Remove an activity from the itinerary.

**Auth:** Required (owner only)
**Tier:** Any
**Scopes:** `itineraries:write`

**Request:**
```bash
curl -X DELETE "https://api.aurelion.com/v1/itineraries/42/activities/101" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "item_id": 101
  },
  "error": null,
  "meta": {
    "request_id": "req_f6a1b2c3d4e5",
    "timestamp": "2026-04-04T14:55:00.000Z",
    "rate_limit": {
      "limit": 500,
      "remaining": 482,
      "reset_at": "2026-04-04T15:00:00.000Z"
    }
  }
}
```

**Notes:** Unlike the private API (which returns 204 No Content), the public API returns a 200 with a confirmation body so agents can programmatically verify the deletion.

---

#### POST /v1/itineraries/:id/export

**Purpose:** Generate a PDF export of the itinerary. Returns a temporary download URL.

**Auth:** Required (owner only)
**Tier:** Basic or Premium
**Scopes:** `itineraries:write`

**Request:**
```bash
curl -X POST "https://api.aurelion.com/v1/itineraries/42/export" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "itinerary_id": 42,
    "download_url": "https://cdn.aurelion.com/exports/itin_42_20260404.pdf?token=exp_abc123&expires=1743789000",
    "expires_at": "2026-04-04T16:30:00.000Z",
    "format": "pdf",
    "pages": 3
  },
  "error": null,
  "meta": {
    "request_id": "req_a1b2c3d4e5f6",
    "timestamp": "2026-04-04T15:00:00.000Z",
    "rate_limit": {
      "limit": 500,
      "remaining": 481,
      "reset_at": "2026-04-04T16:00:00.000Z"
    }
  }
}
```

**Errors:**
- `TIER_UPGRADE_REQUIRED` (403) -- Free-tier key. Response includes:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "TIER_UPGRADE_REQUIRED",
    "message": "PDF export requires a Basic or Premium API key.",
    "details": {
      "required_tier": "basic",
      "current_tier": "free",
      "upgrade_url": "https://aurelion.com/pricing"
    }
  },
  "meta": { ... }
}
```

---

### Concierge

#### POST /v1/concierge/ask

**Purpose:** Stateless Q&A with the AURELION AI concierge. The concierge has deep knowledge of all Aruba activities in the AURELION catalog and can answer natural language questions with structured, actionable responses.

**Auth:** Required
**Tier:** Premium only
**Scopes:** `concierge:ask`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | Natural language question (1-1000 chars) |
| `context` | object | No | Optional structured context to improve answer quality |
| `context.budget_max` | number | No | Maximum budget in USD |
| `context.group_size` | number | No | Number of people in the group |
| `context.interests` | string[] | No | Interest keywords |
| `context.dates` | string | No | Travel dates description |
| `context.constraints` | string | No | Any constraints or special requirements |

**Request:**
```bash
curl -X POST "https://api.aurelion.com/v1/concierge/ask" \
  -H "Authorization: Bearer ak_live_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the best half-day activity for a family with young kids?",
    "context": {
      "budget_max": 200,
      "group_size": 4,
      "interests": ["beach", "animals"],
      "constraints": "Kids are ages 4 and 7, need something not too physical"
    }
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "answer": "For a family with young kids (ages 4 and 7), I recommend the **Afternoon Snorkel Cruise** by Pelican Adventures. It's a gentle, 4-hour boat trip departing from Palm Beach with calm water snorkeling at Malmok Reef, where kids can see colorful fish and sea turtles in shallow water. The crew provides child-sized equipment and life vests. At $50-75 per person, a family of 4 would be well within your $200 budget.\n\nIf the kids love animals, also consider the **Butterfly Farm** (not a half-day commitment, but a great 1-hour add-on at $15/adult, kids under 5 free) before or after the cruise.\n\nAvoid the Jeep Safari and Arikok 4x4 for this age group — the terrain is too bumpy for small children.",
    "suggested_activities": [
      {
        "id": 3,
        "title": "Afternoon Snorkel Cruise",
        "provider": "Pelican Adventures",
        "price_low": 50,
        "price_high": 75,
        "relevance": "primary_recommendation"
      },
      {
        "id": 12,
        "title": "Butterfly Farm Visit",
        "provider": "The Butterfly Farm Aruba",
        "price_low": 15,
        "price_high": 15,
        "relevance": "complementary"
      }
    ],
    "sources": [
      {
        "type": "activity_catalog",
        "description": "AURELION activity database (15 verified activities)",
        "confidence": 0.91
      }
    ]
  },
  "error": null,
  "meta": {
    "request_id": "req_c3d4e5f6a1b2",
    "timestamp": "2026-04-04T15:05:00.000Z",
    "model": "gpt-4o-mini",
    "tokens_used": 487,
    "rate_limit": {
      "limit": 2000,
      "remaining": 1978,
      "reset_at": "2026-04-04T16:00:00.000Z"
    }
  }
}
```

**Notes:**
- This is a **stateless** endpoint. Unlike the private chat API (which maintains sessions with conversation history), each call to `/v1/concierge/ask` is independent. This is intentional for agents, which maintain their own conversation state.
- The `context` object is optional but strongly recommended. It helps the concierge give more targeted answers without requiring the agent to embed context into the question string.
- The `suggested_activities` array contains activity IDs that the agent can use for follow-up API calls (e.g., to get full detail or booking guides).
- The `sources` array documents what data informed the answer and at what confidence level.

**Errors:**
- `UNAUTHORIZED` (401) -- Missing API key
- `TIER_UPGRADE_REQUIRED` (403) -- Non-Premium key
- `VALIDATION_ERROR` (422) -- Question too long or missing

---

## 8. Implementation Status

| Endpoint | Method | Path | Status | Notes |
|----------|--------|------|--------|-------|
| List Activities | GET | `/v1/activities` | Design | Adapt from private `GET /api/activities` |
| Search Activities | POST | `/v1/activities/search` | Design | New endpoint, extends private search |
| Get Activity | GET | `/v1/activities/:id` | Design | Adapt from private, add tier-gated fields |
| Booking Guide | GET | `/v1/activities/:id/booking-guide` | Design | New endpoint, Premium only |
| List Providers | GET | `/v1/providers` | Design | New endpoint (not in private API) |
| Get Provider | GET | `/v1/providers/:id` | Design | New endpoint (not in private API) |
| Provider Intelligence | GET | `/v1/providers/:id/intelligence` | Design | New endpoint, Premium only |
| Create Itinerary | POST | `/v1/itineraries` | Design | Adapt from private `POST /api/itineraries` |
| Get Itinerary | GET | `/v1/itineraries/:id` | Design | Adapt from private, restructure to `days` array |
| Add Activity to Itinerary | POST | `/v1/itineraries/:id/activities` | Design | Adapt from private `POST /api/itineraries/:id/items` |
| Update Itinerary Activity | PATCH | `/v1/itineraries/:id/activities/:itemId` | Design | Adapt from private |
| Remove Itinerary Activity | DELETE | `/v1/itineraries/:id/activities/:itemId` | Design | Adapt from private, change to 200 with body |
| Export Itinerary | POST | `/v1/itineraries/:id/export` | Design | Adapt from private `GET`, change to POST |
| Ask Concierge | POST | `/v1/concierge/ask` | Design | New stateless endpoint, replaces chat sessions |

---

## 9. Implementation Plan

### Week 1: API Key Infrastructure

**Goal:** Users can generate and manage API keys from the web dashboard.

- **Database:** Create `api_keys` table (Drizzle migration):
  - `id` (serial, primary key)
  - `user_id` (FK to users)
  - `key_hash` (bcrypt hash of the key -- never store plaintext)
  - `key_prefix` (first 12 chars, e.g., `ak_live_a1b2`, stored for identification)
  - `name` (user-provided label)
  - `scopes` (JSON array of scope strings)
  - `tier` (inherited from user at creation time, updated on user tier change)
  - `last_used_at` (timestamp, updated on each request)
  - `created_at`, `revoked_at`
- **Middleware:** `authenticateApiKey` middleware that:
  1. Extracts Bearer token from Authorization header
  2. Finds key by prefix in `api_keys` table
  3. Verifies full key against stored hash
  4. Attaches `apiKey` object (with user, tier, scopes) to request
  5. Falls through to unauthenticated handler if no Authorization header
- **Dashboard UI:** "API Keys" tab under Settings:
  - List keys (showing prefix, name, scopes, last used, created date)
  - Create key (name, scope checkboxes)
  - Revoke key (soft delete via `revoked_at`)
- **Deliverable:** Working key generation, storage, and middleware validation

### Week 2: Activity and Provider Endpoints

**Goal:** The four activity endpoints and three provider endpoints are live.

- **Router:** Create `routes/public/v1/activities.ts` and `routes/public/v1/providers.ts`
- **Response envelope:** Create `lib/public-api/response.ts` with helper functions:
  - `successResponse(data, meta)` -- wraps data in standard envelope
  - `errorResponse(code, message, details, meta)` -- wraps error in standard envelope
  - `paginatedResponse(data, total, limit, offset, meta)` -- adds pagination to meta
- **Activities:** Adapt from private API queries. Add:
  - `provider` object nesting (JOIN instead of separate fields)
  - `booking_intelligence` field with tier-gating logic
  - Pagination with `total_count` and `has_more`
  - `POST /search` with relevance scoring (pg_trgm or ILIKE ranking)
- **Providers:** New queries against activities table (grouped by provider fields):
  - Derive provider list from distinct `providerName` values in activities
  - Intelligence endpoint reads `premiumBookingGuide`, `insiderTips`, `warnings` across all provider activities
- **Deliverable:** 7 endpoints responding to requests with correct envelope format

### Week 3: Itinerary and Concierge Endpoints

**Goal:** The six itinerary endpoints and one concierge endpoint are live.

- **Itineraries:** Adapt from private API:
  - `POST /itineraries` -- accept `start_date`/`end_date` (compute `total_days`)
  - `GET /itineraries/:id` -- restructure flat items into `days` array
  - Item endpoints -- rename from "items" to "activities" in the URL
  - `POST /export` -- generate PDF server-side, upload to S3/CDN, return signed URL
  - DELETE returns 200 with body instead of 204
- **Concierge:** New stateless endpoint:
  - Reuse the OpenAI integration from private chat (`gpt-4o-mini`)
  - Remove session/history management (stateless)
  - Add structured `context` parameter injection into system prompt
  - Extract `suggested_activities` from AI response (regex or structured output)
  - Add `sources` and `confidence` metadata
- **Deliverable:** 7 endpoints, all 14 public endpoints now functional

### Week 4: Rate Limiting, Error Handling, OpenAPI Spec

**Goal:** Production-hardened API with generated documentation.

- **Rate limiting:**
  - Redis-backed sliding window counter (per API key or per IP)
  - Middleware that checks limits before route handler
  - `X-RateLimit-*` headers on every response
  - `429` response with `Retry-After` header when exceeded
- **Error handling:**
  - Global error handler that catches all thrown/unhandled errors
  - Maps known errors to error codes (UNAUTHORIZED, FORBIDDEN, etc.)
  - Wraps all errors in standard envelope
  - Logs error details server-side, returns safe message client-side
- **OpenAPI spec generation:**
  - Use `zod-to-openapi` to generate OpenAPI 3.1 spec from Zod schemas
  - Host interactive docs at `/v1/docs` (Swagger UI or Redoc)
  - Downloadable spec at `/v1/openapi.json`
- **Deliverable:** Rate-limited, well-documented API ready for external testing

### Week 5: Agent Integration Examples

**Goal:** External developers and AI agents can integrate in under 30 minutes.

- **curl examples:** Already in this document, verify they work against live API
- **Python SDK example:** Lightweight wrapper using `requests`:
  ```python
  from aurelion import AurelionClient
  client = AurelionClient(api_key="ak_live_...")
  activities = client.activities.list(category="Ocean Exploration", max_price=100)
  ```
- **MCP server:** Model Context Protocol server that exposes AURELION as tools:
  - `search_activities` tool
  - `get_activity_detail` tool
  - `create_itinerary` tool
  - `ask_concierge` tool
- **Integration test suite:** Automated tests that run against the live staging API
- **Deliverable:** Published examples, MCP server, integration tests
