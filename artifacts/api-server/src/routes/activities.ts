/**
 * @module routes/activities
 * @description Public activity browsing routes for the AURELION platform.
 *
 * All routes in this module are unauthenticated — no session required.
 * They power the public-facing activity catalog, search, and category pages.
 *
 * ## Response shape conventions
 * - List views intentionally OMIT premium-only fields (`premiumBookingGuide`,
 *   `insiderTips`) to avoid leaking gated content. These fields are only
 *   exposed through tier-appropriate routes elsewhere.
 * - Detail view (`/:id`) includes `basicBookingGuide` and provider info
 *   but still omits premium fields.
 * - All `createdAt` timestamps are serialized as ISO 8601 strings.
 * - `tags` defaults to `[]` when null in the database.
 */
import { Router } from "express";
import { db, activitiesTable } from "@workspace/db";
import { eq, ilike, and, gte, lte, or, sql } from "drizzle-orm";
import { GetActivityParams, ListActivitiesQueryParams } from "@workspace/api-zod";

const router = Router();

/**
 * @route GET /api/activities
 * @auth None
 * @returns {Array<ActivityListItem>} Array of activities matching filters.
 *   Each item contains: id, title, category, difficulty, durationMinutes,
 *   priceLow, priceHigh, location, imageUrl, reviewSummary, tags, description,
 *   whatToBring, whatToExpect, createdAt.
 * @throws {500} Internal server error
 *
 * @description Lists activities with optional filtering and full-text search.
 *
 * ## Query parameters (all optional, validated via {@link ListActivitiesQueryParams}):
 * - `search` — Full-text search via ILIKE on title, description, and category.
 *   Wrapped with `%` wildcards for substring matching.
 * - `category` — Exact match on activity category
 * - `difficulty` — Exact match on difficulty level
 * - `minPrice` — Minimum `priceLow` (inclusive, via `>=`)
 * - `maxPrice` — Maximum `priceHigh` (inclusive, via `<=`)
 * - `maxDuration` — Maximum `durationMinutes` (inclusive, via `<=`)
 *
 * All filter conditions are ANDed together. When `search` is provided,
 * the text search is ORed across the three text fields, then ANDed with
 * any other active filters.
 *
 * Results are ordered by `createdAt` ascending.
 */
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

/**
 * @route GET /api/activities/featured
 * @auth None
 * @returns {Array<ActivityListItem>} Up to 6 featured activities.
 * @throws {500} Internal server error
 *
 * @description Returns featured activities for the homepage hero/carousel.
 *
 * Selection logic:
 * 1. Query activities where `isFeatured = 1`, limited to 6.
 * 2. If fewer than 6 featured activities exist, falls back to ANY 6 activities
 *    (ignoring the featured flag entirely — not a merge, a full replacement).
 *
 * Response shape is identical to the list endpoint (no premium fields).
 */
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

/**
 * @route GET /api/activities/categories
 * @auth None
 * @returns {Array<{ category: string, count: number, imageUrl: string | null }>}
 *   Aggregate category counts with a representative image (MAX of imageUrl per group).
 * @throws {500} Internal server error
 *
 * @description Returns all activity categories with their activity count and
 * a representative image URL. Used by the category browsing page.
 * The image is selected via SQL `MAX(imageUrl)` — deterministic but arbitrary.
 */
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

/**
 * @route GET /api/activities/:id
 * @auth None
 * @returns {ActivityDetail} Full activity detail including basicBookingGuide,
 *   providerName, providerWebsite, providerPhone. Still omits premium-only
 *   fields (premiumBookingGuide, insiderTips).
 * @throws {400} Invalid activity ID (non-numeric or Zod validation failure)
 * @throws {404} Activity not found
 * @throws {500} Internal server error
 *
 * @description Returns a single activity by ID with provider contact information
 * and the basic booking guide. This is the most detailed public view available.
 * Premium content is served through separate entitlement-gated routes.
 */
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
