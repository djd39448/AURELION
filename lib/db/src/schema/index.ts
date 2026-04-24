/**
 * @module schema
 *
 * Barrel export for the AURELION database schema layer.
 *
 * **Architecture overview:**
 * This module re-exports all Drizzle ORM table definitions, Zod insert schemas,
 * and inferred TypeScript types for the AURELION luxury Aruba adventure-tourism
 * platform. The schema is designed around a tiered pricing model
 * (Free / Basic $9.99 / Premium $49.99) that gates content and features.
 *
 * **Tables (6 total, across 6 modules):**
 *
 * 1. **users** — Authentication, authorization, and subscription tier tracking.
 *    Roles: "user" | "admin". Tiers: "free" | "basic" | "premium".
 *
 * 2. **providers** — Aruba tour operators and activity vendors, primarily
 *    ingested via web scraping with a confidence score for data quality.
 *
 * 3. **activities** — Core content catalog of 15 Aruba adventure activities
 *    across 6 categories, with tier-gated booking guides and insider tips.
 *    Provider contact info is denormalized here for fast reads.
 *
 * 4. **itineraries** + **itinerary_items** — User-created multi-day trip plans.
 *    Items link activities to day/time-slot positions. Itinerary-level `tierType`
 *    controls export and sharing eligibility.
 *
 * 5. **purchases** — Stripe payment records tracking checkout sessions from
 *    "pending" to "completed". Amounts stored in USD dollars (not cents).
 *
 * 6. **chat_sessions** + **chat_messages** — Premium-only AI concierge chat
 *    powered by OpenAI gpt-4o-mini. Sessions are optionally scoped to an itinerary
 *    for context-aware travel recommendations.
 *
 * **Design notes:**
 * - No foreign-key constraints are enforced at the database level. Referential
 *   integrity is maintained in application code. This was a deliberate choice
 *   to simplify migrations and allow flexible seeding during early development.
 * - All tables use `serial` primary keys and `timestamp with timezone` for
 *   `created_at` columns.
 * - Each module exports: a Drizzle table definition, a Zod insert schema
 *   (with `id` and `createdAt` omitted), and inferred TS types for insert
 *   and select operations.
 */

export * from "./users";
export * from "./providers";
export * from "./activities";
export * from "./itineraries";
export * from "./purchases";
export * from "./chat";
export * from "./user-memories";
export * from "./waitlist";
export * from "./vendor-contacts";
export * from "./vendor-outreach-log";
