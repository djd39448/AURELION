import { Router } from "express";
import { db, activitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AdminCreateActivityBody, AdminUpdateActivityParams, AdminUpdateActivityBody, AdminDeleteActivityParams, AdminIngestUrlBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router = Router();

function requireAdmin(req: import("express").Request, res: import("express").Response): boolean {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return false; }
  if (user.role !== "admin") { res.status(403).json({ error: "Admin access required" }); return false; }
  return true;
}

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

export default router;
