/**
 * @module user-index-generator
 * @description Generates the dynamic user-index section of the system prompt.
 * Pulls user's stored memories and creates a compact summary (~300 tokens)
 * that gives the AI quick context about who it's talking to.
 */

import { db, usersTable, userMemoriesTable, chatSessionsTable, chatMessagesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

/**
 * Generates a user-index markdown section for the system prompt.
 * Includes: user name, top memories as quick facts, memory count,
 * and last session summary.
 */
export async function generateUserIndex(userId: number): Promise<string> {
  // Fetch user name
  const [user] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) return "# User\nUnknown user.";

  // Fetch recent/important memories (top 5 by access count + recency)
  const memories = await db
    .select({
      content: userMemoriesTable.content,
      memoryType: userMemoriesTable.memoryType,
      accessCount: userMemoriesTable.accessCount,
    })
    .from(userMemoriesTable)
    .where(eq(userMemoriesTable.userId, userId))
    .orderBy(desc(userMemoriesTable.accessCount), desc(userMemoriesTable.createdAt))
    .limit(5);

  // Count total memories
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userMemoriesTable)
    .where(eq(userMemoriesTable.userId, userId));
  const memoryCount = countResult?.count ?? 0;

  // Get last session summary (most recent assistant message from most recent session)
  const lastSession = await db
    .select({
      sessionId: chatSessionsTable.id,
      createdAt: chatSessionsTable.createdAt,
    })
    .from(chatSessionsTable)
    .where(eq(chatSessionsTable.userId, userId))
    .orderBy(desc(chatSessionsTable.createdAt))
    .limit(1);

  let lastSessionSummary = "No previous sessions.";
  if (lastSession.length > 0) {
    const lastMessages = await db
      .select({ content: chatMessagesTable.content, role: chatMessagesTable.role })
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, lastSession[0].sessionId))
      .orderBy(desc(chatMessagesTable.createdAt))
      .limit(2);

    if (lastMessages.length > 0) {
      const userMsg = lastMessages.find((m) => m.role === "user");
      lastSessionSummary = userMsg
        ? `Last asked about: "${userMsg.content.slice(0, 80)}..."`
        : "Had a previous conversation.";
    }
  }

  // Build the index
  const quickFacts =
    memories.length > 0
      ? memories.map((m) => `- [${m.memoryType}] ${m.content}`).join("\n")
      : "- No memories stored yet (new user)";

  return `# User: ${user.name}

## Quick Facts
${quickFacts}

## Memory Available
${memoryCount} memories stored. Use search_user_memory("topic") to recall specific details.

## Last Session
${lastSessionSummary}`;
}
