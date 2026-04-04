import { Router } from "express";
import { db, itinerariesTable, activitiesTable, purchasesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

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
