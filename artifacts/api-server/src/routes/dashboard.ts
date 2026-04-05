/**
 * @module routes/dashboard
 * @description Dashboard summary route providing aggregate stats for the
 * authenticated user's overview page.
 *
 * Returns a single endpoint consumed by the frontend Dashboard component
 * to populate overview cards, recent itinerary lists, and category breakdowns.
 */
import { Router } from "express";
import { db, itinerariesTable, activitiesTable, purchasesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

/**
 * @route GET /api/dashboard/summary
 * @auth Required
 * @returns {DashboardSummary} Aggregate statistics for the authenticated user:
 *   - `totalItineraries` {number} — Count of user's itineraries
 *   - `totalActivities` {number} — Total activities in the platform (global count)
 *   - `recentItineraries` {Array<Itinerary>} — 3 most recently created itineraries
 *     (sorted newest-first), with ISO 8601 timestamps
 *   - `activitiesByCategory` {Array<{ category: string, count: number, imageUrl: string | null }>}
 *     — Global activity counts per category with representative image
 *   - `hasPremium` {boolean} — Whether the user has any completed PREMIUM purchase
 * @throws {401} Unauthorized
 * @throws {500} Internal server error
 *
 * @remarks
 * - `totalActivities` and `activitiesByCategory` are global (not user-scoped) —
 *   they reflect the full platform catalog.
 * - `recentItineraries` is derived by taking the last 3 from a createdAt-ascending
 *   query and reversing, yielding newest-first order.
 * - `hasPremium` checks for ANY completed PREMIUM purchase by the user, not
 *   limited to a specific itinerary. This drives UI-level premium feature flags.
 */
router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const itineraries = await db.select().from(itinerariesTable)
      .where(eq(itinerariesTable.userId, user.id))
      .orderBy(itinerariesTable.createdAt);

    const totalActivities = await db.select({ count: sql<number>`count(*)::int` }).from(activitiesTable);

    const categorySummary = await db.select({
      category: activitiesTable.category,
      count: sql<number>`count(*)::int`,
      imageUrl: sql<string | null>`max(${activitiesTable.imageUrl})`,
    }).from(activitiesTable).groupBy(activitiesTable.category);

    const purchases = await db.select().from(purchasesTable)
      .where(and(eq(purchasesTable.userId, user.id), eq(purchasesTable.status, "completed")));
    const hasPremium = purchases.some(p => p.productType === "PREMIUM");

    res.json({
      totalItineraries: itineraries.length,
      totalActivities: totalActivities[0]?.count ?? 0,
      recentItineraries: itineraries.slice(-3).reverse().map(i => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })),
      activitiesByCategory: categorySummary,
      hasPremium,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
