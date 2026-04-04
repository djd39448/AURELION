# AURELION — Luxury Aruba Adventure Planning Platform

## Overview

AURELION is a production-quality luxury adventure planning platform for Aruba. It provides curated experiences, structured itineraries, booking intelligence, and AI-powered planning assistance.

**Tagline:** Precision-crafted adventure itineraries for Aruba.

## Architecture

pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (Tailwind CSS, Wouter, shadcn/ui, Framer Motion)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: Session-based (bcryptjs, express-session)
- **Payments**: Stripe
- **AI**: OpenAI (gpt-4o-mini for AI concierge)
- **Build**: esbuild (CJS bundle)

## Business Model

- **Free Tier**: Browse activities, search/filter, build rough itinerary
- **Basic Tier ($9.99)**: Export itinerary, day-by-day structure, provider info
- **Premium Tier ($49.99)**: AI concierge chat, booking intelligence, insider tips, optimization

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/aurelion run dev` — run frontend locally

## Pages

### Public
- `/` — Homepage with hero, featured activities, categories
- `/activities` — Activity directory with search/filter
- `/activities/:id` — Activity detail with premium locks
- `/pricing` — Three-tier pricing page
- `/about` — Brand story

### Auth
- `/auth/login` — Login
- `/auth/register` — Registration

### User (Authenticated)
- `/dashboard` — User dashboard with itinerary overview
- `/itineraries/new` — Create new itinerary
- `/itineraries/:id` — Itinerary builder with day/time slot management
- `/chat/:sessionId` — AI Concierge chat (Premium only)

### Admin
- `/admin` — Admin dashboard for activity management and URL ingestion

## Database Schema

Tables: `users`, `providers`, `activities`, `itineraries`, `itinerary_items`, `purchases`, `chat_sessions`, `chat_messages`

## Experience Categories

1. Cliff & Vertical Adventures
2. Off-Road Expeditions
3. Ocean Exploration
4. Wild Terrain & Natural Wonders
5. Water & Wind Sports
6. Scenic Riding

## Artifacts

- `artifacts/aurelion` — React + Vite frontend (preview path: `/`)
- `artifacts/api-server` — Express API server (preview path: `/api`)

## Required Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `SESSION_SECRET` — Session signing secret
- `STRIPE_SECRET_KEY` — Stripe secret key (optional, mocked without it)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook secret (optional)
- `OPENAI_API_KEY` — OpenAI API key (optional, fallback response without it)
- `NEXT_PUBLIC_APP_URL` — Production URL for Stripe redirect URLs

## Seed Data

15 Aruba activities seeded across all 6 categories with full descriptions, pricing, booking guides, and provider information.
