import { pgTable, text, serial, timestamp, real, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * @table providers
 *
 * Stores Aruba-based tour operators and activity vendors whose services are listed
 * on the AURELION platform. Provider data is primarily sourced through the admin
 * web-scraping ingest feature, though manual entry via the admin panel is also supported.
 *
 * **Business context:**
 * Each provider represents a real business in Aruba (e.g., a jeep-tour company,
 * a snorkeling outfit, a rock-climbing guide). Their contact details are surfaced
 * to paying users inside activity booking guides.
 *
 * **Relationships:**
 * - Soft-linked to `activities` via `activities.provider_id`. There is no formal
 *   FK constraint at the database level yet — the join is enforced in application code.
 * - Provider contact fields are also denormalized into the activities table
 *   (`providerName`, `providerWebsite`, `providerPhone`, `providerEmail`,
 *   `providerWhatsapp`) for fast reads on the activity detail page.
 *
 * **Indexing notes:**
 * - Primary key on `id`.
 * - Consider adding a unique index on `source_url` to prevent duplicate scrapes.
 */
export const providersTable = pgTable("providers", {
  /** @param id — Auto-incrementing primary key. Referenced by `activities.provider_id`. */
  id: serial("id").primaryKey(),

  /** @param name — Business name of the tour operator / vendor (e.g., "Aruba Surf & Paddle"). Always required. */
  name: text("name").notNull(),

  /** @param websiteUrl — Official website of the provider. Nullable — some smaller vendors only have social-media presence. Displayed in booking guides. */
  websiteUrl: text("website_url"),

  /** @param email — Provider's contact email for booking inquiries. Nullable. Shown in Basic+ booking guides. */
  email: text("email"),

  /** @param phone — Provider's phone number (typically Aruba country code +297). Nullable. Shown in booking guides. */
  phone: text("phone"),

  /** @param whatsapp — WhatsApp number for the provider. Many Aruba vendors prefer WhatsApp over email. Nullable. Shown in Premium booking guides. */
  whatsapp: text("whatsapp"),

  /** @param description — Free-text description of the provider's services and specialties. Nullable. Used in admin review during ingest. */
  description: text("description"),

  /**
   * @param confidenceScore — Data-quality score assigned during web-scraping ingest.
   * Range: 0.0 to 1.0 (float).
   * - 1.0 = high confidence; data verified or manually entered.
   * - < 0.5 = low confidence; admin should review before publishing.
   * Nullable — null means the score has not been computed (e.g., manual entry).
   */
  confidenceScore: real("confidence_score"),

  /**
   * @param sourceUrl — The URL from which this provider's information was originally scraped.
   * Used by admins to trace data provenance, re-scrape, or verify accuracy.
   * Nullable — null for manually entered providers.
   */
  sourceUrl: text("source_url"),

  /* -----------------------------------------------------------------------
   * BOOKING INTELLIGENCE FIELDS
   *
   * Populated by the vendor research/scraping pipeline (seed-vendors.ts).
   * These fields power the AI concierge's booking recommendations and are
   * surfaced in Premium tier booking guides.
   *
   * All intelligence fields are nullable — vendors that haven't been
   * researched yet will have null values and the AI concierge falls back
   * to generic advice.
   * ----------------------------------------------------------------------- */

  /**
   * @param bestBookingMethod — How to actually book with this vendor.
   * Scraped from their website. Examples: "Book online at website",
   * "WhatsApp only", "Call to reserve, pay on arrival".
   * Used by the AI concierge to give actionable booking instructions.
   */
  bestBookingMethod: text("best_booking_method"),

  /**
   * @param whenToBook — Timing intelligence for optimal booking.
   * Examples: "Book 3-5 days ahead in high season (Dec-Apr)",
   * "Same-day availability common in low season".
   * Derived from website availability info and review patterns.
   */
  whenToBook: text("when_to_book"),

  /**
   * @param whatToSay — Specific phrases or requests that improve the experience.
   * Examples: "Ask for guide Carlos for the best routes",
   * "Mention you want the extended coastal route".
   * Derived from positive review patterns and insider knowledge.
   */
  whatToSay: text("what_to_say"),

  /**
   * @param insiderTips — Array of actionable insider tips from review analysis.
   * Each tip is a complete, actionable sentence the AI concierge can relay.
   * Derived from 5-star review patterns and optimization opportunities
   * identified in negative reviews.
   */
  insiderTips: text("insider_tips").array(),

  /**
   * @param warnings — Array of important warnings or caveats.
   * Derived from negative review patterns and vendor policies.
   * Framed as optimization opportunities, not complaints.
   * Examples: ["Book morning tours to avoid afternoon heat", "Confirm pickup time day before"].
   */
  warnings: text("warnings").array(),

  /**
   * @param bookingConfidence — Quality score (0.00–1.00) reflecting how reliable
   * and well-documented this vendor's booking process is.
   * - 0.90+ = Verified online booking, responsive, well-reviewed
   * - 0.70–0.89 = Booking works but has friction points
   * - Below 0.70 = Limited info, unverified, or inconsistent reviews
   * Computed from: website quality, review volume, response patterns.
   */
  bookingConfidence: numeric("booking_confidence", { precision: 3, scale: 2 }),

  /**
   * @param intelligenceReport — Full prose research summary for the AI concierge.
   * Contains 2-4 paragraphs synthesizing all scraped data, review analysis,
   * and booking optimization insights. This is the primary context the AI
   * concierge uses when recommending this vendor.
   */
  intelligenceReport: text("intelligence_report"),

  /**
   * @param lastResearchedAt — Timestamp of when this vendor was last scraped/researched.
   * Used to identify stale intelligence that needs refreshing.
   * Null means the vendor has never been researched.
   */
  lastResearchedAt: timestamp("last_researched_at", { withTimezone: true }),

  /**
   * @param createdAt — Timestamp (with timezone) of when the provider record was created.
   * Defaults to `now()` at insert time.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Zod schema for inserting a new provider row.
 * Omits `id` (auto-generated) and `createdAt` (server-default).
 * Used in the admin provider-creation and web-scraper ingest endpoints.
 *
 * @example
 * ```ts
 * const data = insertProviderSchema.parse(scrapedProvider);
 * await db.insert(providersTable).values(data);
 * ```
 */
export const insertProviderSchema = createInsertSchema(providersTable).omit({
  id: true,
  createdAt: true,
});

/** TypeScript type for a validated provider insert payload. */
export type InsertProvider = z.infer<typeof insertProviderSchema>;

/** TypeScript type for a full provider row as returned by a `SELECT *` query. */
export type Provider = typeof providersTable.$inferSelect;
