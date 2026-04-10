import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * @table user_memories
 *
 * Stores user preferences, details, feedback, and trip summaries with
 * embeddings for semantic search. The AI concierge uses this to personalize
 * recommendations across sessions.
 *
 * **Memory types:**
 * - `preference` — Likes/dislikes ("prefers morning tours", "avoids horseback")
 * - `detail` — Facts about user ("family of 4, kids ages 8+11", "staying at Hilton")
 * - `feedback` — Past experience reviews ("loved ABC Tours UTV")
 * - `trip` — Past itinerary summaries
 * - `concern` — Worries/constraints ("gets seasick", "budget under $100")
 *
 * **Embedding strategy:**
 * Uses OpenAI `text-embedding-3-small` (1536 dimensions) stored as a JSON
 * string. Semantic search is done via cosine similarity in application code.
 * If pgvector is available, raw SQL with `<=>` operator is used for faster
 * indexed search.
 */
export const userMemoriesTable = pgTable("user_memories", {
  id: serial("id").primaryKey(),

  /** @param userId — The user this memory belongs to. */
  userId: integer("user_id").notNull(),

  /**
   * @param memoryType — Category of memory for filtering and display.
   * Valid: "preference" | "detail" | "feedback" | "trip" | "concern"
   */
  memoryType: text("memory_type").notNull(),

  /** @param content — The memory text (e.g., "Prefers morning activities, gets seasick easily"). */
  content: text("content").notNull(),

  /**
   * @param embedding — JSON-stringified float array from text-embedding-3-small.
   * 1536 dimensions. Used for semantic similarity search.
   * Stored as text because Drizzle doesn't have native pgvector column type.
   * Raw SQL queries cast this to `vector(1536)` for cosine similarity search.
   */
  embedding: text("embedding"),

  /** @param lastAccessed — When this memory was last retrieved by the AI. */
  lastAccessed: timestamp("last_accessed", { withTimezone: true }),

  /** @param accessCount — How many times the AI has retrieved this memory. */
  accessCount: integer("access_count").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Zod schema for inserting a user memory.
 * Omits `id` and `createdAt` which are server-generated defaults.
 */
export const insertUserMemorySchema = createInsertSchema(userMemoriesTable).omit({
  id: true,
  createdAt: true,
});

/** TypeScript type for a validated user-memory insert payload. */
export type InsertUserMemory = z.infer<typeof insertUserMemorySchema>;

/** TypeScript type for a full user-memory row as returned by SELECT. */
export type UserMemory = typeof userMemoriesTable.$inferSelect;
