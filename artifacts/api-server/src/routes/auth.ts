/**
 * @module routes/auth
 * @description Session-based authentication routes for the AURELION platform.
 *
 * ## Authentication model
 * - All auth state is stored in server-side sessions (no JWT).
 * - Sessions persist `userId` and a cached `user` object.
 * - Passwords are hashed with bcrypt via {@link hashPassword} / {@link verifyPassword}.
 * - Request bodies are validated with Zod schemas ({@link RegisterBody}, {@link LoginBody}).
 *
 * ## Security notes
 * - Login returns the same "Invalid credentials" error for both bad email and bad
 *   password to prevent user enumeration attacks.
 * - Admin users have their tier automatically elevated to "premium" in session
 *   responses, granting full platform access.
 */
import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { sendWelcomeEmail } from "../lib/email";

const router = Router();

/**
 * @route GET /api/auth/me
 * @auth Optional — returns user profile if session exists, otherwise unauthenticated stub
 * @returns {{ isAuthenticated: boolean, id?: number, name?: string, email?: string, role?: string, tier?: string }}
 *   When authenticated: full user profile with `isAuthenticated: true`.
 *   When not authenticated: `{ isAuthenticated: false }`.
 *   Admin users have `tier` elevated to `"premium"` regardless of DB value.
 * @throws {500} Internal server error on DB failure
 *
 * @remarks
 * If the session references a userId that no longer exists in the DB,
 * the session is silently cleared and `{ isAuthenticated: false }` is returned.
 */
router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = req.session?.userId as number | undefined;
  if (!userId) {
    res.json({ isAuthenticated: false });
    return;
  }
  try {
    const [user] = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      tier: usersTable.tier,
      hasGeneratedItinerary: usersTable.hasGeneratedItinerary,
      createdAt: usersTable.createdAt,
    }).from(usersTable).where(eq(usersTable.id, userId));

    if (!user) {
      req.session.userId = undefined;
      res.json({ isAuthenticated: false });
      return;
    }
    const effectiveTier = user.role === "admin" ? "premium" : user.tier;
    res.json({ ...user, tier: effectiveTier, createdAt: user.createdAt.toISOString(), isAuthenticated: true });
  } catch (err) {
    req.log.error({ err }, "Error fetching user");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /api/auth/register
 * @auth None
 * @body {RegisterBody} — `{ name: string, email: string, password: string }` (Zod-validated)
 * @returns {{ id: number, name: string, email: string, role: string, isAuthenticated: true }}
 *   Newly created user profile. A session is established automatically (user is logged in).
 * @throws {400} Zod validation failure or email already registered
 * @throws {500} Internal server error
 *
 * @remarks
 * - Email uniqueness is enforced at the application layer (SELECT before INSERT).
 * - Password is bcrypt-hashed before storage; plaintext is never persisted.
 * - New users default to role "user" (tier defaults handled by DB schema).
 * - Session stores both `userId` (for auth checks) and `user` (cached profile).
 */
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, password } = parsed.data;
  try {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(usersTable).values({
      name,
      email,
      passwordHash,
      role: "user",
    }).returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
    });
    req.session.userId = user.id;
    req.session.user = { ...user, tier: "free" };
    // Fire-and-forget: don't let email failure block the response
    sendWelcomeEmail(user.email, user.name).catch(() => {});
    res.status(201).json({ ...user, tier: "free", isAuthenticated: true });
  } catch (err) {
    req.log.error({ err }, "Error registering user");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /api/auth/login
 * @auth None
 * @body {LoginBody} — `{ email: string, password: string }` (Zod-validated)
 * @returns {{ id: number, name: string, email: string, role: string, tier: string, isAuthenticated: true }}
 *   User profile with effective tier. Admin users get tier elevated to "premium".
 * @throws {400} Zod validation failure
 * @throws {401} Invalid credentials — returned for BOTH bad email and bad password
 *   (anti-enumeration: attacker cannot distinguish "no such user" from "wrong password")
 * @throws {500} Internal server error
 *
 * @remarks
 * - Establishes a server-side session with `userId` and cached `user` object.
 * - The `effectiveTier` computation ensures admins always have premium access.
 */
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const effectiveTier = user.role === "admin" ? "premium" : (user.tier ?? "free");
    const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role, tier: effectiveTier };
    req.session.userId = user.id;
    req.session.user = sessionUser;
    res.json({ ...sessionUser, isAuthenticated: true });
  } catch (err) {
    req.log.error({ err }, "Error logging in");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /api/auth/logout
 * @auth Required (implicitly — destroys whatever session exists)
 * @returns {{ success: true }}
 * @throws {500} Session destruction error (logged but response still sent)
 *
 * @remarks
 * Destroys the entire server-side session. The response is always
 * `{ success: true }` even if no session existed.
 */
router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy((err) => {
    if (err) {
      logger.error({ err }, "Error destroying session");
    }
    res.json({ success: true });
  });
});

export default router;
