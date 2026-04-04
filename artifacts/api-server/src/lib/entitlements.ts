import { db, purchasesTable, itinerariesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export async function getUserTier(userId: number, itineraryId?: number): Promise<"FREE" | "BASIC" | "PREMIUM"> {
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
  const purchases = await db.select().from(purchasesTable)
    .where(and(
      eq(purchasesTable.userId, userId),
      eq(purchasesTable.status, "completed")
    ));
  return purchases.some(p => p.productType === "PREMIUM");
}
