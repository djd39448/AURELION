/**
 * @fileoverview Authentication utilities for the AURELION API server.
 *
 * Provides password hashing, verification, and two levels of session-based
 * user retrieval:
 * - {@link getUserFromSession} — full database lookup (use when you need
 *   up-to-date user data, e.g., checking if the account was deactivated).
 * - {@link requireAuth} — lightweight session-only check with no DB hit
 *   (use in hot paths where staleness of a few minutes is acceptable).
 *
 * **Security considerations:**
 * - bcrypt with 12 salt rounds provides strong, GPU-resistant hashing.
 * - `bcrypt.compare` is constant-time, preventing timing-based attacks.
 * - Login error messages are intentionally vague ("invalid credentials")
 *   to prevent user enumeration — callers must NOT expose whether the
 *   email or the password was wrong.
 *
 * @module api-server/lib/auth
 */

import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request } from "express";

/**
 * Hash a plaintext password using bcrypt.
 *
 * Uses 12 salt rounds, which takes approximately 250 ms on modern hardware.
 * This is deliberately slow to make brute-force and dictionary attacks
 * computationally expensive. Do NOT reduce the salt rounds for performance
 * reasons — the latency is the security feature.
 *
 * @param password - The user's plaintext password.
 * @returns A bcrypt hash string (60 characters, includes algorithm, cost, salt, and digest).
 *
 * @example
 * ```ts
 * const hash = await hashPassword("hunter2");
 * // => "$2a$12$LJ3m4ys..."
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a plaintext password against a stored bcrypt hash.
 *
 * Uses `bcrypt.compare`, which performs a **constant-time** comparison
 * internally. This prevents timing side-channel attacks where an attacker
 * could determine how many characters of the password matched by measuring
 * response latency.
 *
 * @param password - The plaintext password to verify.
 * @param hash     - The stored bcrypt hash to compare against.
 * @returns `true` if the password matches the hash, `false` otherwise.
 *
 * @example
 * ```ts
 * const isValid = await verifyPassword(inputPassword, user.passwordHash);
 * if (!isValid) {
 *   // SECURITY: Return a generic error — do NOT say "wrong password"
 *   // to prevent user enumeration.
 *   return res.status(401).json({ error: "Invalid credentials" });
 * }
 * ```
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Retrieve the full, up-to-date user record from the database using the
 * session's stored user ID.
 *
 * This performs a database query on every call, so use it only when you
 * need fresh data (e.g., checking the user's current role/tier after a
 * purchase, or verifying the account still exists). For lightweight auth
 * guards, prefer {@link requireAuth} instead.
 *
 * **Why the `Record<string, unknown>` cast?**
 * Express-session's TypeScript types define `req.session` with only the
 * base `Session` interface, which does not include our custom `userId` and
 * `user` fields. The cast is necessary to access them without augmenting
 * the global session types (which would couple the auth module to a
 * declaration file).
 *
 * @param req - The Express request object (must have an active session).
 * @returns The full user row from the database, or `null` if the session
 *          has no `userId` or the user no longer exists.
 *
 * @example
 * ```ts
 * const user = await getUserFromSession(req);
 * if (!user) return res.status(401).json({ error: "Not authenticated" });
 * ```
 */
export async function getUserFromSession(req: Request) {
  const userId = req.session.userId;
  if (!userId) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return user ?? null;
}

/**
 * Lightweight authentication check that reads only from the session store
 * — **no database query is performed**.
 *
 * The session's `user` object is populated at login time and contains a
 * snapshot of `{ id, email, name, role }`. Because it is not refreshed on
 * every request, the data may be slightly stale (e.g., if the user's role
 * changed since they last logged in). This is acceptable for route guards
 * where the performance benefit of skipping a DB round-trip outweighs the
 * risk of a few minutes of stale data.
 *
 * For operations that require the absolute latest user state (e.g., tier
 * checks before a purchase), use {@link getUserFromSession} instead.
 *
 * @param req - The Express request object.
 * @returns The cached session user object, or `null` if not authenticated.
 *
 * @example
 * ```ts
 * const sessionUser = requireAuth(req);
 * if (!sessionUser) return res.status(401).json({ error: "Login required" });
 * // sessionUser.id, sessionUser.email, sessionUser.role are available
 * ```
 */
export function requireAuth(req: Request): { id: number; email: string; name: string; role: string } | null {
  const userId = req.session.userId;
  if (!userId) return null;
  return req.session.user ?? null;
}
