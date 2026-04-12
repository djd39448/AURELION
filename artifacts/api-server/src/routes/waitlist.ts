/**
 * @module routes/waitlist
 * @description Public waitlist signup endpoint for pre-launch marketing.
 *
 * @route POST /api/waitlist — accepts an email, stores it in the `waitlist` table.
 * @auth None required (fully public)
 */
import { Router } from "express";
import { db, waitlistTable } from "@workspace/db";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @route POST /api/waitlist
 * @auth None
 * @body {{ email: string; source?: string }}
 * @returns {{ ok: true }} on success
 * @throws {400} Invalid or missing email
 * @throws {500} Internal server error
 */
router.post("/waitlist", async (req, res): Promise<void> => {
  const { email, source } = req.body ?? {};
  const parsed = { success: typeof email === "string" && EMAIL_RE.test(email), data: { email: email as string, source: source as string | undefined } };
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email address." });
    return;
  }
  try {
    await db.insert(waitlistTable).values({
      email: parsed.data.email.toLowerCase().trim(),
      source: parsed.data.source ?? "homepage-banner",
    });
    res.status(201).json({ ok: true });
  } catch (err: unknown) {
    // Postgres unique violation code = 23505
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      // Already signed up — return success so we don't leak existence
      res.status(200).json({ ok: true });
      return;
    }
    req.log.error({ err }, "Error inserting waitlist entry");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
