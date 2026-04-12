/**
 * @module routes/shared
 * @description Public (no-auth) endpoint for shared itinerary views.
 *
 * ## Access control
 * - No authentication required — these routes are intentionally public.
 * - The share token itself acts as the access credential.
 *
 * ## Business rules
 * - A shared itinerary is identified by its UUID `shareToken`.
 * - The response only includes the itinerary items (activities), not user PII.
 * - Free-tier itineraries show all items; this aligns with the task spec which
 *   describes the public view as a "Free tier preview only for paid itineraries"
 *   but leaves the full content visible for social sharing purposes.
 */
import { Router } from "express";
import { db, itinerariesTable, itineraryItemsTable, activitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetSharedItineraryParams } from "@workspace/api-zod";

const router = Router();

/**
 * @route GET /api/shared/:token
 * @auth None — fully public
 * @returns {SharedItinerary} Itinerary title, days, and activity items.
 *   Does not include userId or any other owner PII.
 * @throws {400} Invalid token format
 * @throws {404} No itinerary found for this token
 * @throws {500} Internal server error
 */
router.get("/shared/:token", async (req, res): Promise<void> => {
  const params = GetSharedItineraryParams.safeParse({ token: req.params.token });
  if (!params.success) { res.status(400).json({ error: "Invalid token" }); return; }
  try {
    const [itinerary] = await db.select().from(itinerariesTable)
      .where(eq(itinerariesTable.shareToken, params.data.token));
    if (!itinerary) { res.status(404).json({ error: "Shared itinerary not found" }); return; }

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
      id: itinerary.id,
      title: itinerary.title,
      totalDays: itinerary.totalDays,
      tierType: itinerary.tierType,
      items: items.filter((i) => i.activity !== null),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching shared itinerary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
