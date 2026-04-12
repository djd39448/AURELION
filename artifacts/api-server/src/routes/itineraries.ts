/**
 * @module routes/itineraries
 * @description Authenticated itinerary CRUD and item management routes.
 *
 * ## Access control
 * - ALL routes require authentication via {@link requireAuth}.
 * - All queries are scoped to `userId` of the authenticated session,
 *   providing multi-tenant isolation — users can never see or modify
 *   another user's itineraries.
 *
 * ## Tier model
 * - New itineraries always start as `FREE` / `draft`.
 * - Tier upgrades happen via the purchases flow (Stripe checkout).
 * - Export is entitlement-gated: requires BASIC or PREMIUM tier.
 *
 * ## Data model
 * - An itinerary has many itinerary items.
 * - Each item references an activity and is placed at a specific day/timeSlot.
 * - Deletion is cascading: items are deleted before the parent itinerary.
 *
 * ## Performance note
 * - GET /:id and GET /:id/export use an N+1 query pattern — each item
 *   individually fetches its related activity. Acceptable for small item
 *   counts per itinerary but should be revisited if item counts grow.
 */
import { Router } from "express";
import { randomUUID } from "crypto";
import { db, itinerariesTable, itineraryItemsTable, activitiesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateItineraryBody,
  UpdateItineraryBody,
  GetItineraryParams,
  UpdateItineraryParams,
  DeleteItineraryParams,
  AddItineraryItemParams,
  AddItineraryItemBody,
  UpdateItineraryItemParams,
  UpdateItineraryItemBody,
  RemoveItineraryItemParams,
  ExportItineraryParams,
  ShareItineraryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { canExportItinerary } from "../lib/entitlements";

const router = Router();

/**
 * @route GET /api/itineraries
 * @auth Required
 * @returns {Array<Itinerary>} All itineraries belonging to the authenticated user,
 *   ordered by `createdAt` ascending. Timestamps serialized as ISO 8601.
 * @throws {401} Unauthorized — no valid session
 * @throws {500} Internal server error
 */
router.get("/itineraries", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const items = await db.select().from(itinerariesTable)
      .where(eq(itinerariesTable.userId, user.id))
      .orderBy(itinerariesTable.createdAt);
    res.json(items.map(i => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing itineraries");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /api/itineraries
 * @auth Required
 * @body {CreateItineraryBody} — `{ title: string, totalDays: number }`
 * @returns {Itinerary} The newly created itinerary (HTTP 201).
 *   Always created with `tierType: "FREE"` and `status: "draft"`.
 * @throws {400} Zod validation failure
 * @throws {401} Unauthorized
 * @throws {500} Internal server error
 */
router.post("/itineraries", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = CreateItineraryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [created] = await db.insert(itinerariesTable).values({
      userId: user.id,
      title: parsed.data.title,
      totalDays: parsed.data.totalDays,
      tierType: "FREE",
      status: "draft",
    }).returning();
    // Mark first-itinerary flag so the onboarding banner dismisses
    await db.update(usersTable)
      .set({ hasGeneratedItinerary: true })
      .where(and(eq(usersTable.id, user.id), eq(usersTable.hasGeneratedItinerary, false)));
    res.status(201).json({
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating itinerary");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route GET /api/itineraries/:id
 * @auth Required
 * @returns {Itinerary & { items: Array<ItineraryItem & { activity: ActivityListItem | null }> }}
 *   Itinerary with populated activity items. Items whose activity no longer
 *   exists in the DB are filtered out of the response.
 * @throws {400} Invalid ID
 * @throws {401} Unauthorized
 * @throws {404} Itinerary not found (or belongs to another user)
 * @throws {500} Internal server error
 *
 * @remarks Uses N+1 queries — each item fetches its activity individually via
 * `Promise.all`. Orphaned items (activity deleted) are silently excluded.
 */
router.get("/itineraries/:id", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = GetItineraryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [itinerary] = await db.select().from(itinerariesTable)
      .where(and(eq(itinerariesTable.id, params.data.id), eq(itinerariesTable.userId, user.id)));
    if (!itinerary) { res.status(404).json({ error: "Not found" }); return; }
    const rawItems = await db.select().from(itineraryItemsTable)
      .where(eq(itineraryItemsTable.itineraryId, itinerary.id));
    const items = await Promise.all(rawItems.map(async (item) => {
      const [activity] = await db.select().from(activitiesTable).where(eq(activitiesTable.id, item.activityId));
      return {
        ...item,
        activity: activity ? {
          id: activity.id,
          title: activity.title,
          category: activity.category,
          difficulty: activity.difficulty,
          durationMinutes: activity.durationMinutes,
          priceLow: activity.priceLow,
          priceHigh: activity.priceHigh,
          location: activity.location,
          imageUrl: activity.imageUrl,
          reviewSummary: activity.reviewSummary,
          tags: activity.tags ?? [],
          description: activity.description,
          whatToBring: activity.whatToBring,
          whatToExpect: activity.whatToExpect,
          createdAt: activity.createdAt.toISOString(),
        } : null,
      };
    }));
    res.json({
      ...itinerary,
      createdAt: itinerary.createdAt.toISOString(),
      updatedAt: itinerary.updatedAt.toISOString(),
      items: items.filter(i => i.activity !== null),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching itinerary");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route PATCH /api/itineraries/:id
 * @auth Required
 * @body {UpdateItineraryBody} — Partial itinerary fields (Zod-validated).
 *   Accepts any subset of updatable itinerary columns.
 * @returns {Itinerary} The updated itinerary
 * @throws {400} Invalid ID or Zod validation failure
 * @throws {401} Unauthorized
 * @throws {404} Not found (or belongs to another user)
 * @throws {500} Internal server error
 */
router.patch("/itineraries/:id", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = UpdateItineraryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateItineraryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [updated] = await db.update(itinerariesTable)
      .set(parsed.data)
      .where(and(eq(itinerariesTable.id, params.data.id), eq(itinerariesTable.userId, user.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error updating itinerary");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route DELETE /api/itineraries/:id
 * @auth Required
 * @returns {void} HTTP 204 No Content on success
 * @throws {400} Invalid ID
 * @throws {401} Unauthorized
 * @throws {404} Not found (or belongs to another user)
 * @throws {500} Internal server error
 *
 * @remarks Cascading delete: all itinerary items are deleted first,
 * then the itinerary itself. Not wrapped in a transaction — if the
 * itinerary delete fails, orphaned item deletions are not rolled back.
 */
router.delete("/itineraries/:id", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = DeleteItineraryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.delete(itineraryItemsTable).where(eq(itineraryItemsTable.itineraryId, params.data.id));
    const [deleted] = await db.delete(itinerariesTable)
      .where(and(eq(itinerariesTable.id, params.data.id), eq(itinerariesTable.userId, user.id)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "Error deleting itinerary");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /api/itineraries/:id/items
 * @auth Required
 * @body {AddItineraryItemBody} — `{ activityId: number, dayNumber: number, timeSlot: string, notes?: string }`
 * @returns {ItineraryItem} The newly created item (HTTP 201)
 * @throws {400} Invalid itinerary ID or Zod validation failure
 * @throws {401} Unauthorized
 * @throws {404} Itinerary not found (or belongs to another user)
 * @throws {500} Internal server error
 *
 * @remarks Verifies itinerary ownership before inserting the item.
 * The `notes` field defaults to null if not provided.
 */
router.post("/itineraries/:id/items", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = AddItineraryItemParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = AddItineraryItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [itinerary] = await db.select().from(itinerariesTable)
      .where(and(eq(itinerariesTable.id, params.data.id), eq(itinerariesTable.userId, user.id)));
    if (!itinerary) { res.status(404).json({ error: "Itinerary not found" }); return; }
    const [item] = await db.insert(itineraryItemsTable).values({
      itineraryId: params.data.id,
      activityId: parsed.data.activityId,
      dayNumber: parsed.data.dayNumber,
      timeSlot: parsed.data.timeSlot,
      notes: parsed.data.notes ?? null,
    }).returning();
    res.status(201).json(item);
  } catch (err) {
    req.log.error({ err }, "Error adding itinerary item");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route PATCH /api/itineraries/:id/items/:itemId
 * @auth Required
 * @body {UpdateItineraryItemBody} — Partial item fields (Zod-validated)
 * @returns {ItineraryItem} The updated item
 * @throws {400} Invalid params or Zod validation failure
 * @throws {401} Unauthorized
 * @throws {404} Item not found within the specified itinerary
 * @throws {500} Internal server error
 *
 * @remarks Matches on both `itemId` AND `itineraryId` to ensure the item
 * belongs to the specified itinerary (prevents cross-itinerary item updates).
 */
router.patch("/itineraries/:id/items/:itemId", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = UpdateItineraryItemParams.safeParse({ id: Number(req.params.id), itemId: Number(req.params.itemId) });
  if (!params.success) { res.status(400).json({ error: "Invalid params" }); return; }
  const parsed = UpdateItineraryItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [item] = await db.update(itineraryItemsTable)
      .set(parsed.data)
      .where(and(eq(itineraryItemsTable.id, params.data.itemId), eq(itineraryItemsTable.itineraryId, params.data.id)))
      .returning();
    if (!item) { res.status(404).json({ error: "Item not found" }); return; }
    res.json(item);
  } catch (err) {
    req.log.error({ err }, "Error updating itinerary item");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route DELETE /api/itineraries/:id/items/:itemId
 * @auth Required
 * @returns {void} HTTP 204 No Content on success
 * @throws {400} Invalid params
 * @throws {401} Unauthorized
 * @throws {404} Item not found within the specified itinerary
 * @throws {500} Internal server error
 */
router.delete("/itineraries/:id/items/:itemId", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = RemoveItineraryItemParams.safeParse({ id: Number(req.params.id), itemId: Number(req.params.itemId) });
  if (!params.success) { res.status(400).json({ error: "Invalid params" }); return; }
  try {
    const [deleted] = await db.delete(itineraryItemsTable)
      .where(and(eq(itineraryItemsTable.id, params.data.itemId), eq(itineraryItemsTable.itineraryId, params.data.id)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Item not found" }); return; }
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "Error removing itinerary item");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route GET /api/itineraries/:id/export
 * @auth Required
 * @tier BASIC | PREMIUM — entitlement-gated via {@link canExportItinerary}
 * @returns {{ itinerary: Itinerary & { items: Array<...> }, tierType: string, exportedAt: string }}
 *   Full itinerary data suitable for PDF generation, including populated
 *   activity items and the current tier type. `exportedAt` is the server timestamp.
 * @throws {400} Invalid ID
 * @throws {401} Unauthorized
 * @throws {403} "Upgrade to Basic or Premium to export your itinerary"
 * @throws {404} Not found
 * @throws {500} Internal server error
 *
 * @remarks
 * - FREE-tier users are blocked at the entitlement check (403).
 * - Uses the same N+1 activity resolution pattern as GET /:id.
 * - The `exportedAt` timestamp marks when the export was generated, not when
 *   the itinerary was last modified.
 */
router.get("/itineraries/:id/export", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = ExportItineraryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const eligible = await canExportItinerary(user.id, params.data.id);
    if (!eligible) {
      res.status(403).json({ error: "Upgrade to Basic or Premium to export your itinerary" });
      return;
    }
    const [itinerary] = await db.select().from(itinerariesTable)
      .where(and(eq(itinerariesTable.id, params.data.id), eq(itinerariesTable.userId, user.id)));
    if (!itinerary) { res.status(404).json({ error: "Not found" }); return; }
    const rawItems = await db.select().from(itineraryItemsTable)
      .where(eq(itineraryItemsTable.itineraryId, itinerary.id));
    const items = await Promise.all(rawItems.map(async (item) => {
      const [activity] = await db.select().from(activitiesTable).where(eq(activitiesTable.id, item.activityId));
      return {
        ...item,
        activity: activity ? {
          id: activity.id, title: activity.title, category: activity.category,
          difficulty: activity.difficulty, durationMinutes: activity.durationMinutes,
          priceLow: activity.priceLow, priceHigh: activity.priceHigh, location: activity.location,
          imageUrl: activity.imageUrl, reviewSummary: activity.reviewSummary, tags: activity.tags ?? [],
          description: activity.description, whatToBring: activity.whatToBring, whatToExpect: activity.whatToExpect,
          createdAt: activity.createdAt.toISOString(),
        } : null,
      };
    }));
    res.json({
      itinerary: {
        ...itinerary,
        createdAt: itinerary.createdAt.toISOString(),
        updatedAt: itinerary.updatedAt.toISOString(),
        items: items.filter(i => i.activity !== null),
      },
      tierType: itinerary.tierType,
      exportedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error exporting itinerary");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /api/itineraries/:id/share
 * @auth Required
 * @returns {{ shareToken: string, shareUrl: string }} The share token and public URL.
 *   Generates a new UUID share token if one is not already set; otherwise returns
 *   the existing token (idempotent — calling this multiple times returns the same link).
 * @throws {400} Invalid ID
 * @throws {401} Unauthorized
 * @throws {404} Itinerary not found (or belongs to another user)
 * @throws {500} Internal server error
 */
router.post("/itineraries/:id/share", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = ShareItineraryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [itinerary] = await db.select().from(itinerariesTable)
      .where(and(eq(itinerariesTable.id, params.data.id), eq(itinerariesTable.userId, user.id)));
    if (!itinerary) { res.status(404).json({ error: "Not found" }); return; }

    // Reuse existing token (idempotent) or generate a fresh UUID
    const shareToken = itinerary.shareToken ?? randomUUID();
    if (!itinerary.shareToken) {
      await db.update(itinerariesTable)
        .set({ shareToken })
        .where(eq(itinerariesTable.id, itinerary.id));
    }

    const origin = req.headers.origin ?? `${req.protocol}://${req.headers.host}`;
    const shareUrl = `${origin}/shared/${shareToken}`;
    res.json({ shareToken, shareUrl });
  } catch (err) {
    req.log.error({ err }, "Error generating share link");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
