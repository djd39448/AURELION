import { Router } from "express";
import { db, activitiesTable } from "@workspace/db";
import { eq, ilike, and, gte, lte, or, sql } from "drizzle-orm";
import { GetActivityParams, ListActivitiesQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/activities", async (req, res): Promise<void> => {
  try {
    const queryParsed = ListActivitiesQueryParams.safeParse(req.query);
    const query = queryParsed.success ? queryParsed.data : {};

    let conditions: ReturnType<typeof eq>[] = [];

    if (query.category) {
      conditions.push(eq(activitiesTable.category, query.category) as unknown as ReturnType<typeof eq>);
    }
    if (query.difficulty) {
      conditions.push(eq(activitiesTable.difficulty, query.difficulty) as unknown as ReturnType<typeof eq>);
    }
    if (query.minPrice != null) {
      conditions.push(gte(activitiesTable.priceLow, query.minPrice) as unknown as ReturnType<typeof eq>);
    }
    if (query.maxPrice != null) {
      conditions.push(lte(activitiesTable.priceHigh, query.maxPrice) as unknown as ReturnType<typeof eq>);
    }
    if (query.maxDuration != null) {
      conditions.push(lte(activitiesTable.durationMinutes, query.maxDuration) as unknown as ReturnType<typeof eq>);
    }

    let activities;
    if (query.search) {
      const searchTerm = `%${query.search}%`;
      activities = await db.select().from(activitiesTable)
        .where(
          conditions.length > 0
            ? and(
                ...conditions,
                or(
                  ilike(activitiesTable.title, searchTerm),
                  ilike(activitiesTable.description, searchTerm),
                  ilike(activitiesTable.category, searchTerm),
                )
              )
            : or(
                ilike(activitiesTable.title, searchTerm),
                ilike(activitiesTable.description, searchTerm),
                ilike(activitiesTable.category, searchTerm),
              )
        )
        .orderBy(activitiesTable.createdAt);
    } else {
      activities = await db.select().from(activitiesTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(activitiesTable.createdAt);
    }

    const mapped = activities.map(a => ({
      id: a.id,
      title: a.title,
      category: a.category,
      difficulty: a.difficulty,
      durationMinutes: a.durationMinutes,
      priceLow: a.priceLow,
      priceHigh: a.priceHigh,
      location: a.location,
      imageUrl: a.imageUrl,
      reviewSummary: a.reviewSummary,
      tags: a.tags ?? [],
      description: a.description,
      whatToBring: a.whatToBring,
      whatToExpect: a.whatToExpect,
      createdAt: a.createdAt.toISOString(),
    }));

    res.json(mapped);
  } catch (err) {
    req.log.error({ err }, "Error listing activities");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/activities/featured", async (req, res): Promise<void> => {
  try {
    const activities = await db.select().from(activitiesTable)
      .where(eq(activitiesTable.isFeatured, 1))
      .limit(6);

    const fallback = activities.length < 6
      ? await db.select().from(activitiesTable).limit(6)
      : activities;

    const mapped = fallback.map(a => ({
      id: a.id,
      title: a.title,
      category: a.category,
      difficulty: a.difficulty,
      durationMinutes: a.durationMinutes,
      priceLow: a.priceLow,
      priceHigh: a.priceHigh,
      location: a.location,
      imageUrl: a.imageUrl,
      reviewSummary: a.reviewSummary,
      tags: a.tags ?? [],
      description: a.description,
      whatToBring: a.whatToBring,
      whatToExpect: a.whatToExpect,
      createdAt: a.createdAt.toISOString(),
    }));

    res.json(mapped);
  } catch (err) {
    req.log.error({ err }, "Error fetching featured activities");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/activities/categories", async (req, res): Promise<void> => {
  try {
    const result = await db.select({
      category: activitiesTable.category,
      count: sql<number>`count(*)::int`,
      imageUrl: sql<string | null>`max(${activitiesTable.imageUrl})`,
    }).from(activitiesTable).groupBy(activitiesTable.category);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error fetching categories");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/activities/:id", async (req, res): Promise<void> => {
  const params = GetActivityParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid activity id" });
    return;
  }
  try {
    const [activity] = await db.select().from(activitiesTable).where(eq(activitiesTable.id, params.data.id));
    if (!activity) {
      res.status(404).json({ error: "Activity not found" });
      return;
    }
    res.json({
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
      basicBookingGuide: activity.basicBookingGuide,
      providerName: activity.providerName,
      providerWebsite: activity.providerWebsite,
      providerPhone: activity.providerPhone,
      createdAt: activity.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
