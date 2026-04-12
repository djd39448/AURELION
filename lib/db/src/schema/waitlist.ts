import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * @table waitlist
 *
 * Stores email addresses collected from the pre-launch homepage banner.
 * Used for marketing outreach when AURELION goes fully public.
 */
export const waitlistTable = pgTable("waitlist", {
  /** @param id — Auto-incrementing primary key. */
  id: serial("id").primaryKey(),

  /**
   * @param email — Email address submitted via the homepage waitlist form.
   * Should be unique; duplicates are rejected at the API layer.
   */
  email: text("email").notNull().unique(),

  /**
   * @param source — Identifies where the signup originated (e.g. "homepage-banner").
   * Defaults to "homepage-banner" if omitted.
   */
  source: text("source").notNull().default("homepage-banner"),

  /**
   * @param createdAt — Timestamp of signup. Defaults to now().
   */
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWaitlistSchema = createInsertSchema(waitlistTable).omit({
  id: true,
  createdAt: true,
});

export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type Waitlist = typeof waitlistTable.$inferSelect;
