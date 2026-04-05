/**
 * @fileoverview Tier-based access control system for the AURELION platform.
 *
 * AURELION uses a three-tier entitlement model to gate features and content:
 *
 * | Tier      | Itinerary Export | AI Chat | Premium Content |
 * |-----------|-----------------|---------|-----------------|
 * | FREE      | No              | No      | No              |
 * | BASIC     | Yes             | No      | No              |
 * | PREMIUM   | Yes             | Yes     | Yes             |
 *
 * **Tier resolution order** (highest priority first):
 * 1. Admin role override — admins always resolve to PREMIUM.
 * 2. Account-level tier (`users.tier` column) — set manually or via
 *    subscription; applies globally across all itineraries.
 * 3. Purchase-level tier — derived from completed purchases in the
 *    `purchases` table. These are **itinerary-scoped**: buying BASIC for
 *    itinerary #5 only unlocks BASIC features for that specific itinerary,
 *    not for all itineraries.
 * 4. Default — FREE.
 *
 * **Business rule:** Admin users bypass all tier checks entirely. This
 * ensures internal staff and support agents can always access every feature
 * without needing explicit purchases.
 *
 * @module api-server/lib/entitlements
 */

import { db, purchasesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

/**
 * Determine the effective access tier for a user, optionally scoped to a
 * specific itinerary.
 *
 * **Resolution algorithm:**
 * 1. Fetch the user's `role` and `tier` from the `users` table.
 * 2. If the user is an **admin**, short-circuit to PREMIUM (admin override).
 * 3. If the user has an account-level tier of "premium" or "basic", return it
 *    immediately — account-level tiers are global and take precedence over
 *    individual purchases.
 * 4. Otherwise, query the `purchases` table for completed purchases by this
 *    user. If an `itineraryId` is provided, only purchases matching that
 *    itinerary are considered (scoped access). If no `itineraryId` is given,
 *    any completed purchase of the matching product type qualifies (global
 *    check, used for features like AI chat that are not itinerary-specific).
 * 5. Check for PREMIUM purchases first, then BASIC, then fall through to FREE.
 *
 * @param userId      - The ID of the user whose tier is being resolved.
 * @param itineraryId - Optional itinerary ID to scope purchase-level checks.
 *                      When provided, only purchases for this specific
 *                      itinerary are considered. When omitted, any matching
 *                      purchase qualifies.
 * @returns The user's effective tier: `"FREE"`, `"BASIC"`, or `"PREMIUM"`.
 *
 * @example
 * ```ts
 * // Global tier check (e.g., for AI chat access)
 * const tier = await getUserTier(userId);
 *
 * // Itinerary-scoped tier check (e.g., for export)
 * const tier = await getUserTier(userId, itineraryId);
 * ```
 */
export async function getUserTier(userId: number, itineraryId?: number): Promise<"FREE" | "BASIC" | "PREMIUM"> {
  // Step 1: Fetch account-level role and tier from the users table
  const [user] = await db.select({ role: usersTable.role, tier: usersTable.tier })
    .from(usersTable).where(eq(usersTable.id, userId));

  // Step 2 & 3: Admin override and account-level tier take highest priority.
  // Admins always get PREMIUM — this ensures staff can access all features
  // without needing explicit purchases or tier assignments.
  if (user?.role === "admin" || user?.tier === "premium") return "PREMIUM";
  if (user?.tier === "basic") return "BASIC";

  // Step 4: Fall back to purchase-level checks. Query all completed purchases
  // for this user — we filter by itinerary in-memory below.
  const purchases = await db.select().from(purchasesTable)
    .where(and(
      eq(purchasesTable.userId, userId),
      eq(purchasesTable.status, "completed")
    ));

  // Step 5a: Check for PREMIUM purchases.
  // If itineraryId is provided, only a purchase for that specific itinerary
  // counts. If itineraryId is omitted, ANY completed PREMIUM purchase qualifies.
  const hasPremium = purchases.some(p => p.productType === "PREMIUM" && (!itineraryId || p.itineraryId === itineraryId));
  if (hasPremium) return "PREMIUM";

  // Step 5b: Same scoping logic for BASIC purchases.
  const hasBasic = purchases.some(p => p.productType === "BASIC" && (!itineraryId || p.itineraryId === itineraryId));
  if (hasBasic) return "BASIC";

  // Step 6: No account-level tier, no qualifying purchases — default to FREE.
  return "FREE";
}

/**
 * Check whether a user can export a specific itinerary as a PDF/document.
 *
 * Requires **BASIC** tier or higher for the given itinerary. This means the
 * user needs at minimum a BASIC purchase for this itinerary, a BASIC
 * account-level tier, or admin privileges.
 *
 * @param userId      - The user requesting the export.
 * @param itineraryId - The itinerary to export (scopes purchase-level checks).
 * @returns `true` if the user has BASIC or PREMIUM access for this itinerary.
 *
 * @example
 * ```ts
 * if (!(await canExportItinerary(userId, itineraryId))) {
 *   return res.status(403).json({ error: "Upgrade to export this itinerary" });
 * }
 * ```
 */
export async function canExportItinerary(userId: number, itineraryId: number): Promise<boolean> {
  const tier = await getUserTier(userId, itineraryId);
  return tier === "BASIC" || tier === "PREMIUM";
}

/**
 * Check whether a user can access the AI chat assistant.
 *
 * Requires **PREMIUM** tier. This is a global check (not itinerary-scoped)
 * because AI chat is a platform-wide feature, not tied to a specific
 * itinerary. The user needs either a PREMIUM account-level tier, any
 * completed PREMIUM purchase, or admin privileges.
 *
 * @param userId - The user requesting AI chat access.
 * @returns `true` if the user has PREMIUM access.
 *
 * @example
 * ```ts
 * if (!(await canUseAIChat(userId))) {
 *   return res.status(403).json({ error: "AI chat requires a Premium plan" });
 * }
 * ```
 */
export async function canUseAIChat(userId: number): Promise<boolean> {
  const tier = await getUserTier(userId);
  return tier === "PREMIUM";
}

/**
 * Check whether a user can view premium content for an itinerary.
 *
 * Premium content includes insider tips, premium booking guides, hidden
 * gem recommendations, and other exclusive editorial content. Requires
 * **PREMIUM** tier, optionally scoped to a specific itinerary.
 *
 * @param userId      - The user requesting access to premium content.
 * @param itineraryId - Optional itinerary ID to scope the check. When
 *                      provided, only PREMIUM purchases for this specific
 *                      itinerary are considered at the purchase level.
 * @returns `true` if the user has PREMIUM access (globally or for the itinerary).
 *
 * @example
 * ```ts
 * const showInsiderTips = await canViewPremiumContent(userId, itineraryId);
 * ```
 */
export async function canViewPremiumContent(userId: number, itineraryId?: number): Promise<boolean> {
  const tier = await getUserTier(userId, itineraryId);
  return tier === "PREMIUM";
}

/**
 * Check whether a user holds any PREMIUM-level access at the account level.
 *
 * This is a convenience wrapper around {@link getUserTier} with no itinerary
 * scope. It returns `true` if the user is an admin, has an account-level
 * PREMIUM tier, or has *any* completed PREMIUM purchase (regardless of
 * which itinerary it was for).
 *
 * @param userId - The user to check.
 * @returns `true` if the user has PREMIUM access at any scope.
 */
export async function hasPremiumPurchase(userId: number): Promise<boolean> {
  const tier = await getUserTier(userId);
  return tier === "PREMIUM";
}
