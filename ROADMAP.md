# AURELION ROADMAP & VISION

**Last Updated:** 2026-04-05
**Current Phase:** MVP — Feature-Complete, Pre-Launch Polish
**Next Milestone:** Stripe Integration + Public Beta Deployment

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Current State (What Exists Today)](#current-state-what-exists-today)
3. [Immediate Roadmap (Next 4-8 Weeks)](#immediate-roadmap-next-4-8-weeks)
4. [Phase 2: Post-Launch Optimization (2-3 Months)](#phase-2-post-launch-optimization-2-3-months)
5. [Phase 3: Data Pipeline & Automation (3-6 Months)](#phase-3-data-pipeline--automation-3-6-months)
6. [Future Vision (6-12 Months)](#future-vision-6-12-months)
7. [Deferred Ideas (Good But Not Now)](#deferred-ideas-good-but-not-now)
8. [Technical Debt Log](#technical-debt-log)
9. [Decision Log](#decision-log)
10. [Appendix](#appendix)

---

## Project Overview

### What Is Aurelion?

Aurelion is a luxury adventure planning platform for Aruba. It provides curated,
research-backed activity recommendations, structured itinerary building, and an
AI-powered concierge that gives insider booking intelligence — the kind of advice
you'd get from a friend who lives on the island.

**Tagline:** Precision-crafted adventure itineraries for Aruba.

**Core value proposition:** We do the research so you don't have to. Every vendor
is vetted, every price is verified, every tip comes from real reviews. The AI
concierge doesn't hallucinate — it only recommends what's actually in our database.

### Business Model

Three tiers, priced per-itinerary (one-time purchase, not subscription):

| Tier | Price | Unlocks |
|------|-------|---------|
| **Free (Explorer)** | $0 | Browse activities, search/filter, build rough itinerary |
| **Basic (Planner)** | $9.99 | Save itineraries, export PDF, day-by-day structure, basic booking guides |
| **Premium (Concierge)** | $49.99 | AI concierge chat, premium booking intelligence, insider tips, provider contacts |

**Why per-itinerary, not subscription:** Travelers plan one trip at a time. A
subscription feels like a commitment for something used once or twice a year.
Per-itinerary pricing aligns with the user's mental model: "I'm planning a trip
to Aruba, here's $10 for a better plan."

### Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Monorepo** | pnpm workspaces | pnpm 10 | Shared types across packages, single install, faster than npm/yarn |
| **Language** | TypeScript | 5.9 | Full type safety across frontend + backend + DB schema |
| **Frontend** | React + Vite | React 19, Vite 7 | Fast HMR, modern bundling, better DX than Next.js for SPA |
| **Routing** | Wouter | 3.x | Lightweight (2KB vs React Router's 20KB), sufficient for SPA |
| **State** | TanStack React Query | 5.x | Server state management, caching, auto-refetch |
| **Styling** | Tailwind CSS + shadcn/ui | Tailwind 4 | Utility-first, no CSS-in-JS runtime, pre-built accessible components |
| **Backend** | Express 5 | 5.x | Mature, well-understood, async/await native in v5 |
| **ORM** | Drizzle ORM | 0.45 | Best TypeScript integration, lightweight, SQL-first philosophy |
| **Database** | PostgreSQL (Supabase) | 16 | Managed hosting, automatic backups, free tier generous for MVP |
| **Validation** | Zod (v4) | 3.25+ | Runtime validation matching TypeScript types, used by both frontend and backend |
| **API Codegen** | Orval | 8.5 | Generates React Query hooks + Zod schemas from OpenAPI spec (single source of truth) |
| **Auth** | Session-based (bcryptjs) | — | No OAuth dependency, simpler than JWT, 12-round bcrypt |
| **Payments** | Stripe | 22.x | Industry standard, test mode works without config |
| **AI** | OpenAI gpt-4o-mini | — | Cost-effective ($0.15/1M input), fast, good quality for concierge |
| **Build** | esbuild | 0.27 | Sub-second API server builds, bundles to single ESM file |
| **Logging** | Pino | 9.x | Structured JSON logging, redacts sensitive fields, pino-pretty in dev |

### Target Users

1. **Primary:** Couples and small groups (2-6 people) planning a 3-7 day Aruba trip
2. **Secondary:** Solo adventure travelers looking for curated off-the-beaten-path experiences
3. **Tertiary:** Travel agents or concierge services needing Aruba-specific intelligence

### Architecture Goals

- **API-first:** Every feature has a corresponding API endpoint. Paperclip agents
  manage the site via APIs, not UI scraping.
- **Portable:** Codebase is clean and documented enough to sell on Flippa.
- **Transferable:** A new developer can set up local dev in under 15 minutes with
  the `dev.bat` script.

---

## Current State (What Exists Today)

### Completed Features

#### Local Development Environment
- **Status:** Fully working on Windows
- **How to start:** Run `dev.bat` from project root (starts API on :3001, frontend on :3000)
- **Env:** `.env` at monorepo root, loaded via `--env-file` flag
- **What was fixed:** pnpm-workspace.yaml Windows platform overrides, preinstall script,
  Vite PORT/BASE_PATH defaults, API proxy config, dotenv loading via Node 24 `--env-file`
- **Files:** `.env`, `.env.example`, `dev.bat`

#### Database Schema (9 tables, all migrated to Supabase)

| Table | Rows | Purpose |
|-------|------|---------|
| `users` | 1 | Auth accounts (bcrypt hashes, role, tier, AI index cache) |
| `providers` | 11 | Real Aruba tour vendors with intelligence data |
| `activities` | 15 | Real tours with verified prices + hero images from vendor websites |
| `itineraries` | 1 | User trip plans (title, days, tier, status) |
| `itinerary_items` | 0 | Activities placed in itinerary day/time slots |
| `purchases` | 0 | Stripe payment records (pending/completed) |
| `chat_sessions` | — | AI concierge conversation containers (with compression metadata) |
| `chat_messages` | — | Individual chat messages (user/assistant roles, token counts, archival) |
| `user_memories` | — | Semantic memory storage with embeddings (preferences, details, concerns) |

- **Schema file:** `lib/db/src/schema/` (8 files, heavily annotated with JSDoc)
- **Push command:** `pnpm --filter @workspace/db run push`
- **No FK constraints** at DB level (enforced in application code) — intentional
  decision for flexibility during MVP. Revisit in Phase 2.
- **New since initial build:** `user_memories` table with embedding support
  (1536-dim vectors via `text-embedding-3-small`), `chat_sessions` compression
  fields (`compressedHistory`, `lastCompressedAt`, `compressionCount`),
  `chat_messages` archival fields (`isArchived`, `tokenCount`).

#### Vendor Intelligence System (11 Real Vendors)
- **Status:** Seeded with real web-scraped data (April 2026)
- **Data sources:** Direct website scraping + TripAdvisor review analysis
- **Confidence range:** 0.78 (Fofoti Tours) to 0.98 (ABC Tours)
- **Intelligence fields per vendor:**
  - `bestBookingMethod` — how to actually book (website, WhatsApp, phone)
  - `whenToBook` — timing advice (advance booking, best seasons)
  - `whatToSay` — specific phrases/requests that improve the experience
  - `insiderTips[]` — 4-10 actionable tips per vendor
  - `warnings[]` — 3-4 important caveats per vendor
  - `bookingConfidence` — quality score (0.00-1.00)
  - `intelligenceReport` — 2-paragraph prose summary for AI concierge
  - `lastResearchedAt` — staleness tracking timestamp
- **Seed script:** `artifacts/api-server/src/scripts/seed-vendors.ts`
- **Run:** `pnpm --filter @workspace/api-server run seed:vendors`
- **Idempotent:** Yes — upserts by vendor name

**Vendor list:**

| Confidence | Vendor | Category | Website |
|---|---|---|---|
| 0.98 | ABC Tours Aruba | Off-road jeep/UTV | abc-aruba.com |
| 0.95 | De Palm Tours | Catamaran/snorkel | depalm.com |
| 0.93 | Jolly Pirates | Pirate ship snorkel | jolly-pirates.com |
| 0.92 | Pelican Adventures | Sailing/snorkel/safari | pelican-aruba.com |
| 0.91 | Rancho Notorious | Horseback riding | ranchonotorious.com |
| 0.87 | Aruba Active Vacations | Kitesurfing/windsurfing | aruba-active-vacations.com |
| 0.85 | Delphi Watersports | Multi-sport water activities | delphiwatersports.com |
| 0.83 | Octopus Aruba | Catamaran/private charters | octopusaruba.com |
| 0.82 | Around Aruba Tours | ATV/UTV/jeep/boat | aroundarubatours.com |
| 0.80 | Rockabeach Tours | Budget off-road/bus | rockabeachtours.com |
| 0.78 | Fofoti Tours | UTV/jeep/bus/transfers | fofoti.com |

#### Activities Catalog (15 Real Activities)

All prices and details scraped from actual vendor websites (April 2026).

| Price | Category | Activity | Vendor |
|---|---|---|---|
| $130 | Off-Road Expeditions | Island Ultimate Jeep Safari | ABC Tours |
| $310/vehicle | Off-Road Expeditions | UTV to Natural Pool + Cliff Jumping | ABC Tours |
| $240/vehicle | Off-Road Expeditions | UTV Gold Coast Tour | ABC Tours |
| $97 | Off-Road Expeditions | Safari Jeep Adventures | Rockabeach |
| $99 | Ocean Exploration | Palm Pleasure Catamaran Snorkel | De Palm |
| $49 | Ocean Exploration | Seaworld Explorer Glass-Bottom Boat | De Palm |
| $72 | Ocean Exploration | Aqua Champagne Brunch Cruise | Pelican |
| $50 | Ocean Exploration | Afternoon Sailing & Snorkeling | Pelican |
| $98 | Ocean Exploration | Morning Snorkel & BBQ Cruise | Jolly Pirates |
| $54-76 | Ocean Exploration | Afternoon Snorkel Sail | Jolly Pirates |
| $65 | Ocean Exploration | Catamaran Snorkeling Cruise | Delphi |
| $75 | Water & Wind Sports | Parasailing over Palm Beach | Delphi |
| $130+tax | Scenic Riding | Sunset Horseback Riding | Rancho Notorious |
| $105+tax | Scenic Riding | Countryside & Hidden Lagoon Ride | Rancho Notorious |
| Contact vendor | Water & Wind Sports | Kitesurfing Lesson | Aruba Active Vacations |

- **Seed script:** `artifacts/api-server/src/scripts/seed-real-activities.ts`
- **Run:** `pnpm --filter @workspace/api-server run seed:activities`
- **Data rule:** Zero hallucinated prices — "$0" used where price wasn't on vendor website

#### API Layer (31 endpoints, 0 TypeScript errors)

All routes under `/api` prefix. Full OpenAPI spec at `lib/api-spec/openapi.yaml`.

| Group | Endpoints | Auth | Description |
|-------|-----------|------|-------------|
| Health | `GET /healthz` | None | Uptime monitoring |
| Auth | 4 endpoints | Mixed | Session-based login/register/logout/me |
| Activities | 4 endpoints | None | Browse, search, filter, detail |
| Itineraries | 9 endpoints | Required | Full CRUD + items + export |
| Chat | 5 endpoints | Required + Premium | AI concierge sessions/messages + SSE streaming |
| Purchases | 3 endpoints | Mixed | Stripe checkout + webhook |
| Dashboard | 1 endpoint | Required | User summary stats |
| Admin | 4 endpoints | Admin | Activity CRUD + URL ingest |

- **Validation:** Every request body validated with Zod schemas
- **Client codegen:** Orval generates React Query hooks from OpenAPI spec
- **Type safety:** Full TypeScript end-to-end, 0 errors across all workspaces

#### Frontend (13 pages, React + Vite + Tailwind + shadcn/ui)

| Route | Page | Status |
|-------|------|--------|
| `/` | Home (hero, featured, categories) | Built |
| `/activities` | Activity directory with search/filter | Built |
| `/activities/:id` | Activity detail with tier-gated content | Built |
| `/pricing` | Three-tier pricing page | Built |
| `/about` | Brand story | Built |
| `/auth/login` | Login form | Built |
| `/auth/register` | Registration form | Built |
| `/dashboard` | User dashboard | Built |
| `/itineraries/new` | Create itinerary form | Built |
| `/itineraries/:id` | Itinerary builder with day/slot management | Built |
| `/chat/:sessionId` | AI concierge chat | Built |
| `/admin` | Admin activity management | Built |
| `*` | 404 page | Built |

- **Component library:** 56 shadcn/ui components + 3 layout components
- **Hooks:** `use-mobile`, `use-toast`
- **Utilities:** `cn()` class merger, `getImageUrl()`, `getActivityImageUrl()`, `printItineraryPDF()`

#### AI Concierge (Fully Implemented)
- **Status:** Production-ready with streaming, function calling, memory, and compression
- **Model:** gpt-4o-mini (OpenAI Chat Completions API)
- **Streaming:** SSE endpoint (`POST /chat/sessions/:id/messages/stream`) with real-time
  token rendering, animated cursor, and typing indicators
- **Non-streaming fallback:** `POST /chat/sessions/:id/messages`
- **System prompt:** Lazy-loading Tier 1 architecture (~3,700 tokens vs original 10,550).
  Vendor intelligence data loaded on-demand via tools, not crammed into prompt.
- **Function calling (9 tools):**
  - `search_activities` — filter by category, price, difficulty, query
  - `get_activity_details` — full activity info with booking guides & provider contacts
  - `get_vendor_details` — vendor intelligence & booking strategies
  - `search_user_memory` — semantic search over stored preferences (cosine similarity)
  - `save_user_memory` — store user preferences/details/concerns with embeddings
  - `list_user_itineraries` — get user's trips
  - `get_itinerary_details` — full itinerary + scheduled activities
  - `add_to_itinerary` — add activity to day/time slot directly from chat
  - `remove_from_itinerary` — remove activity from itinerary directly from chat
- **Conversation compression:** When conversation exceeds 10 messages, older messages
  are summarized via gpt-4o-mini and archived. Keeps 5 most recent messages verbatim.
  Fallback to keyword extraction if summary API fails.
- **User memory:** Semantic embeddings via `text-embedding-3-small` (1536 dimensions).
  5 memory types: preference, detail, feedback, trip, concern. Persisted to
  `user_memories` table with cosine similarity search.
- **Mock mode:** Returns formatted activity suggestions when `OPENAI_API_KEY` is absent.
- **Files:** `artifacts/api-server/src/routes/chat.ts`,
  `artifacts/api-server/src/lib/ai-concierge/tools.ts`,
  `artifacts/api-server/src/lib/ai-concierge/compression.ts`

#### Activity Image System (Fully Implemented)
- **Status:** All 15 activities have hero images; images render on all pages
- **Image sources:**
  - 13 existing PNG images in `public/activities/` (off-road, horseback, water sports, etc.)
  - 6 AI-generated JPG images via fal.ai FLUX (catamaran, pirate ship, glass-bottom boat,
    champagne brunch, afternoon sailing, party catamaran)
  - 6 category placeholder PNGs (`category-cliff.png`, `category-ocean.png`, etc.)
- **Frontend utility:** `getActivityImageUrl(imageUrl, category)` — returns the activity's
  image URL or falls back to a category-specific placeholder. Used consistently across
  Home.tsx, Activities.tsx, ActivityDetail.tsx, ItineraryDetail.tsx.
- **Seed script updated:** All 15 activities in `seed-real-activities.ts` now have
  `imageUrl` values pointing to local static assets.
- **Files:** `artifacts/aurelion/src/lib/image-url.ts`,
  `artifacts/aurelion/public/activities/`

#### Itinerary PDF Export (Fully Implemented)
- **Architecture:** HTML-to-print with luxury branded styling
- **Branding:** Playfair Display + Lato fonts, gold accent (#c8a96e), dark background,
  corner borders, dividers, page breaks
- **Cover page:** Brand name, itinerary title, day count, export date, luxury tagline
- **Content pages:** Day headers, time slots (morning/afternoon/evening), activity cards
  with title, duration, difficulty, price, category, location, description, tags,
  "What to Bring", "What to Expect"
- **Print optimizations:** @page A4 sizing, print media queries, `page-break-inside: avoid`
- **Tier gating:** Basic+ required, PremiumLock gate for free users
- **File:** `artifacts/aurelion/src/lib/pdf-export.ts`

#### UX Polish (Complete Pass)
- **PremiumLockEnhanced component:** Conversion-focused premium gate with lock icon,
  feature list, blurred preview content, price anchor, and CTA. Used in Chat.tsx,
  ActivityDetail.tsx, ItineraryDetail.tsx.
- **Error toasts:** Destructive toast notifications across Admin (CRUD failures),
  Chat (AI errors), Login/Register (auth failures), Dashboard (chat creation),
  ItineraryDetail (export failures).
- **Breadcrumbs component:** Navigation aid in activity detail and itinerary pages.
- **Mobile responsive:** Full responsive pass across all pages — mobile filter drawer
  in Activities.tsx, responsive grids, optimized image sizing, touch-friendly targets.
- **Navigation:** "My Dashboard" link in navbar (authenticated users only), login/register
  redirects to dashboard on success, active link styling.
- **Tier gating UI:** Consistent tier checks across Chat (Premium), activity booking guides
  (Basic+/Premium+), advanced filters (Premium), itinerary export (Basic+).
  Admin role bypasses all gates.
- **Files:** `artifacts/aurelion/src/components/ui/premium-lock-enhanced.tsx`,
  `artifacts/aurelion/src/components/ui/breadcrumbs.tsx`

#### Code Quality
- **Annotations:** Every function, route, component, and schema field has JSDoc
- **TypeScript:** 0 errors across all workspace packages (`pnpm run typecheck:libs` + artifact typechecks)
- **Fixes applied:** Zod v3/v4 resolver compatibility, `UseQueryOptions` `Partial<>` wrapping,
  `UserSession.tier` field addition, express-session type augmentation, duplicate export resolution

### Partially Completed

#### Stripe Payments
- **Backend:** Checkout session creation + webhook handler fully implemented
- **Mock mode:** Works without `STRIPE_SECRET_KEY` — auto-completes purchases
- **Missing:** Stripe test products not created, payment UI flow not tested end-to-end
- **Files:** `artifacts/api-server/src/routes/purchases.ts`

### Not Started

- OAuth / social login
- Email verification / password reset
- Email notifications (welcome, booking confirmation)
- Maps integration (activity pins, route visualization)
- User reviews & ratings
- Error tracking (Sentry or similar)
- Analytics (PostHog, Plausible, or GA4)
- API rate limiting
- Automated tests
- CI/CD pipeline
- Custom domain + SSL
- SEO optimization

---

## Immediate Roadmap (Next 4-8 Weeks)

### Goal: Launch Public Beta

### Week 1-2: Data Validation & Gap Filling

**Objective:** Ensure all seeded data is accurate and fill coverage gaps.

#### Tasks

1. **Manual QA of all 15 activities**
   - Verify each price still matches the vendor website
   - Confirm contact info works (test 3-5 vendors via phone/WhatsApp)
   - Check all URLs resolve
   - Read through all insider tips for usefulness

2. **Expand activity catalog to 25-30**
   - Add activities from: Around Aruba Tours, Fofoti, Octopus Aruba
   - Research vendors that lack activities: Aruba Active Vacations (pricing needed)
   - Categories underrepresented: "Wild Terrain & Natural Wonders" (0 activities),
     "Cliff & Vertical Adventures" (0 — no real climbing operators found)

3. **Create DATA-GAPS.md**
   - Track: missing vendor data, stale prices, incomplete intelligence
   - Categorize by priority: High (blocks launch) / Medium / Low

#### Deliverables
- [ ] All 15 activities verified against vendor websites
- [ ] 10-15 additional activities added from remaining vendors
- [ ] DATA-GAPS.md created
- [ ] Category "Wild Terrain" covered (Arikok/cave tours from Pelican or ABC)

---

### ~~Week 2-3: UX Polish & Design System~~ DONE

**Status:** Completed across commits c5a7923, a536a03, 04ae394.

- [x] Polished activity listing + detail pages (images, price, duration, category, provider)
- [x] Activity cards with hover animations, category badges, price anchoring
- [x] Filters working: category, difficulty (search, price range planned for Phase 2)
- [x] Functional itinerary builder with day/slot UX (morning/afternoon/evening)
- [x] Homepage hero + category grid + featured experiences
- [x] All pages responsive on mobile (filter drawer, responsive grids, touch targets)
- [x] PremiumLockEnhanced component for conversion-focused gating
- [x] Error toasts across all pages
- [x] Breadcrumbs navigation component
- [x] Activity images rendering on all pages with category fallbacks

---

### Week 3-4: Payments & Tier Gating (Partially Done)

**Objective:** Enable real payment flow.

**Completed:**
- [x] Tier gating implemented in UI across all pages (Chat, ActivityDetail, ItineraryDetail)
- [x] Free/Basic/Premium content gates with PremiumLock and PremiumLockEnhanced
- [x] PDF export with luxury Aurelion branding (Playfair Display, gold accents, A4 layout)
- [x] Admin role bypasses all tier gates

**Remaining:**

1. **Stripe test mode setup**
   - Create test products: Basic ($9.99), Premium ($49.99)
   - Test checkout flow end-to-end
   - Verify webhook updates purchase status + itinerary tier
   - Handle success, cancellation, and failure states

#### Deliverables
- [x] Tier-gated content across all pages
- [x] PDF export generating clean branded output
- [ ] Stripe test mode checkout working
- [ ] Upgrade flow UI (pricing page -> checkout -> confirmation)

---

### ~~Week 4-5: AI Concierge MVP~~ DONE

**Status:** Completed across commits d39dc21, e7d72d9, f3e85f4. Exceeded original
scope — shipped with streaming, function calling, semantic memory, and conversation
compression (originally stretch goals or not planned).

- [x] System prompt with lazy-loading vendor intelligence (on-demand via tools)
- [x] Chat UI with typing indicators, animated cursor, error handling
- [x] Suggested starter questions in empty chat state
- [x] Premium-only access enforced (PremiumLockEnhanced upgrade prompt)
- [x] SSE streaming responses with real-time token rendering
- [x] 9 function-calling tools (search, details, vendor intel, memory, itinerary CRUD)
- [x] Conversation compression (summarize older messages, keep 5 recent verbatim)
- [x] Semantic user memory with embeddings (preferences, concerns, trip details)

---

### Week 5-6: Pre-Launch & Beta

**Objective:** Deploy and get first users.

#### Pre-launch checklist
- [x] 0 TypeScript errors
- [x] Database seeded on production Supabase (vendors + activities + images)
- [x] AI concierge fully functional with streaming + tools
- [x] Activity images rendering on all pages
- [x] PDF export with luxury branding
- [x] Tier gating across all pages
- [x] 404 and error pages styled
- [ ] Environment variables configured for production
- [ ] Stripe webhooks pointed at production URL
- [ ] Error tracking setup (Sentry)
- [ ] Basic analytics (PostHog or Plausible)
- [ ] Terms of Service + Privacy Policy pages
- [ ] Full user flow tested: signup -> browse -> build -> upgrade -> chat
- [ ] API rate limiting added (express-rate-limit)

#### Launch tasks
1. Deploy to production (Replit or Railway)
2. Set up custom domain (aurelion.com or similar)
3. Smoke test payment flow in Stripe test mode, then switch to live
4. Recruit 10-20 beta users (travel forums, Aruba subreddits, personal network)
5. Set up feedback form (Typeform or Google Forms)

#### Success metrics
- 10+ beta signups in first week
- 5+ itineraries created
- 2+ paid upgrades (even if discounted for beta)
- 0 critical bugs reported
- Useful qualitative feedback on AI concierge quality

---

## Phase 2: Post-Launch Optimization (2-3 Months)

### Goal: Validate Product-Market Fit

### What we'll learn from beta users

- Which vendors get recommended most by the AI concierge?
- Which activities get added to itineraries most often?
- Is the booking intelligence actually useful, or do users ignore it?
- What features are missing? (listen for repeated requests)
- Do users upgrade to Premium for the AI, or is Basic sufficient?
- How fast does vendor data go stale?

### Potential features (prioritize based on feedback)

#### User Profiles & Preferences
- Travel style, budget range, interests, group size
- Enables personalized AI recommendations
- **Build when:** Multiple users report generic recommendations

#### Activity Reviews & Ratings
- User-submitted reviews after booking
- Builds trust beyond our curated intelligence
- Moderation queue in admin dashboard
- **Build when:** 50+ users, enough to generate meaningful reviews

#### Maps Integration
- Activity pins on an interactive map
- Route visualization for itineraries
- Distance calculations between activities
- API: Mapbox (cheaper) or Google Maps
- **Build when:** Users report difficulty understanding geography

#### Email Notifications
- Welcome email, itinerary saved, upgrade confirmation
- Weekly digest for saved itineraries (weather, price changes)
- Service: Resend or Postmark (developer-friendly, good deliverability)
- **Build when:** User retention needs improvement

#### Itinerary Templates
- Pre-built itineraries: "3-Day Adventure", "7-Day Family", "Romantic Getaway"
- Reduce blank-page anxiety for new users
- **Build when:** Users struggle to start from scratch

#### Admin Dashboard
- Vendor CRUD with intelligence editing
- Activity management with image upload
- User management and purchase history
- Data quality metrics
- **Build when:** Managing 30+ vendors becomes unwieldy

---

## Phase 3: Data Pipeline & Automation (3-6 Months)

### Goal: Scale to 100+ Vendors Without Manual Work

> **DO NOT BUILD THIS UNTIL:**
> - You have 50+ active users
> - Manual vendor research takes >5 hours/week
> - You've validated which data matters most to users
> - You have revenue to justify API costs

### Why this phase exists

Manual vendor research doesn't scale. Prices change, new tours launch, operators
close. With 11 vendors it's manageable. With 100+ across multiple Caribbean
destinations, you need automation.

### Five-layer pipeline architecture

```
1. DISCOVER  -- Google Places API text search for tour operators
       |
2. FETCH     -- Scrape vendor websites (homepage, tours, contact, booking)
       |
3. EXTRACT   -- Parse HTML into structured fields (deterministic first, LLM fallback)
       |
4. REVIEW    -- Route low-confidence results to human admin queue
       |
5. PUBLISH   -- Merge approved data into providers table, schedule re-enrichment
```

### New database tables needed

| Table | Purpose |
|-------|---------|
| `vendor_sources` | Raw data provenance — what was fetched, when, from where |
| `vendor_enrichments` | Versioned extraction results — compare quality over time |
| `review_tasks` | Human QA queue for uncertain enrichments |
| `enrichment_jobs` | Job queue for pipeline orchestration (status, retries, errors) |

### Pipeline scripts (one per stage)

| Script | Input | Output | API Cost |
|--------|-------|--------|----------|
| `01_seed_from_google_places.ts` | Category search queries | Draft vendor records | $32/1K requests |
| `02_fetch_vendor_website.ts` | Vendor URL | Raw HTML in vendor_sources | Free (direct fetch) |
| `03_extract_vendor_fields.ts` | Raw HTML | Structured data in enrichments | Free or LLM cost |
| `04_enrich_with_google_details.ts` | google_place_id | Validated phone, rating, hours | $17/1K requests |
| `05_enrich_social_profiles.ts` | Vendor name/URL | Social metadata (optional) | Free if manual |
| `06_build_booking_intel.ts` | All enrichment data | Actionable booking intelligence | LLM cost |
| `07_queue_for_review.ts` | Enrichment records | Review tasks for admin | Free |
| `08_publish_vendor.ts` | Approved vendor + enrichment | Published provider row | Free |
| `09_schedule_refresh.ts` | All published vendors | New enrichment jobs for stale data | Free |

### Cost estimate for 100 vendors

- Initial discovery: ~$5
- Place details enrichment: ~$2
- Monthly refresh: ~$2
- **Total Year 1: ~$30-50** (negligible)

### Implementation timeline

- **Month 1:** Schema + Google Places discovery + website scraper + field extractor
- **Month 2:** Booking intel generator + review queue + publisher + basic admin UI
- **Month 3:** Scheduler + social enrichment (optional) + admin dashboard polish

### Success metrics

- 80%+ vendors at confidence > 0.80
- <10% vendors stuck in review queue > 7 days
- 95%+ enrichment jobs complete successfully
- 90%+ vendors refreshed within last 30 days

---

## Future Vision (6-12 Months)

### Multi-Destination Expansion
- Expand beyond Aruba to Curacao, Bonaire, St. Lucia
- Destination switcher in UI
- Shared pipeline infrastructure, destination-specific configs
- **Prerequisite:** Proven model in Aruba with paying users

### Vendor Partnerships & Direct Booking
- Real-time availability checks via vendor APIs
- Book directly through Aurelion (commission model)
- Revenue share with vendors who integrate
- **Prerequisite:** Significant booking volume to justify vendor integration work

### Advanced AI Features
- Personalized itinerary auto-generation based on preferences
- Budget optimizer ("fit this itinerary under $500")
- Weather-aware recommendations (integrate forecast API)
- Group trip planning (multiple users collaborating on one itinerary)

### Mobile App
- React Native (share business logic with web)
- Offline itinerary access (critical for travelers without data)
- Push notifications (price drops, weather alerts)
- GPS-based activity suggestions ("you're near Fisherman's Huts — kitesurfing conditions are ideal today")

### B2B Product
- White-label for travel agencies
- Hotel concierge dashboard
- API access for partners (affiliate program)
- **Prerequisite:** Proven B2C model first

---

## Deferred Ideas (Good But Not Now)

### User-Generated Content
- Trip photos, blogs, forums, social features
- **Why deferred:** Need critical mass of users. UGC with 10 users is empty and sad.

### Direct Booking Integration
- Payment processing for vendor tours through Aurelion
- **Why deferred:** Requires vendor partnerships, escrow handling, refund policies,
  and significant legal/compliance work. Manual booking referral works for MVP.

### Internationalization
- Multi-language (Dutch, Spanish, Papiamento), currency conversion
- **Why deferred:** English/USD market is primary. Aruba is heavily English-speaking for tourism.

### Loyalty Program
- Points for bookings, referral rewards, tier benefits
- **Why deferred:** Need proven business model and repeat users first.

### Price Tracking
- Historical price trends, "best time to book" analysis
- **Why deferred:** Need 6+ months of data before trends are meaningful.

---

## Technical Debt Log

### Pre-Launch (Must Fix)

| Issue | Impact | Fix | Effort |
|-------|--------|-----|--------|
| No API rate limiting | Could be abused | Add `express-rate-limit` | 1 day |
| No error tracking | Can't debug production issues | Integrate Sentry | 2 days |
| Generic error messages | Poor UX on failures | Improve error handling + user-facing messages | 3 days |
| No automated tests | Risky deployments | Start with critical path integration tests (Vitest) | Ongoing |

### Post-Launch (Can Wait)

| Issue | Impact | Fix | Effort |
|-------|--------|-----|--------|
| No image CDN | Slower page loads | Integrate Cloudinary or Imgix | 2-3 days |
| Session management basic | No "remember me", no timeout | Add session expiry + refresh | 2-3 days |
| N+1 queries in itinerary detail | Slow for large itineraries | Use Drizzle relations / JOIN | 1 day |
| No DB foreign key constraints | Data integrity relies on app code | Add FK constraints + cascade rules | 1 day |
| `@hookform/resolvers` Zod compat | `as any` cast on zodResolver | Upgrade to `@hookform/resolvers@5` | 1 hour |
| Old seed-activities.ts still exists | Confusing — references fictional vendors | Delete the file, keep seed-real-activities.ts only | 5 min |

---

## Decision Log

### 2026-04-04: Session Auth Over OAuth
**Decision:** Use session-based auth with bcryptjs, not OAuth.
**Rationale:** Simpler to implement, no external dependencies, users prefer
email/password for travel planning (not every app needs "Sign in with Google").
**Alternatives considered:** OAuth (Google, Facebook) — deferred to Phase 2 if users request it.

### 2026-04-04: Drizzle ORM Over Prisma
**Decision:** Use Drizzle ORM for all database access.
**Rationale:** Better TypeScript integration (types inferred from schema, not generated),
lighter weight (no binary engine), SQL-first philosophy aligns with team preference.
**Alternatives considered:** Prisma (more popular, heavier), raw SQL (more control, no type safety).

### 2026-04-04: OpenAI gpt-4o-mini for Concierge
**Decision:** Use gpt-4o-mini, not a larger model.
**Rationale:** $0.15/1M input tokens vs $2.50 for gpt-4-turbo. For a concierge that
recommends from a small curated database (not open-ended reasoning), the smaller model
is more than sufficient. 800 max tokens keeps responses concise.
**Alternatives considered:** gpt-4-turbo (better but 17x cost), Claude (considered, may revisit).

### 2026-04-04: Supabase Over Self-Hosted PostgreSQL
**Decision:** Use Supabase managed PostgreSQL.
**Rationale:** Free tier generous for MVP, automatic backups, easy connection pooling,
no DevOps overhead. The app uses raw PostgreSQL (Drizzle + pg) so there's zero Supabase
lock-in — we can migrate to any Postgres host by changing `DATABASE_URL`.
**Alternatives considered:** Railway (good but paid), AWS RDS (overkill for MVP).

### 2026-04-04: Monorepo with pnpm Workspaces
**Decision:** Single monorepo with pnpm workspaces.
**Rationale:** Shared TypeScript types between frontend/backend/DB, single `pnpm install`,
easier to onboard developers, single deploy. OpenAPI spec -> Orval codegen -> shared types
requires monorepo to work properly.
**Alternatives considered:** Separate repos (more isolation but type sharing becomes painful).

### 2026-04-05: Real Data Only — No Fabricated Vendors
**Decision:** Delete all fictional vendors and activities, seed only verified real data.
**Rationale:** The platform's value proposition is trust ("we did the research"). Seeding
with fake data undermines that promise and creates maintenance burden when real data
doesn't match. We verified all 5 original providers were fictional (dead websites, zero
search results) and replaced them with 11 real, web-scraped vendors.
**Process:** Verified each original provider's website (4 dead, 1 redirect to parked page),
searched for business names (zero results for all 5), deleted all, scraped real vendors.

### 2026-04-05: Per-Itinerary Pricing Over Subscription
**Decision:** One-time purchase per itinerary ($9.99 Basic / $49.99 Premium).
**Rationale:** Travelers plan one trip at a time. Subscriptions create churn and feel
wrong for infrequent use. Per-itinerary aligns with user mental model and eliminates
the "am I getting my money's worth?" anxiety of subscriptions.
**Alternative considered:** Monthly subscription ($4.99/mo) — deferred, may A/B test later.

### 2026-04-05: Defer Data Pipeline to Phase 3
**Decision:** Manual curation for MVP, automated pipeline later.
**Rationale:** 11 high-quality vendors with deep intelligence > 100 vendors with shallow data.
The pipeline is a 3-month engineering effort that should only be justified by user volume
(50+ active users) and research time burden (5+ hours/week). Manual curation is the moat
for now — it's what makes us better than a Google search.

### 2026-04-05: Lazy-Loading AI Architecture Over Monolithic System Prompt
**Decision:** Feed vendor intelligence on-demand via function-calling tools instead of
packing everything into the system prompt.
**Rationale:** The original monolithic prompt was ~10,550 tokens with all vendor data
embedded. The lazy-loading Tier 1 prompt is ~3,700 tokens — 65% smaller. Vendor details
are fetched via `get_vendor_details` tool only when the conversation needs them.
This reduces cost per message, avoids context window bloat, and keeps responses focused.
**Trade-off:** Slightly slower first response when vendor data is needed (extra tool call
round-trip), but much cheaper per conversation.

### 2026-04-05: AI-Generated Activity Images Over Stock Photos
**Decision:** Use fal.ai FLUX to generate activity-specific images rather than generic
stock photos or vendor-scraped images.
**Rationale:** Vendor website images have unclear licensing and may be hotlink-blocked.
Stock photos are generic and don't match specific tour offerings. AI-generated images
can be prompted to match the actual vessel type, activity, and setting. Each ocean
activity gets a visually distinct image (catamaran, pirate schooner, glass-bottom boat,
champagne brunch, etc.) rather than sharing generic "snorkeling" stock photos.
**Constraint:** Images must accurately represent the activity — never show a yacht when
the tour uses a catamaran, never show an empty beach when it's a group tour.

---

## Appendix

### Key File Locations

```
AURELION/
  .env                          # Environment variables (gitignored)
  .env.example                  # Documented env var template
  dev.bat                       # Windows dev launcher script
  ROADMAP.md                    # This file
  
  lib/
    db/
      src/schema/               # All 8 table schemas (heavily annotated)
      src/index.ts              # DB connection singleton
      drizzle.config.ts         # Drizzle Kit push config
    api-spec/
      openapi.yaml              # Single source of truth for API contract
      orval.config.ts           # Codegen config (React Query + Zod)
    api-client-react/
      src/generated/api.ts      # Generated React Query hooks
      src/custom-fetch.ts       # Fetch wrapper for API calls
    api-zod/
      src/generated/api.ts      # Generated Zod validation schemas
  
  artifacts/
    api-server/
      src/index.ts              # Express server entry point
      src/app.ts                # Middleware pipeline
      src/routes/               # All API route handlers (7 files, 31 endpoints)
      src/lib/auth.ts           # Password hashing + session checks
      src/lib/entitlements.ts   # Tier-based access control
      src/lib/logger.ts         # Pino logger config
      src/lib/ai-concierge/     # AI tools, compression, prompt assembly
      src/scripts/              # Seed scripts
      src/types/                # express-session augmentation
      build.mjs                 # esbuild bundler config
    aurelion/
      src/App.tsx               # Router + providers
      src/pages/                # 13 page components
      src/components/layout/    # Navbar, Footer, MainLayout
      src/components/ui/        # 56 shadcn/ui components + PremiumLock, breadcrumbs
      src/lib/                  # utils, image-url, pdf-export
      public/activities/        # 19 activity hero images (13 PNG + 6 AI-generated JPG)
      src/hooks/                # use-mobile, use-toast
      vite.config.ts            # Vite dev server + proxy config
```

### Useful Commands

```bash
# Start development (both servers)
dev.bat                         # Windows: double-click or run from terminal

# Or start manually:
cd artifacts/api-server && node ./build.mjs && node --env-file=../../.env --enable-source-maps ./dist/index.mjs
cd artifacts/aurelion && pnpm run dev

# Database
pnpm --filter @workspace/db run push              # Push schema to Supabase
pnpm --filter @workspace/db run push-force         # Force push (destructive)

# Seeding
pnpm --filter @workspace/api-server run seed:vendors     # 11 real vendors + intelligence
pnpm --filter @workspace/api-server run seed:activities   # 15 real activities

# Type checking
pnpm run typecheck:libs                                   # Check shared libs
pnpm -r --filter "./artifacts/**" --if-present run typecheck  # Check apps

# API codegen (after editing openapi.yaml)
pnpm --filter @workspace/api-spec run codegen
```

### Environment Variables

```bash
# === REQUIRED ===
DATABASE_URL=postgresql://...    # Supabase PostgreSQL connection string

# === OPTIONAL (defaults shown) ===
# PORT=3001                      # API server port (default: 3001)
# SESSION_SECRET=dev-default     # Session cookie signing (default: dev fallback)
# BASE_PATH=/                    # Vite base path (default: /)
# LOG_LEVEL=info                 # Pino log level (default: info)

# === STRIPE (mock mode if absent) ===
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# === OPENAI (mock responses if absent) ===
# OPENAI_API_KEY=sk-...

# === PHASE 3 ===
# GOOGLE_PLACES_API_KEY=AIza...  # For vendor discovery pipeline
```

---

**This document is a living spec. Update it as features ship, users give feedback, and the vision evolves.**
