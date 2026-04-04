import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull().default("moderate"),
  durationMinutes: integer("duration_minutes").notNull().default(120),
  priceLow: real("price_low").notNull().default(0),
  priceHigh: real("price_high").notNull().default(0),
  location: text("location").notNull().default("Aruba"),
  imageUrl: text("image_url"),
  reviewSummary: text("review_summary"),
  whatToBring: text("what_to_bring"),
  whatToExpect: text("what_to_expect"),
  basicBookingGuide: text("basic_booking_guide"),
  premiumBookingGuide: text("premium_booking_guide"),
  insiderTips: text("insider_tips"),
  warnings: text("warnings"),
  bestTimeOfDay: text("best_time_of_day"),
  tags: text("tags").array().notNull().default([]),
  providerName: text("provider_name"),
  providerWebsite: text("provider_website"),
  providerPhone: text("provider_phone"),
  providerEmail: text("provider_email"),
  providerWhatsapp: text("provider_whatsapp"),
  isFeatured: integer("is_featured").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activitiesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activitiesTable.$inferSelect;
