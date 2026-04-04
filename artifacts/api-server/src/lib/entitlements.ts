import { db, purchasesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export async function getUserTier(userId: number, itineraryId?: number): Promise<"FREE" | "BASIC" | "PREMIUM"> {
  const [user] = await db.select({ role: usersTable.role, tier: usersTable.tier })
    .from(usersTable).where(eq(usersTable.id, userId));

  if (user?.role === "admin" || user?.tier === "premium") return "PREMIUM";
  if (user?.tier === "basic") return "BASIC";

  const purchases = await db.select().from(purchasesTable)
    .where(and(
      eq(purchasesTable.userId, userId),
      eq(purchasesTable.status, "completed")
    ));

  const hasPremium = purchases.some(p => p.productType === "PREMIUM" && (!itineraryId || p.itineraryId === itineraryId));
  if (hasPremium) return "PREMIUM";

  const hasBasic = purchases.some(p => p.productType === "BASIC" && (!itineraryId || p.itineraryId === itineraryId));
  if (hasBasic) return "BASIC";

  return "FREE";
}

export async function canExportItinerary(userId: number, itineraryId: number): Promise<boolean> {
  const tier = await getUserTier(userId, itineraryId);
  return tier === "BASIC" || tier === "PREMIUM";
}

export async function canUseAIChat(userId: number): Promise<boolean> {
  const tier = await getUserTier(userId);
  return tier === "PREMIUM";
}

export async function canViewPremiumContent(userId: number, itineraryId?: number): Promise<boolean> {
  const tier = await getUserTier(userId, itineraryId);
  return tier === "PREMIUM";
}

export async function hasPremiumPurchase(userId: number): Promise<boolean> {
  const tier = await getUserTier(userId);
  return tier === "PREMIUM";
}
