/**
 * @module routes/admin
 * @description Admin-only routes for activity management and content ingestion.
 *
 * ## Access control
 * All routes are guarded by {@link requireAdmin}, which checks:
 * 1. Valid authenticated session (via {@link requireAuth})
 * 2. `user.role === "admin"`
 *
 * Non-admin users receive 403; unauthenticated users receive 401.
 *
 * ## Activity management
 * Full CRUD for the activities catalog. Activities are hard-deleted
 * (no soft delete). All fields from the activity schema are accepted
 * on create; partial updates are supported on patch.
 *
 * ## URL ingestion
 * The `/admin/ingest` endpoint scrapes a given URL to extract metadata
 * for pre-populating a new activity form. It uses basic HTML parsing
 * (regex-based, not a full DOM parser) and suggests a category via
 * keyword matching against the 6 predefined AURELION categories.
 */
import { Router } from "express";
import { db, activitiesTable, usersTable, itinerariesTable, waitlistTable, vendorContactsTable, vendorOutreachLogTable } from "@workspace/db";
import { eq, ne, gte, sql } from "drizzle-orm";
import { AdminCreateActivityBody, AdminUpdateActivityParams, AdminUpdateActivityBody, AdminDeleteActivityParams, AdminIngestUrlBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router = Router();

/**
 * Middleware-style guard that checks both authentication and admin role.
 * Returns `true` if the request is from an admin; otherwise sends an
 * error response (401 or 403) and returns `false`.
 *
 * @param req - Express request (session must contain userId)
 * @param res - Express response (used to send error if not admin)
 * @returns {boolean} `true` if caller is an authenticated admin
 */
function requireAdmin(req: import("express").Request, res: import("express").Response): boolean {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return false; }
  if (user.role !== "admin") { res.status(403).json({ error: "Admin access required" }); return false; }
  return true;
}

/**
 * @route POST /api/admin/activities
 * @auth Required (admin only)
 * @body {AdminCreateActivityBody} — Full activity object with all fields.
 *   Required: title, category, difficulty, description, durationMinutes, priceLow,
 *   priceHigh, location.
 *   Optional: imageUrl, reviewSummary, whatToBring, whatToExpect, basicBookingGuide,
 *   premiumBookingGuide, insiderTips, warnings, bestTimeOfDay, tags, providerName,
 *   providerWebsite, providerPhone, providerEmail, providerWhatsapp.
 * @returns {Activity} The newly created activity (HTTP 201) with all fields
 * @throws {400} Zod validation failure
 * @throws {401} Unauthorized
 * @throws {403} Admin access required
 * @throws {500} Internal server error
 */
router.post("/admin/activities", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const parsed = AdminCreateActivityBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const data = parsed.data;
    const [created] = await db.insert(activitiesTable).values({
      title: data.title,
      category: data.category,
      difficulty: data.difficulty,
      description: data.description,
      durationMinutes: data.durationMinutes,
      priceLow: data.priceLow,
      priceHigh: data.priceHigh,
      location: data.location,
      imageUrl: data.imageUrl ?? null,
      reviewSummary: data.reviewSummary ?? null,
      whatToBring: data.whatToBring ?? null,
      whatToExpect: data.whatToExpect ?? null,
      basicBookingGuide: data.basicBookingGuide ?? null,
      premiumBookingGuide: data.premiumBookingGuide ?? null,
      insiderTips: data.insiderTips ?? null,
      warnings: data.warnings ?? null,
      bestTimeOfDay: data.bestTimeOfDay ?? null,
      tags: data.tags ?? [],
      providerName: data.providerName ?? null,
      providerWebsite: data.providerWebsite ?? null,
      providerPhone: data.providerPhone ?? null,
      providerEmail: data.providerEmail ?? null,
      providerWhatsapp: data.providerWhatsapp ?? null,
    }).returning();
    res.status(201).json({
      ...created,
      tags: created.tags ?? [],
      createdAt: created.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route PATCH /api/admin/activities/:id
 * @auth Required (admin only)
 * @body {AdminUpdateActivityBody} — Partial activity fields (Zod-validated).
 *   Any subset of activity columns can be updated.
 * @returns {Activity} The updated activity with all fields
 * @throws {400} Invalid ID or Zod validation failure
 * @throws {401} Unauthorized
 * @throws {403} Admin access required
 * @throws {404} Activity not found
 * @throws {500} Internal server error
 */
router.patch("/admin/activities/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const params = AdminUpdateActivityParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = AdminUpdateActivityBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [updated] = await db.update(activitiesTable)
      .set(parsed.data)
      .where(eq(activitiesTable.id, params.data.id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json({
      ...updated,
      tags: updated.tags ?? [],
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error updating activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route DELETE /api/admin/activities/:id
 * @auth Required (admin only)
 * @returns {void} HTTP 204 No Content on success
 * @throws {400} Invalid ID
 * @throws {401} Unauthorized
 * @throws {403} Admin access required
 * @throws {404} Activity not found
 * @throws {500} Internal server error
 *
 * @remarks Hard delete — the activity row is permanently removed from the
 * database. Any itinerary items referencing this activity will become orphaned
 * (they are filtered out in itinerary detail views).
 */
router.delete("/admin/activities/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const params = AdminDeleteActivityParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [deleted] = await db.delete(activitiesTable).where(eq(activitiesTable.id, params.data.id)).returning();
    if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "Error deleting activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /api/admin/ingest
 * @auth Required (admin only)
 * @body {AdminIngestUrlBody} — `{ url: string }` — the URL to scrape
 * @returns {{ title: string, description: string, url: string, suggestedCategory: string, rawText: string }}
 *   Extracted metadata from the target URL:
 *   - `title` — from `<title>` tag, fallback: "Aruba Activity"
 *   - `description` — from `<meta name="description">`, fallback: ""
 *   - `url` — echo of the input URL
 *   - `suggestedCategory` — best-match from the 6 predefined categories
 *     ("Cliff & Vertical Adventures", "Off-Road Expeditions", "Ocean Exploration",
 *     "Wild Terrain & Natural Wonders", "Water & Wind Sports", "Scenic Riding"),
 *     matched via keyword overlap, fallback: "Ocean Exploration"
 *   - `rawText` — first 2000 chars of HTML stripped of tags (for manual review)
 * @throws {400} Zod validation failure (invalid URL)
 * @throws {401} Unauthorized
 * @throws {403} Admin access required
 * @throws {500} Failed to fetch URL (timeout after 10s, network error, etc.)
 *
 * @remarks
 * - Uses `fetch()` with a 10-second timeout via `AbortSignal.timeout(10000)`.
 * - Identifies as `User-Agent: AURELION/1.0 (activity-research)`.
 * - HTML parsing is regex-based (not a DOM parser) — may miss edge cases
 *   with unusual HTML structures.
 * - Category suggestion uses simple keyword matching: each category name is
 *   split into words, and words longer than 4 characters are searched in the
 *   lowercased HTML. First match wins.
 */
router.post("/admin/ingest", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const parsed = AdminIngestUrlBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const { url } = parsed.data;
    const response = await fetch(url, {
      headers: { "User-Agent": "AURELION/1.0 (activity-research)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() ?? "Aruba Activity";
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch?.[1]?.trim() ?? "";
    const categories = ["Cliff & Vertical Adventures", "Off-Road Expeditions", "Ocean Exploration", "Wild Terrain & Natural Wonders", "Water & Wind Sports", "Scenic Riding"];
    const lowerHtml = html.toLowerCase();
    const suggestedCategory = categories.find(c =>
      c.toLowerCase().split(" ").some(w => w.length > 4 && lowerHtml.includes(w.toLowerCase()))
    ) ?? "Ocean Exploration";
    const rawText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000);
    res.json({ title, description, url, suggestedCategory, rawText });
  } catch (err) {
    req.log.error({ err }, "Error ingesting URL");
    res.status(500).json({ error: "Failed to fetch URL" });
  }
});

/**
 * @route GET /api/admin/metrics
 * @auth Required — `x-admin-secret` header must match the `ADMIN_SECRET` env var.
 * @returns {AdminMetrics} Platform-wide metrics snapshot:
 *   - `totalUsers` {number} — All registered users
 *   - `usersToday` {number} — Users registered since midnight UTC today
 *   - `totalItineraries` {number} — All itineraries ever created
 *   - `itinerariesToday` {number} — Itineraries created since midnight UTC today
 *   - `paidUsers` {number} — Users with tier != 'free'
 *   - `revenueEstimate` {number} — Estimated revenue: (basic × $9.99) + (premium × $49.99)
 * @throws {401} Missing or invalid ADMIN_SECRET header
 * @throws {500} Internal server error
 *
 * @remarks
 * Uses a simple static-secret authentication scheme so the board can view
 * metrics without needing a registered admin account in the database.
 * Set `ADMIN_SECRET` in Railway environment variables to a strong random string.
 */
router.get("/admin/metrics", async (req, res): Promise<void> => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers["x-admin-secret"] !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [totalUsersRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable);
    const [usersTodayRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(gte(usersTable.createdAt, todayStart));

    const [totalItinerariesRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(itinerariesTable);
    const [itinerariesTodayRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(itinerariesTable)
      .where(gte(itinerariesTable.createdAt, todayStart));

    const [paidUsersRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(ne(usersTable.tier, "free"));
    const [basicUsersRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(eq(usersTable.tier, "basic"));
    const [premiumUsersRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(eq(usersTable.tier, "premium"));

    const basicCount = basicUsersRow?.count ?? 0;
    const premiumCount = premiumUsersRow?.count ?? 0;
    const revenueEstimate = Math.round((basicCount * 9.99 + premiumCount * 49.99) * 100) / 100;

    res.json({
      totalUsers: totalUsersRow?.count ?? 0,
      usersToday: usersTodayRow?.count ?? 0,
      totalItineraries: totalItinerariesRow?.count ?? 0,
      itinerariesToday: itinerariesTodayRow?.count ?? 0,
      paidUsers: paidUsersRow?.count ?? 0,
      revenueEstimate,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching admin metrics");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route GET /api/admin/waitlist
 * @auth Required — `x-admin-secret` header must match the `ADMIN_SECRET` env var.
 * @returns {{ count: number; emails: string[] }} Waitlist count and email list
 * @throws {401} Missing or invalid ADMIN_SECRET header
 * @throws {500} Internal server error
 */
router.get("/admin/waitlist", async (req, res): Promise<void> => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers["x-admin-secret"] !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const rows = await db
      .select({ email: waitlistTable.email, createdAt: waitlistTable.createdAt })
      .from(waitlistTable)
      .orderBy(waitlistTable.createdAt);
    res.json({ count: rows.length, emails: rows.map((r) => r.email) });
  } catch (err) {
    req.log.error({ err }, "Error fetching waitlist");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Vendor Relations endpoints — protected by ADMIN_SECRET header
// ---------------------------------------------------------------------------

function requireAdminSecret(req: import("express").Request, res: import("express").Response): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers["x-admin-secret"] !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * @route GET /api/admin/vendor-contacts
 * @auth Required — `x-admin-secret` header must match the `ADMIN_SECRET` env var.
 * @returns {VendorContact[]} All vendor contacts ordered by provider_id then id.
 * @throws {401} Missing or invalid ADMIN_SECRET header
 * @throws {500} Internal server error
 */
router.get("/admin/vendor-contacts", async (req, res): Promise<void> => {
  if (!requireAdminSecret(req, res)) return;
  try {
    const contacts = await db
      .select()
      .from(vendorContactsTable)
      .orderBy(vendorContactsTable.providerId, vendorContactsTable.id);
    res.json(contacts.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      lastContactedAt: c.lastContactedAt?.toISOString() ?? null,
      lastResponseAt: c.lastResponseAt?.toISOString() ?? null,
    })));
  } catch (err) {
    req.log.error({ err }, "Error fetching vendor contacts");
    res.status(500).json({ error: "Internal server error" });
  }
});

const VALID_RELATIONSHIP_STATUSES = ["cold", "contacted", "responded", "active_partner"] as const;
type RelationshipStatus = typeof VALID_RELATIONSHIP_STATUSES[number];

/**
 * @route PATCH /api/admin/vendor-contacts/:providerId
 * @auth Required — `x-admin-secret` header must match the `ADMIN_SECRET` env var.
 * @body Partial vendor contact fields (contactName, contactEmail, contactPhone,
 *   relationshipStatus, lastContactedAt, lastResponseAt, notes).
 * @returns {VendorContact} The updated contact row.
 * @throws {400} Invalid providerId or body validation failure
 * @throws {401} Missing or invalid ADMIN_SECRET header
 * @throws {404} No contact row found for this providerId
 * @throws {500} Internal server error
 *
 * @remarks Updates the first contact row for the given providerId.
 * If no row exists yet, callers should POST to create one first.
 */
router.patch("/admin/vendor-contacts/:providerId", async (req, res): Promise<void> => {
  if (!requireAdminSecret(req, res)) return;
  const providerId = Number(req.params.providerId);
  if (!Number.isInteger(providerId) || providerId <= 0) {
    res.status(400).json({ error: "Invalid providerId" });
    return;
  }
  const body = req.body as Record<string, unknown>;
  if (body.relationshipStatus !== undefined && !VALID_RELATIONSHIP_STATUSES.includes(body.relationshipStatus as RelationshipStatus)) {
    res.status(400).json({ error: `relationshipStatus must be one of: ${VALID_RELATIONSHIP_STATUSES.join(", ")}` });
    return;
  }
  try {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.contactName !== undefined) patch.contactName = body.contactName ?? null;
    if (body.contactEmail !== undefined) patch.contactEmail = body.contactEmail ?? null;
    if (body.contactPhone !== undefined) patch.contactPhone = body.contactPhone ?? null;
    if (body.relationshipStatus !== undefined) patch.relationshipStatus = body.relationshipStatus as RelationshipStatus;
    if (body.lastContactedAt !== undefined) patch.lastContactedAt = body.lastContactedAt ? new Date(body.lastContactedAt as string) : null;
    if (body.lastResponseAt !== undefined) patch.lastResponseAt = body.lastResponseAt ? new Date(body.lastResponseAt as string) : null;
    if (body.notes !== undefined) patch.notes = body.notes ?? null;

    const [updated] = await db
      .update(vendorContactsTable)
      .set(patch)
      .where(eq(vendorContactsTable.providerId, providerId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "No vendor contact found for this providerId" });
      return;
    }
    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      lastContactedAt: updated.lastContactedAt?.toISOString() ?? null,
      lastResponseAt: updated.lastResponseAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Error updating vendor contact");
    res.status(500).json({ error: "Internal server error" });
  }
});

const VALID_OUTREACH_DIRECTIONS = ["outbound", "inbound"] as const;
type OutreachDirection = typeof VALID_OUTREACH_DIRECTIONS[number];

/**
 * @route POST /api/admin/vendor-outreach-log
 * @auth Required — `x-admin-secret` header must match the `ADMIN_SECRET` env var.
 * @body Required: providerId (int), direction ("outbound"|"inbound"), subject (string), body (string).
 *   Optional: sentAt (ISO timestamp, defaults to now), resendMessageId, notes.
 * @returns {VendorOutreachLog} The newly created log entry (HTTP 201).
 * @throws {400} Body validation failure
 * @throws {401} Missing or invalid ADMIN_SECRET header
 * @throws {500} Internal server error
 */
router.post("/admin/vendor-outreach-log", async (req, res): Promise<void> => {
  if (!requireAdminSecret(req, res)) return;
  const data = req.body as Record<string, unknown>;
  if (!Number.isInteger(data.providerId) || (data.providerId as number) <= 0) {
    res.status(400).json({ error: "providerId must be a positive integer" });
    return;
  }
  if (!VALID_OUTREACH_DIRECTIONS.includes(data.direction as OutreachDirection)) {
    res.status(400).json({ error: `direction must be one of: ${VALID_OUTREACH_DIRECTIONS.join(", ")}` });
    return;
  }
  if (!data.subject || typeof data.subject !== "string") {
    res.status(400).json({ error: "subject is required" });
    return;
  }
  if (!data.body || typeof data.body !== "string") {
    res.status(400).json({ error: "body is required" });
    return;
  }
  try {
    const [created] = await db
      .insert(vendorOutreachLogTable)
      .values({
        providerId: data.providerId as number,
        direction: data.direction as OutreachDirection,
        subject: data.subject as string,
        body: data.body as string,
        sentAt: data.sentAt ? new Date(data.sentAt as string) : new Date(),
        resendMessageId: (data.resendMessageId as string | undefined) ?? null,
        notes: (data.notes as string | undefined) ?? null,
      })
      .returning();
    res.status(201).json({
      ...created,
      sentAt: created.sentAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error logging vendor outreach");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
