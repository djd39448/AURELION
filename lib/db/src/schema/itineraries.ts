import { pgTable, text, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * @table itineraries
 *
 * Stores user-created trip plans for Aruba adventures. An itinerary is a multi-day
 * container that holds one or more `itinerary_items`, each linking to an activity
 * at a specific day and time slot.
 *
 * **Business context:**
 * Itinerary creation is available to all tiers, but export and sharing features
 * are gated by `tierType`:
 * - FREE — can create/edit draft itineraries, but cannot export or share.
 * - BASIC ($9.99) — can export itineraries as PDF / shareable link.
 * - PREMIUM ($49.99) — full export + AI concierge chat attached to the itinerary.
 *
 * The `tierType` is set when the user completes a Stripe purchase (see purchases table)
 * and determines what the user can do with THIS specific itinerary, independent of
 * the user's account-level tier.
 *
 * **Relationships:**
 * - Belongs to `users` via `user_id` (no FK constraint; enforced in app code).
 * - Has many `itinerary_items` via `itinerary_items.itinerary_id`.
 * - Optionally linked from `purchases.itinerary_id` (the purchase that upgraded this itinerary).
 * - Optionally linked from `chat_sessions.itinerary_id` (AI concierge conversations about this trip).
 *
 * **Indexing notes:**
 * - Primary key on `id`.
 * - Consider adding an index on `user_id` for the "my itineraries" list query.
 */
export const itinerariesTable = pgTable("itineraries", {
  /** @param id — Auto-incrementing primary key. Referenced by `itinerary_items.itinerary_id`, `purchases.itinerary_id`, and `chat_sessions.itinerary_id`. */
  id: serial("id").primaryKey(),

  /**
   * @param userId — Soft foreign key to `users.id`.
   * Identifies the user who created this itinerary. No FK constraint at DB level.
   * Used to scope queries in the "my itineraries" list endpoint.
   */
  userId: integer("user_id").notNull(),

  /** @param title — User-provided name for the trip (e.g., "Aruba Anniversary Trip 2026"). Always required. Shown in the itinerary list and header. */
  title: text("title").notNull(),

  /**
   * @param totalDays — Number of days the trip spans.
   * Defaults to 3. Constrains valid `dayNumber` values in `itinerary_items`
   * (items must have `dayNumber` between 1 and `totalDays`).
   */
  totalDays: integer("total_days").notNull().default(3),

  /**
   * @param tierType — Content/feature tier for this specific itinerary.
   * Valid values: `"FREE"` | `"BASIC"` | `"PREMIUM"`.
   * Defaults to `"FREE"`. Upgraded to `"BASIC"` or `"PREMIUM"` when a corresponding
   * purchase is completed via Stripe webhook. Controls export eligibility and
   * whether the AI concierge can be attached to this itinerary.
   * Note: uses UPPER_CASE values (unlike `users.tier` which is lower_case).
   */
  tierType: text("tier_type").notNull().default("FREE"),

  /**
   * @param status — Publication state of the itinerary.
   * Valid values: `"draft"` | `"published"`.
   * Defaults to `"draft"`. Published itineraries are shareable via public link
   * (Basic+ tiers only). Draft itineraries are only visible to the owner.
   */
  status: text("status").notNull().default("draft"),

  /**
   * @param createdAt — Timestamp (with timezone) of when the itinerary was first created.
   * Defaults to `now()` at insert time.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  /**
   * @param updatedAt — Timestamp (with timezone) of the last modification.
   * Defaults to `now()` at insert time. Automatically updated via Drizzle's
   * `$onUpdate` hook — every UPDATE statement on this row sets `updatedAt`
   * to the current time. Used for "last edited" display and sort-by-recent.
   */
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),

  /**
   * @param shareToken — UUID token for the public share link.
   * Nullable — only set when the user explicitly generates a share link.
   * Unique constraint ensures tokens are not reused across itineraries.
   * Generated server-side via `crypto.randomUUID()`.
   */
  shareToken: text("share_token").unique(),
});

/**
 * @table itinerary_items
 *
 * Join/detail table linking activities to itineraries with scheduling info.
 * Each row represents one activity placed into a specific day and time slot
 * within a parent itinerary.
 *
 * **Business context:**
 * Users drag-and-drop activities into their itinerary grid, which has rows
 * for each day (1..totalDays) and columns for each time slot. The combination
 * of `dayNumber` + `timeSlot` positions the activity on the visual planner.
 *
 * **Relationships:**
 * - Belongs to `itineraries` via `itinerary_id` (no FK constraint).
 * - References `activities` via `activity_id` (no FK constraint).
 *
 * **Indexing notes:**
 * - Primary key on `id`.
 * - Consider a composite index on `(itinerary_id, day_number, time_slot)` for
 *   the itinerary-detail query that fetches all items ordered by day and slot.
 */
export const itineraryItemsTable = pgTable("itinerary_items", {
  /** @param id — Auto-incrementing primary key. */
  id: serial("id").primaryKey(),

  /**
   * @param itineraryId — Soft foreign key to `itineraries.id`.
   * Identifies which trip plan this item belongs to. Always required.
   */
  itineraryId: integer("itinerary_id").notNull(),

  /**
   * @param activityId — Soft foreign key to `activities.id`.
   * Identifies which adventure activity is placed in this slot. Always required.
   */
  activityId: integer("activity_id").notNull(),

  /**
   * @param dayNumber — Which day of the trip this activity is scheduled for.
   * 1-indexed (day 1 is the first day). Must be between 1 and the parent
   * itinerary's `totalDays`. Validated in application code.
   */
  dayNumber: integer("day_number").notNull(),

  /**
   * @param timeSlot — Time-of-day slot for scheduling the activity.
   * Valid values: `"morning"` | `"afternoon"` | `"evening"`.
   * Defaults to `"morning"`. Used to organize the daily activity grid
   * in the itinerary planner UI.
   */
  timeSlot: text("time_slot").notNull().default("morning"),

  /**
   * @param notes — Optional free-text notes the user can attach to this item
   * (e.g., "Book the 9am slot", "Bring reef shoes"). Nullable.
   * Displayed below the activity card in the itinerary detail view.
   */
  notes: text("notes"),

  /**
   * @param createdAt — Timestamp (with timezone) of when this item was added to the itinerary.
   * Defaults to `now()` at insert time.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Zod schema for inserting a new itinerary row.
 * Omits `id` (auto-generated), `createdAt` and `updatedAt` (server-defaults).
 * Used in the itinerary-creation endpoint.
 *
 * @example
 * ```ts
 * const body = insertItinerarySchema.parse(req.body);
 * await db.insert(itinerariesTable).values(body);
 * ```
 */
export const insertItinerarySchema = createInsertSchema(itinerariesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Zod schema for inserting a new itinerary item row.
 * Omits `id` (auto-generated) and `createdAt` (server-default).
 * Used when adding an activity to an itinerary.
 *
 * @example
 * ```ts
 * const item = insertItineraryItemSchema.parse(req.body);
 * await db.insert(itineraryItemsTable).values(item);
 * ```
 */
export const insertItineraryItemSchema = createInsertSchema(itineraryItemsTable).omit({
  id: true,
  createdAt: true,
});

/** TypeScript type for a validated itinerary insert payload. */
export type InsertItinerary = z.infer<typeof insertItinerarySchema>;

/** TypeScript type for a full itinerary row as returned by a `SELECT *` query. */
export type Itinerary = typeof itinerariesTable.$inferSelect;

/** TypeScript type for a validated itinerary-item insert payload. */
export type InsertItineraryItem = z.infer<typeof insertItineraryItemSchema>;

/** TypeScript type for a full itinerary-item row as returned by a `SELECT *` query. */
export type ItineraryItem = typeof itineraryItemsTable.$inferSelect;
