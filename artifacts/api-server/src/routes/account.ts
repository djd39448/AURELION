/**
 * @module routes/account
 * @description Account-scoped routes for the AURELION platform.
 *
 * ## Routes
 * - GET /account/itineraries — returns all itineraries for the authenticated
 *   user, sorted newest first (createdAt DESC).
 *
 * ## Access control
 * - All routes require authentication via {@link requireAuth}.
 * - All queries are scoped to the authenticated user's ID.
 */
import { Router } from "express";
import { db, itinerariesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

/**
 * @route GET /api/account/itineraries
 * @auth Required
 * @returns {Array<AccountItinerary>} All itineraries for the authenticated user,
 *   sorted by `createdAt` descending (newest first).
 *   Each entry includes: id, title, createdAt (ISO 8601), tierType.
 * @throws {401} Unauthorized — no valid session
 * @throws {500} Internal server error
 */
router.get("/account/itineraries", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const items = await db
      .select({
        id: itinerariesTable.id,
        title: itinerariesTable.title,
        createdAt: itinerariesTable.createdAt,
        tierType: itinerariesTable.tierType,
      })
      .from(itinerariesTable)
      .where(eq(itinerariesTable.userId, user.id))
      .orderBy(desc(itinerariesTable.createdAt));
    res.json(items.map(i => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing account itineraries");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
