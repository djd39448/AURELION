import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * @enum relationshipStatusEnum
 * Tracks the relationship progression between AURELION and a vendor contact.
 * - cold: No outreach has been made yet
 * - contacted: At least one outreach email has been sent
 * - responded: The vendor has replied
 * - active_partner: A formal partnership is in place
 */
export const relationshipStatusEnum = pgEnum("relationship_status", [
  "cold",
  "contacted",
  "responded",
  "active_partner",
]);

/**
 * @table vendor_contacts
 *
 * CRM table for tracking AURELION's outreach contacts at Aruba tour operators.
 * Each row represents a contact person (or the vendor entity itself when no
 * specific contact is known) at a provider in the `providers` table.
 *
 * **Business context:**
 * The Vendor Relations agent uses this table to manage outreach campaigns,
 * track relationship progression, and avoid duplicate contact attempts.
 *
 * **Relationships:**
 * - Soft FK to `providers.id` via `provider_id`. No DB-level constraint
 *   (consistent with the rest of the schema).
 *
 * **Auth:**
 * - Readable and writable only via ADMIN_SECRET-protected endpoints.
 */
export const vendorContactsTable = pgTable("vendor_contacts", {
  /** @param id — Auto-incrementing primary key. */
  id: serial("id").primaryKey(),

  /**
   * @param providerId — References `providers.id`. Identifies which Aruba
   * tour operator this contact belongs to.
   */
  providerId: integer("provider_id").notNull(),

  /** @param contactName — Full name of the individual contact. Nullable when unknown. */
  contactName: text("contact_name"),

  /** @param contactEmail — Email address for this contact. Nullable. */
  contactEmail: text("contact_email"),

  /** @param contactPhone — Phone number for this contact. Nullable. */
  contactPhone: text("contact_phone"),

  /**
   * @param relationshipStatus — Current stage of the outreach relationship.
   * Defaults to "cold" for all newly created contacts.
   */
  relationshipStatus: relationshipStatusEnum("relationship_status").notNull().default("cold"),

  /**
   * @param lastContactedAt — Timestamp of the most recent outbound message.
   * Null until the first outreach is sent.
   */
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),

  /**
   * @param lastResponseAt — Timestamp of the most recent inbound reply.
   * Null until the vendor responds.
   */
  lastResponseAt: timestamp("last_response_at", { withTimezone: true }),

  /** @param notes — Free-text notes for the Vendor Relations agent. Nullable. */
  notes: text("notes"),

  /** @param createdAt — Row creation timestamp. Defaults to now(). */
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  /** @param updatedAt — Last-updated timestamp. Must be set manually on update. */
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Zod schema for inserting a new vendor contact.
 * Omits `id`, `createdAt`, and `updatedAt` (server-managed).
 */
export const insertVendorContactSchema = createInsertSchema(vendorContactsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/** TypeScript type for a validated vendor contact insert payload. */
export type InsertVendorContact = z.infer<typeof insertVendorContactSchema>;

/** TypeScript type for a full vendor_contacts row as returned by SELECT *. */
export type VendorContact = typeof vendorContactsTable.$inferSelect;
