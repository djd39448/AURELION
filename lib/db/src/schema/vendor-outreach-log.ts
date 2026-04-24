import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * @enum outreachDirectionEnum
 * Direction of a vendor outreach communication.
 * - outbound: Sent by AURELION to the vendor
 * - inbound: Received from the vendor (reply or unsolicited contact)
 */
export const outreachDirectionEnum = pgEnum("outreach_direction", [
  "outbound",
  "inbound",
]);

/**
 * @table vendor_outreach_log
 *
 * Append-only log of all email communications between AURELION and Aruba
 * tour operators. Used by the Vendor Relations agent to reconstruct conversation
 * history and by admins to audit outreach activity.
 *
 * **Business context:**
 * Every email sent via Resend from `partnerships@aurelion.com` or received as
 * an inbound reply should be logged here. The `resend_message_id` field links
 * outbound entries back to Resend delivery records.
 *
 * **Relationships:**
 * - Soft FK to `providers.id` via `provider_id`. No DB-level constraint.
 *
 * **Auth:**
 * - Readable and writable only via ADMIN_SECRET-protected endpoints.
 */
export const vendorOutreachLogTable = pgTable("vendor_outreach_log", {
  /** @param id — Auto-incrementing primary key. */
  id: serial("id").primaryKey(),

  /**
   * @param providerId — References `providers.id`. Identifies which Aruba
   * tour operator this log entry is associated with.
   */
  providerId: integer("provider_id").notNull(),

  /**
   * @param direction — Whether this was an outbound send or an inbound reply.
   */
  direction: outreachDirectionEnum("direction").notNull(),

  /** @param subject — Email subject line. */
  subject: text("subject").notNull(),

  /** @param body — Full text/HTML body of the email. */
  body: text("body").notNull(),

  /**
   * @param sentAt — Timestamp when the email was sent or received.
   * Defaults to now() for outbound; may be set explicitly for inbound entries
   * parsed from a forwarded inbox.
   */
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),

  /**
   * @param resendMessageId — Resend API message ID returned after a successful
   * send. Null for inbound messages or if Resend was unavailable.
   * Format: `re_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   */
  resendMessageId: text("resend_message_id"),

  /** @param notes — Optional free-text annotation for the Vendor Relations agent. */
  notes: text("notes"),
});

/**
 * Zod schema for inserting a new outreach log entry.
 * Omits `id` (auto-generated). `sentAt` is optional — defaults to now().
 */
export const insertVendorOutreachLogSchema = createInsertSchema(vendorOutreachLogTable).omit({
  id: true,
});

/** TypeScript type for a validated outreach log insert payload. */
export type InsertVendorOutreachLog = z.infer<typeof insertVendorOutreachLogSchema>;

/** TypeScript type for a full vendor_outreach_log row as returned by SELECT *. */
export type VendorOutreachLog = typeof vendorOutreachLogTable.$inferSelect;
