import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request } from "express";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getUserFromSession(req: Request) {
  const userId = (req.session as Record<string, unknown>)?.userId as number | undefined;
  if (!userId) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return user ?? null;
}

export function requireAuth(req: Request): { id: number; email: string; name: string; role: string } | null {
  const userId = (req.session as Record<string, unknown>)?.userId as number | undefined;
  if (!userId) return null;
  const sessionUser = (req.session as Record<string, unknown>)?.user as { id: number; email: string; name: string; role: string } | undefined;
  return sessionUser ?? null;
}
