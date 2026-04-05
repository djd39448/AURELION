/**
 * @module prompt-assembler
 * @description Assembles the Tier 1 system prompt from markdown files +
 * dynamic user context. Targets ~3,700 tokens baseline vs the old 10,550.
 *
 * Assembly order:
 * 1. identity.md (200 tokens) — Who the AI is
 * 2. agent.md (300 tokens) — How to behave
 * 3. tools-index.md (350 tokens) — Available tool categories
 * 4. skills-index.md (400 tokens) — Available workflows
 * 5. knowledge-index.md (300 tokens) — What data exists
 * 6. user-index (300 tokens) — User quick facts + memory instructions
 * 7. compressed_history (150 tokens) — Summary of old turns
 * 8. [recent turns are sent as separate messages, not in system prompt]
 */

import { readFileSync } from "fs";
import { join } from "path";
import { db, usersTable, chatSessionsTable, chatMessagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { generateUserIndex } from "./user-index-generator.js";

const PROMPTS_DIR = join(__dirname, "prompts");

/** Cache for static prompt files (they don't change at runtime). */
let cachedStaticPrompt: string | null = null;

/**
 * Loads and concatenates the static prompt markdown files.
 * Cached after first load since these files never change at runtime.
 */
function loadStaticPrompts(): string {
  if (cachedStaticPrompt) return cachedStaticPrompt;

  const files = [
    "identity.md",
    "agent.md",
    "tools-index.md",
    "skills-index.md",
    "knowledge-index.md",
  ];

  cachedStaticPrompt = files
    .map((f) => {
      try {
        return readFileSync(join(PROMPTS_DIR, f), "utf-8").trim();
      } catch {
        return `<!-- Missing: ${f} -->`;
      }
    })
    .join("\n\n---\n\n");

  return cachedStaticPrompt;
}

/**
 * Gets or generates the user-specific index section.
 * Uses cached version from DB if fresh, otherwise regenerates.
 */
async function getUserIndex(userId: number): Promise<string> {
  const [user] = await db
    .select({
      name: usersTable.name,
      aiUserIndex: usersTable.aiUserIndex,
      aiIndexUpdatedAt: usersTable.aiIndexUpdatedAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) return "# User\nUnknown user.";

  // Use cached index if it was updated in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (user.aiUserIndex && user.aiIndexUpdatedAt && user.aiIndexUpdatedAt > oneHourAgo) {
    return user.aiUserIndex;
  }

  // Regenerate
  const newIndex = await generateUserIndex(userId);

  // Cache it
  await db
    .update(usersTable)
    .set({ aiUserIndex: newIndex, aiIndexUpdatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  return newIndex;
}

/**
 * Gets the compressed history for a chat session (if any).
 */
async function getCompressedHistory(sessionId: number): Promise<string> {
  const [session] = await db
    .select({ compressedHistory: chatSessionsTable.compressedHistory })
    .from(chatSessionsTable)
    .where(eq(chatSessionsTable.id, sessionId));

  if (!session?.compressedHistory) return "";

  return `# Conversation Summary (earlier messages)\n${session.compressedHistory}`;
}

/**
 * Gets recent (non-archived) messages for a session.
 * These are sent as separate messages in the OpenAI API call, not in the system prompt.
 */
export async function getRecentMessages(
  sessionId: number
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const messages = await db
    .select({
      role: chatMessagesTable.role,
      content: chatMessagesTable.content,
    })
    .from(chatMessagesTable)
    .where(
      and(
        eq(chatMessagesTable.sessionId, sessionId),
        eq(chatMessagesTable.isArchived, false)
      )
    )
    .orderBy(chatMessagesTable.createdAt);

  return messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}

/**
 * Assembles the complete system prompt for a user + session.
 *
 * @param userId - The authenticated user's ID
 * @param sessionId - The chat session ID
 * @returns The system prompt string (~3,700 tokens)
 */
export async function assembleSystemPrompt(
  userId: number,
  sessionId: number
): Promise<string> {
  const [staticPrompt, userIndex, compressedHistory] = await Promise.all([
    Promise.resolve(loadStaticPrompts()),
    getUserIndex(userId),
    getCompressedHistory(sessionId),
  ]);

  const parts = [staticPrompt, userIndex];
  if (compressedHistory) parts.push(compressedHistory);

  return parts.join("\n\n---\n\n");
}
