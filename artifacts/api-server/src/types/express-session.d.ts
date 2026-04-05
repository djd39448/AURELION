/**
 * Augment express-session's SessionData with AURELION's custom fields.
 *
 * Without this declaration, accessing `req.session.userId` requires
 * unsafe casts like `(req.session as Record<string, unknown>).userId`.
 * By declaring the shape here, TypeScript knows the fields exist and
 * all session access becomes type-safe.
 */
import "express-session";

declare module "express-session" {
  interface SessionData {
    /** Primary key of the authenticated user (set on login/register). */
    userId?: number;
    /** Cached copy of the user object to avoid DB lookups on every request. */
    user?: {
      id: number;
      email: string;
      name: string;
      role: string;
      tier: string;
    };
  }
}
