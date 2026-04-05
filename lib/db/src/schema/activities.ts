import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * @table activities
 *
 * Core content table for the AURELION platform. Stores the curated catalog of
 * Aruba adventure-tourism activities — currently 15 activities spanning 6 categories.
 * This is the primary table that end-users browse, filter, and add to itineraries.
 *
 * **Business context:**
 * Activities are the central product of AURELION. Each row represents a bookable
 * adventure experience in Aruba with tiered content gating:
 * - **Free** users see: title, description, category, difficulty, price range, location, image, tags.
 * - **Basic** ($9.99) users additionally see: `basicBookingGuide`.
 * - **Premium** ($49.99) users additionally see: `premiumBookingGuide`, `insiderTips`.
 *
 * **Categories** (6 total):
 * - "Cliff & Vertical Adventures" — rock climbing, rappelling
 * - "Off-Road Expeditions" — jeep tours, ATV rides
 * - "Ocean Exploration" — snorkeling, scuba, shipwreck dives
 * - "Wild Terrain & Natural Wonders" — cave exploration, natural pool hikes
 * - "Water & Wind Sports" — kitesurfing, windsurfing, paddleboarding
 * - "Scenic Riding" — horseback riding, e-bike tours
 *
 * **Relationships:**
 * - Soft-linked to `providers` via `provider_id` (no FK constraint; join in app code).
 * - Referenced by `itinerary_items.activity_id` (no FK constraint).
 * - Provider contact fields are denormalized into this table for fast reads on the
 *   activity detail page, avoiding a join to the providers table.
 *
 * **Indexing notes:**
 * - Primary key on `id`.
 * - Consider adding indexes on `category` and `is_featured` for the most common query patterns.
 */
export const activitiesTable = pgTable("activities", {
  /** @param id — Auto-incrementing primary key. Referenced by `itinerary_items.activity_id`. */
  id: serial("id").primaryKey(),

  /**
   * @param providerId — Soft foreign key to `providers.id`.
   * Links this activity to the tour operator that runs it.
   * No FK constraint at the DB level — integrity is maintained in application code.
   * Nullable because some activities were seeded before the providers table existed.
   */
  providerId: integer("provider_id"),

  /** @param title — Display name of the activity (e.g., "Arikok National Park Jeep Safari"). Always required. Shown in cards, search results, and itinerary items. */
  title: text("title").notNull(),

  /** @param description — Full marketing description of the activity. Visible to all tiers including free users. Rendered as rich text on the activity detail page. */
  description: text("description").notNull(),

  /**
   * @param category — Activity category for filtering and grouping.
   * One of: "Cliff & Vertical Adventures", "Off-Road Expeditions", "Ocean Exploration",
   * "Wild Terrain & Natural Wonders", "Water & Wind Sports", "Scenic Riding".
   * Used by the category filter on the /activities page.
   */
  category: text("category").notNull(),

  /**
   * @param difficulty — Difficulty level for the activity.
   * Common values: "easy", "moderate", "challenging", "extreme".
   * Defaults to "moderate". Displayed as a badge on activity cards.
   */
  difficulty: text("difficulty").notNull().default("moderate"),

  /**
   * @param durationMinutes — Estimated duration of the activity in minutes.
   * Defaults to 120 (2 hours). Used for itinerary time-slot planning
   * and displayed as "~2 hours" on activity cards.
   */
  durationMinutes: integer("duration_minutes").notNull().default(120),

  /**
   * @param priceLow — Lower bound of the price range in USD (e.g., 75.00 for "$75-$150").
   * Stored as a float, NOT in cents. Defaults to 0. Displayed together with `priceHigh`
   * as a range on activity cards (e.g., "$75 – $150").
   */
  priceLow: real("price_low").notNull().default(0),

  /**
   * @param priceHigh — Upper bound of the price range in USD (e.g., 150.00 for "$75-$150").
   * Stored as a float, NOT in cents. Defaults to 0. When equal to `priceLow`,
   * the UI shows a single price instead of a range.
   */
  priceHigh: real("price_high").notNull().default(0),

  /**
   * @param location — Where in Aruba the activity takes place (e.g., "Arikok National Park",
   * "Palm Beach", "Natural Pool"). Defaults to "Aruba". Used for map pins and search filtering.
   */
  location: text("location").notNull().default("Aruba"),

  /** @param imageUrl — URL to the hero image for this activity. Nullable. Displayed on activity cards and the detail page header. Typically hosted on the CDN. */
  imageUrl: text("image_url"),

  /** @param reviewSummary — AI-generated or manually curated summary of customer reviews. Nullable. Visible to all tiers. */
  reviewSummary: text("review_summary"),

  /** @param whatToBring — Packing list / gear recommendations (e.g., "Reef-safe sunscreen, water shoes"). Nullable. Visible to all tiers. */
  whatToBring: text("what_to_bring"),

  /** @param whatToExpect — Step-by-step overview of what happens during the activity. Nullable. Visible to all tiers. */
  whatToExpect: text("what_to_expect"),

  /**
   * @param basicBookingGuide — Booking instructions unlocked at the Basic tier ($9.99).
   * Contains: how to book, recommended booking lead time, cancellation policy notes.
   * Nullable (not all activities have this content yet). Gated in the API response
   * serializer — free users receive `null` even if the column has data.
   */
  basicBookingGuide: text("basic_booking_guide"),

  /**
   * @param premiumBookingGuide — Enhanced booking guide unlocked at the Premium tier ($49.99).
   * Contains: direct provider contact info, best-price tips, VIP upgrade options.
   * Nullable. Gated — only returned to Premium users or admins.
   */
  premiumBookingGuide: text("premium_booking_guide"),

  /**
   * @param insiderTips — Curated local-knowledge tips unlocked at the Premium tier ($49.99).
   * Contains: best times to avoid crowds, hidden photo spots, local secrets.
   * Nullable. Gated — only returned to Premium users or admins.
   */
  insiderTips: text("insider_tips"),

  /** @param warnings — Safety warnings or health advisories (e.g., "Not recommended for those with vertigo"). Nullable. Visible to all tiers. */
  warnings: text("warnings"),

  /** @param bestTimeOfDay — Recommended time of day for the activity (e.g., "Early morning", "Late afternoon"). Nullable. Used by the itinerary auto-scheduler. */
  bestTimeOfDay: text("best_time_of_day"),

  /**
   * @param tags — PostgreSQL text array used for filtering and search.
   * Example values: `["snorkeling", "family-friendly", "beginner"]`.
   * Defaults to an empty array. Queried with Postgres array operators
   * (e.g., `@>` / `&&`) on the `/activities` list endpoint.
   */
  tags: text("tags").array().notNull().default([]),

  /**
   * @param providerName — Denormalized copy of `providers.name`.
   * Stored here to avoid a join on the activity-list and detail endpoints.
   * Nullable — null when no provider is linked. Should be kept in sync
   * with the source providers row (currently manual; no trigger).
   */
  providerName: text("provider_name"),

  /** @param providerWebsite — Denormalized copy of `providers.website_url`. Nullable. See `providerName` for rationale. */
  providerWebsite: text("provider_website"),

  /** @param providerPhone — Denormalized copy of `providers.phone`. Nullable. See `providerName` for rationale. */
  providerPhone: text("provider_phone"),

  /** @param providerEmail — Denormalized copy of `providers.email`. Nullable. See `providerName` for rationale. */
  providerEmail: text("provider_email"),

  /** @param providerWhatsapp — Denormalized copy of `providers.whatsapp`. Nullable. See `providerName` for rationale. */
  providerWhatsapp: text("provider_whatsapp"),

  /**
   * @param isFeatured — Boolean-as-integer flag indicating whether this activity
   * appears on the homepage featured carousel.
   * Values: `0` (not featured) | `1` (featured).
   * The `/activities/featured` endpoint returns up to 6 rows where `is_featured = 1`.
   * Stored as integer because Drizzle/Postgres boolean mapping was avoided
   * for SQLite compatibility during early development.
   */
  isFeatured: integer("is_featured").notNull().default(0),

  /**
   * @param createdAt — Timestamp (with timezone) of when the activity was added to the catalog.
   * Defaults to `now()` at insert time.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Zod schema for inserting a new activity row.
 * Omits `id` (auto-generated) and `createdAt` (server-default).
 * Used in the admin activity-creation endpoint and the seed script.
 *
 * @example
 * ```ts
 * const body = insertActivitySchema.parse(req.body);
 * await db.insert(activitiesTable).values(body);
 * ```
 */
export const insertActivitySchema = createInsertSchema(activitiesTable).omit({
  id: true,
  createdAt: true,
});

/** TypeScript type for a validated activity insert payload. */
export type InsertActivity = z.infer<typeof insertActivitySchema>;

/** TypeScript type for a full activity row as returned by a `SELECT *` query. */
export type Activity = typeof activitiesTable.$inferSelect;
