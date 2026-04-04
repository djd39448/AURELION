import { Router } from "express";
import { db, itinerariesTable, itineraryItemsTable, activitiesTable } from "@workspace/db";
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
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { canExportItinerary } from "../lib/entitlements";

const router = Router();

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

export default router;
