/**
 * @module ai-concierge/compression
 * @description Conversation compression system. When a session has more than
 * 10 messages, it compresses older messages into a summary and archives them.
 * This keeps the active context window small (~5 recent turns) while
 * preserving conversational continuity via the compressed summary.
 *
 * Compression strategy:
 * - Keep the 5 most recent messages verbatim
 * - Summarize all older messages into a compact paragraph
 * - Mark summarized messages as archived (isArchived = true)
 * - Store summary in chatSessionsTable.compressedHistory
 */

import { db, chatSessionsTable, chatMessagesTable } from "@workspace/db";
import { eq, and, lt, asc } from "drizzle-orm";
import OpenAI from "openai";
import { logger } from "../logger.js";

/** Minimum messages before compression triggers. */
const COMPRESSION_THRESHOLD = 10;

/** Number of recent messages to keep verbatim (not compressed). */
const KEEP_RECENT = 5;

/**
 * Estimates the token count for English text.
 * Uses a rough approximation of ~4 characters per token, which is
 * close to the OpenAI tokenizer average for conversational English.
 *
 * @param text - The text to estimate tokens for.
 * @returns Estimated token count (rounded up).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Checks if a session needs compression and performs it if so.
 * Called after each new message is saved.
 *
 * @param sessionId - The chat session to potentially compress
 * @returns true if compression was performed
 */
export async function maybeCompressSession(sessionId: number): Promise<boolean> {
  // Count active (non-archived) messages
  const activeMessages = await db
    .select({
      id: chatMessagesTable.id,
      role: chatMessagesTable.role,
      content: chatMessagesTable.content,
      createdAt: chatMessagesTable.createdAt,
    })
    .from(chatMessagesTable)
    .where(
      and(
        eq(chatMessagesTable.sessionId, sessionId),
        eq(chatMessagesTable.isArchived, false)
      )
    )
    .orderBy(asc(chatMessagesTable.createdAt));

  if (activeMessages.length < COMPRESSION_THRESHOLD) {
    return false;
  }

  // Split: messages to compress vs messages to keep
  const toCompress = activeMessages.slice(0, -KEEP_RECENT);
  const toKeep = activeMessages.slice(-KEEP_RECENT);

  if (toCompress.length === 0) return false;

  // Get existing compressed history (to append to)
  const [session] = await db
    .select({
      compressedHistory: chatSessionsTable.compressedHistory,
      compressionCount: chatSessionsTable.compressionCount,
    })
    .from(chatSessionsTable)
    .where(eq(chatSessionsTable.id, sessionId));

  const existingSummary = session?.compressedHistory || "";

  // Build text to summarize
  const conversationText = toCompress
    .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
    .join("\n\n");

  // Generate summary using OpenAI (or simple fallback)
  let newSummary: string;

  const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Summarize this conversation in 2-3 sentences. Focus on: what the user asked about, key preferences discovered, decisions made, and any actions taken. Be concise.",
          },
          {
            role: "user",
            content: existingSummary
              ? `Previous summary:\n${existingSummary}\n\nNew messages to incorporate:\n${conversationText}`
              : conversationText,
          },
        ],
        max_tokens: 150,
        temperature: 0.3,
      });

      newSummary = completion.choices[0]?.message?.content ?? "";
      logger.info(
        { sessionId, compressed: toCompress.length, tokens: completion.usage },
        "Conversation compressed"
      );
    } catch (err) {
      logger.error({ err }, "Compression failed, using fallback");
      newSummary = fallbackSummary(existingSummary, toCompress);
    }
  } else {
    newSummary = fallbackSummary(existingSummary, toCompress);
  }

  // Archive compressed messages
  const archiveIds = toCompress.map((m) => m.id);
  for (const id of archiveIds) {
    await db
      .update(chatMessagesTable)
      .set({
        isArchived: true,
        tokenCount: estimateTokens(
          toCompress.find((m) => m.id === id)?.content ?? ""
        ),
      })
      .where(eq(chatMessagesTable.id, id));
  }

  // Store compressed summary
  await db
    .update(chatSessionsTable)
    .set({
      compressedHistory: newSummary,
      lastCompressedAt: new Date(),
      compressionCount: (session?.compressionCount ?? 0) + 1,
    })
    .where(eq(chatSessionsTable.id, sessionId));

  return true;
}

/**
 * Simple fallback summary when OpenAI is unavailable.
 * Extracts the first sentence of each user message.
 */
function fallbackSummary(
  existing: string,
  messages: Array<{ role: string; content: string }>
): string {
  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.split(".")[0])
    .join(". ");

  return existing
    ? `${existing} Then discussed: ${userMessages}.`
    : `User discussed: ${userMessages}.`;
}
