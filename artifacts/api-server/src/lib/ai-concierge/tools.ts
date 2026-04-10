/**
 * @module ai-concierge/tools
 * @description Implementation of all meta-tools available to the AI concierge.
 * These are the functions that OpenAI function-calling invokes.
 *
 * Meta-tools (always available):
 * - search_activities — Search activity catalog with filters
 * - get_activity_details — Full activity information
 * - get_vendor_details — Complete vendor intelligence
 * - search_user_memory — Semantic search of user memories
 * - save_user_memory — Store new memory about user
 * - get_tool_definition — Load on-demand tool schemas
 * - get_skill — Load workflow instructions
 */

import { readFileSync } from "fs";
import { join } from "path";
import { db, activitiesTable, providersTable, userMemoriesTable, usersTable, itinerariesTable, itineraryItemsTable } from "@workspace/db";
import { eq, and, lte, gte, or, ilike, desc, sql } from "drizzle-orm";
import OpenAI from "openai";
import { logger } from "../logger.js";
import { generateUserIndex } from "./user-index-generator.js";

const DEFINITIONS_DIR = join(__dirname, "definitions");
const SKILLS_DIR = join(__dirname, "skills");

// Lazy-init OpenAI client (only for embeddings in memory tools)
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!_openai && process.env.OPENAI_API_KEY) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// ─── search_activities ──────────────────────────────────────────────────────

interface ActivitySearchFilters {
  category?: string;
  min_price?: number;
  max_price?: number;
  difficulty?: string;
  query?: string;
}

/**
 * Searches the activity catalog with optional filters.
 * All filter conditions are ANDed together; text search uses ILIKE on title/description.
 * Results are capped at 5 to keep AI context concise.
 *
 * @param filters - Search criteria (all optional): category, price range, difficulty, keyword query.
 * @returns Object with `count` and `activities` array containing formatted summaries.
 *
 * @example
 * ```ts
 * const results = await searchActivities({ category: "Ocean", max_price: 100 });
 * // => { count: 3, activities: [{ id: 1, title: "Snorkel Tour", ... }] }
 * ```
 */
export async function searchActivities(filters: ActivitySearchFilters): Promise<{ count: number; activities: Array<Record<string, unknown>> }> {
  const conditions = [];

  if (filters.category) {
    conditions.push(ilike(activitiesTable.category, `%${filters.category}%`));
  }
  if (filters.min_price != null) {
    conditions.push(gte(activitiesTable.priceLow, filters.min_price));
  }
  if (filters.max_price != null) {
    conditions.push(lte(activitiesTable.priceLow, filters.max_price));
  }
  if (filters.difficulty) {
    conditions.push(ilike(activitiesTable.difficulty, filters.difficulty));
  }
  if (filters.query) {
    const term = `%${filters.query}%`;
    conditions.push(
      or(ilike(activitiesTable.title, term), ilike(activitiesTable.description, term))
    );
  }

  const results = await db
    .select({
      id: activitiesTable.id,
      title: activitiesTable.title,
      providerName: activitiesTable.providerName,
      category: activitiesTable.category,
      priceLow: activitiesTable.priceLow,
      priceHigh: activitiesTable.priceHigh,
      durationMinutes: activitiesTable.durationMinutes,
      difficulty: activitiesTable.difficulty,
      location: activitiesTable.location,
    })
    .from(activitiesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(5);

  return {
    count: results.length,
    activities: results.map((a) => ({
      id: a.id,
      title: a.title,
      provider: a.providerName,
      category: a.category,
      price: a.priceLow === a.priceHigh ? `$${a.priceLow}` : `$${a.priceLow}–$${a.priceHigh}`,
      duration: `${a.durationMinutes} min`,
      difficulty: a.difficulty,
      location: a.location,
    })),
  };
}

// ─── get_activity_details ───────────────────────────────────────────────────

/**
 * Fetches full details for a single activity including provider contact info,
 * booking guides, insider tips, and warnings.
 *
 * @param activityId - The activity's database ID (from search results).
 * @returns Full activity detail object, or `{ error }` if not found.
 *
 * @example
 * ```ts
 * const detail = await getActivityDetails(42);
 * // => { id: 42, title: "UTV Off-Road", provider: "ABC Tours", ... }
 * ```
 */
export async function getActivityDetails(activityId: number): Promise<Record<string, unknown>> {
  const [activity] = await db
    .select()
    .from(activitiesTable)
    .where(eq(activitiesTable.id, activityId));

  if (!activity) {
    return { error: `Activity ID ${activityId} not found. Use search_activities to find valid IDs.` };
  }

  return {
    id: activity.id,
    title: activity.title,
    provider: activity.providerName,
    category: activity.category,
    price: activity.priceLow === activity.priceHigh
      ? `$${activity.priceLow}/person`
      : `$${activity.priceLow}–$${activity.priceHigh}/person`,
    duration: `${activity.durationMinutes} minutes`,
    difficulty: activity.difficulty,
    location: activity.location,
    description: activity.description,
    what_to_bring: activity.whatToBring,
    what_to_expect: activity.whatToExpect,
    booking_guide: activity.basicBookingGuide,
    insider_tips: activity.insiderTips,
    warnings: activity.warnings,
    best_time: activity.bestTimeOfDay,
    provider_website: activity.providerWebsite,
    provider_phone: activity.providerPhone,
    provider_whatsapp: activity.providerWhatsapp,
  };
}

// ─── get_vendor_details ─────────────────────────────────────────────────────

/**
 * Fetches complete vendor intelligence: booking methods, insider tips,
 * warnings, and contact information. Uses ILIKE for partial name matching.
 *
 * @param vendorName - Vendor name (partial match via ILIKE).
 * @returns Vendor intelligence object with contact/booking/tips, or `{ error }` if not found.
 *
 * @example
 * ```ts
 * const vendor = await getVendorDetails("ABC Tours");
 * // => { name: "ABC Tours Aruba", confidence: 0.95, contact: { ... }, ... }
 * ```
 */
export async function getVendorDetails(vendorName: string): Promise<Record<string, unknown>> {
  const [vendor] = await db
    .select({
      name: providersTable.name,
      websiteUrl: providersTable.websiteUrl,
      phone: providersTable.phone,
      whatsapp: providersTable.whatsapp,
      bestBookingMethod: providersTable.bestBookingMethod,
      whenToBook: providersTable.whenToBook,
      whatToSay: providersTable.whatToSay,
      insiderTips: providersTable.insiderTips,
      warnings: providersTable.warnings,
      intelligenceReport: providersTable.intelligenceReport,
      bookingConfidence: providersTable.bookingConfidence,
    })
    .from(providersTable)
    .where(ilike(providersTable.name, `%${vendorName}%`));

  if (!vendor) {
    return { error: `Vendor "${vendorName}" not found. Try a different name or use search_activities.` };
  }

  return {
    name: vendor.name,
    confidence: vendor.bookingConfidence,
    contact: {
      website: vendor.websiteUrl,
      phone: vendor.phone,
      whatsapp: vendor.whatsapp,
    },
    booking: {
      best_method: vendor.bestBookingMethod,
      when_to_book: vendor.whenToBook,
      what_to_say: vendor.whatToSay,
    },
    insider_tips: vendor.insiderTips ?? [],
    warnings: vendor.warnings ?? [],
    intelligence_report: vendor.intelligenceReport,
  };
}

// ─── search_user_memory ─────────────────────────────────────────────────────

/**
 * Searches the user's stored memories using semantic similarity (pgvector cosine)
 * when OpenAI embeddings are available, falling back to keyword ILIKE search.
 * Updates access stats (lastAccessed, accessCount) for retrieved memories.
 *
 * @param userId - The authenticated user's ID.
 * @param query - Natural language query (e.g., "budget constraints", "family details").
 * @returns Object with `count` and `memories` array, each with content, type, and relevance score.
 *
 * @example
 * ```ts
 * const results = await searchUserMemory(7, "budget constraints");
 * // => { count: 2, memories: [{ content: "Budget under $100/person", type: "concern", relevance: 0.87 }] }
 * ```
 */
export async function searchUserMemory(userId: number, query: string): Promise<{ count: number; memories: Array<{ content: string; type: string; relevance: number }> }> {
  const openai = getOpenAI();

  if (!openai) {
    // Fallback: keyword search without embeddings
    const results = await db
      .select({
        content: userMemoriesTable.content,
        memoryType: userMemoriesTable.memoryType,
        createdAt: userMemoriesTable.createdAt,
      })
      .from(userMemoriesTable)
      .where(
        and(
          eq(userMemoriesTable.userId, userId),
          ilike(userMemoriesTable.content, `%${query}%`)
        )
      )
      .orderBy(desc(userMemoriesTable.accessCount))
      .limit(3);

    return {
      count: results.length,
      memories: results.map((m) => ({
        content: m.content,
        type: m.memoryType,
        relevance: 0.5,
      })),
    };
  }

  // Generate embedding for query
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const queryVector = JSON.stringify(embeddingResponse.data[0].embedding);

  // Semantic search via cosine similarity
  const results = await db.execute(sql`
    SELECT
      id,
      content,
      memory_type,
      created_at,
      1 - (embedding::vector <=> ${queryVector}::vector) AS similarity
    FROM user_memories
    WHERE user_id = ${userId}
      AND embedding IS NOT NULL
    ORDER BY embedding::vector <=> ${queryVector}::vector
    LIMIT 3
  `);

  // Update access stats
  const rows = results.rows as Array<{
    id: number;
    content: string;
    memory_type: string;
    similarity: number;
  }>;

  if (rows.length > 0) {
    const ids = rows.map((m) => m.id);
    await db.execute(sql`
      UPDATE user_memories
      SET last_accessed = NOW(), access_count = access_count + 1
      WHERE id = ANY(ARRAY[${sql.join(ids.map((id) => sql`${id}`), sql`, `)}])
    `);
  }

  return {
    count: rows.length,
    memories: rows.map((m) => ({
      content: m.content,
      type: m.memory_type,
      relevance: Math.round(Number(m.similarity) * 100) / 100,
    })),
  };
}

// ─── save_user_memory ───────────────────────────────────────────────────────

interface SaveMemoryData {
  type: "preference" | "detail" | "feedback" | "trip" | "concern";
  content: string;
}

/**
 * Persists a new memory about the user for future personalization.
 * Generates an OpenAI embedding for semantic search (when available),
 * and regenerates the user's AI index for important memory types.
 *
 * @param userId - The authenticated user's ID.
 * @param data - Memory payload with type (preference/detail/feedback/trip/concern) and content.
 * @returns Success confirmation with the new memory's database ID.
 *
 * @example
 * ```ts
 * const result = await saveUserMemory(7, { type: "preference", content: "Prefers morning tours" });
 * // => { success: true, memory_id: 42, type: "preference" }
 * ```
 */
export async function saveUserMemory(userId: number, data: SaveMemoryData): Promise<{ success: boolean; memory_id: number; type: string }> {
  const openai = getOpenAI();
  let embeddingJson: string | null = null;

  // Generate embedding if OpenAI available
  if (openai) {
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: data.content,
      });
      embeddingJson = JSON.stringify(embeddingResponse.data[0].embedding);
    } catch (err) {
      logger.warn({ err }, "Failed to generate embedding for user memory");
    }
  }

  const [memory] = await db
    .insert(userMemoriesTable)
    .values({
      userId,
      memoryType: data.type,
      content: data.content,
      embedding: embeddingJson,
    })
    .returning();

  // Regenerate user index for important memory types
  const importantTypes = ["preference", "detail", "concern"];
  if (importantTypes.includes(data.type)) {
    try {
      const newIndex = await generateUserIndex(userId);
      await db
        .update(usersTable)
        .set({ aiUserIndex: newIndex, aiIndexUpdatedAt: new Date() })
        .where(eq(usersTable.id, userId));
    } catch (err) {
      logger.warn({ err }, "Failed to regenerate user index");
    }
  }

  return {
    success: true,
    memory_id: memory.id,
    type: data.type,
  };
}

// ─── get_tool_definition ────────────────────────────────────────────────────

/**
 * Loads on-demand tool definitions from JSON files.
 * Used by the AI to dynamically discover available tool schemas
 * without bloating the base prompt.
 *
 * @param category - Tool category: "itinerary_tools", "activity_tools", or "user_tools".
 * @returns Object with `category` and `tools` array, or `{ error }` for invalid/missing categories.
 *
 * @example
 * ```ts
 * const defs = getToolDefinition("itinerary_tools");
 * // => { category: "itinerary_tools", tools: [{ name: "add_to_itinerary", ... }] }
 * ```
 */
export function getToolDefinition(category: string): Record<string, unknown> {
  const valid = ["itinerary_tools", "activity_tools", "user_tools"];
  if (!valid.includes(category)) {
    return { error: `Invalid category: ${category}. Valid: ${valid.join(", ")}` };
  }

  try {
    const filePath = join(DEFINITIONS_DIR, `${category}.json`);
    const definitions = JSON.parse(readFileSync(filePath, "utf-8"));
    return { category, tools: definitions };
  } catch {
    return { error: `Could not load tool definitions for ${category}` };
  }
}

// ─── get_skill ──────────────────────────────────────────────────────────────

/**
 * Loads a workflow instruction file (markdown) for the AI to follow
 * when executing multi-step tasks like itinerary creation or booking assistance.
 *
 * @param skillName - One of: "itinerary_creation", "activity_recommendation",
 *   "booking_assistance", "itinerary_modification", "preference_learning".
 * @returns Object with `skill` name and `workflow` markdown, or `{ error }` for invalid/missing skills.
 *
 * @example
 * ```ts
 * const skill = getSkill("booking_assistance");
 * // => { skill: "booking_assistance", workflow: "# Booking Assistance\n..." }
 * ```
 */
export function getSkill(skillName: string): Record<string, unknown> {
  const valid = [
    "itinerary_creation",
    "activity_recommendation",
    "booking_assistance",
    "itinerary_modification",
    "preference_learning",
  ];
  if (!valid.includes(skillName)) {
    return { error: `Invalid skill: ${skillName}. Valid: ${valid.join(", ")}` };
  }

  try {
    const filePath = join(SKILLS_DIR, `${skillName}.md`);
    const workflow = readFileSync(filePath, "utf-8");
    return { skill: skillName, workflow };
  } catch {
    return { error: `Could not load skill: ${skillName}` };
  }
}

// ─── Itinerary Tools (directly callable) ────────────────────────────────────

/**
 * Lists all itineraries belonging to a user, ordered newest-first.
 * Returns lightweight summaries (no items) for AI tool responses.
 *
 * @param userId - The authenticated user's ID.
 * @returns Object with `count` and `itineraries` array containing id, title, totalDays, status.
 *
 * @example
 * ```ts
 * const list = await listUserItineraries(7);
 * // => { count: 2, itineraries: [{ id: 1, title: "Aruba Week", totalDays: 5, status: "draft" }] }
 * ```
 */
export async function listUserItineraries(userId: number): Promise<{ count: number; itineraries: Array<Record<string, unknown>> }> {
  const results = await db
    .select({
      id: itinerariesTable.id,
      title: itinerariesTable.title,
      totalDays: itinerariesTable.totalDays,
      status: itinerariesTable.status,
    })
    .from(itinerariesTable)
    .where(eq(itinerariesTable.userId, userId))
    .orderBy(desc(itinerariesTable.createdAt));

  return { count: results.length, itineraries: results };
}

/**
 * Adds an activity to a specific day and time slot in the user's itinerary.
 * Validates ownership, day range, and slot availability before inserting.
 *
 * @param userId - The authenticated user's ID (for ownership verification).
 * @param params - Placement details: itinerary_id, activity_id, day (1-indexed), time_slot.
 * @returns Success message with item_id, or `{ error }` on validation failure.
 *
 * @example
 * ```ts
 * const result = await addToItinerary(7, { itinerary_id: 1, activity_id: 42, day: 2, time_slot: "morning" });
 * // => { success: true, message: 'Added "Snorkel Tour" to Day 2 morning', item_id: 15 }
 * ```
 */
export async function addToItinerary(
  userId: number,
  params: { itinerary_id: number; activity_id: number; day: number; time_slot: string }
): Promise<Record<string, unknown>> {
  // Verify ownership
  const [itinerary] = await db
    .select({ id: itinerariesTable.id, userId: itinerariesTable.userId, totalDays: itinerariesTable.totalDays })
    .from(itinerariesTable)
    .where(eq(itinerariesTable.id, params.itinerary_id));

  if (!itinerary || itinerary.userId !== userId) {
    return { error: "Itinerary not found or access denied" };
  }
  if (params.day < 1 || params.day > itinerary.totalDays) {
    return { error: `Invalid day. This itinerary has ${itinerary.totalDays} days.` };
  }

  // Check slot
  const [existing] = await db
    .select({ id: itineraryItemsTable.id })
    .from(itineraryItemsTable)
    .where(
      and(
        eq(itineraryItemsTable.itineraryId, params.itinerary_id),
        eq(itineraryItemsTable.dayNumber, params.day),
        eq(itineraryItemsTable.timeSlot, params.time_slot)
      )
    );

  if (existing) {
    return { error: `${params.time_slot} slot on day ${params.day} is already occupied. Choose a different slot or remove the existing activity.` };
  }

  const [item] = await db
    .insert(itineraryItemsTable)
    .values({
      itineraryId: params.itinerary_id,
      activityId: params.activity_id,
      dayNumber: params.day,
      timeSlot: params.time_slot,
    })
    .returning();

  // Get activity title for confirmation
  const [activity] = await db
    .select({ title: activitiesTable.title })
    .from(activitiesTable)
    .where(eq(activitiesTable.id, params.activity_id));

  return {
    success: true,
    message: `Added "${activity?.title ?? "activity"}" to Day ${params.day} ${params.time_slot}`,
    item_id: item.id,
  };
}

/**
 * Removes an activity from the user's itinerary by item ID.
 * Validates itinerary ownership before deletion.
 *
 * @param userId - The authenticated user's ID (for ownership verification).
 * @param params - Removal target: itinerary_id and item_id.
 * @returns `{ success: true, message }` or `{ error }` on failure.
 *
 * @example
 * ```ts
 * const result = await removeFromItinerary(7, { itinerary_id: 1, item_id: 15 });
 * // => { success: true, message: "Activity removed from itinerary" }
 * ```
 */
export async function removeFromItinerary(
  userId: number,
  params: { itinerary_id: number; item_id: number }
): Promise<Record<string, unknown>> {
  const [itinerary] = await db
    .select({ userId: itinerariesTable.userId })
    .from(itinerariesTable)
    .where(eq(itinerariesTable.id, params.itinerary_id));

  if (!itinerary || itinerary.userId !== userId) {
    return { error: "Itinerary not found or access denied" };
  }

  await db
    .delete(itineraryItemsTable)
    .where(
      and(
        eq(itineraryItemsTable.id, params.item_id),
        eq(itineraryItemsTable.itineraryId, params.itinerary_id)
      )
    );

  return { success: true, message: "Activity removed from itinerary" };
}

/**
 * Fetches full itinerary details including all scheduled activities per day/time slot.
 * Joins itinerary items with activity data for a complete view.
 *
 * @param userId - The authenticated user's ID (for ownership verification).
 * @param itineraryId - The itinerary's database ID.
 * @returns Full itinerary with items array, or `{ error }` if not found or access denied.
 *
 * @example
 * ```ts
 * const detail = await getItineraryDetails(7, 1);
 * // => { id: 1, title: "Aruba Week", total_days: 5, items: [{ day: 1, time_slot: "morning", ... }] }
 * ```
 */
export async function getItineraryDetails(userId: number, itineraryId: number): Promise<Record<string, unknown>> {
  const [itinerary] = await db
    .select()
    .from(itinerariesTable)
    .where(eq(itinerariesTable.id, itineraryId));

  if (!itinerary || itinerary.userId !== userId) {
    return { error: "Itinerary not found or access denied" };
  }

  const items = await db
    .select({
      item_id: itineraryItemsTable.id,
      day: itineraryItemsTable.dayNumber,
      time_slot: itineraryItemsTable.timeSlot,
      activity_title: activitiesTable.title,
      activity_id: activitiesTable.id,
      price: activitiesTable.priceLow,
    })
    .from(itineraryItemsTable)
    .innerJoin(activitiesTable, eq(itineraryItemsTable.activityId, activitiesTable.id))
    .where(eq(itineraryItemsTable.itineraryId, itineraryId));

  return {
    id: itinerary.id,
    title: itinerary.title,
    total_days: itinerary.totalDays,
    status: itinerary.status,
    items: items.map((i) => ({
      item_id: i.item_id,
      day: i.day,
      time_slot: i.time_slot,
      activity_id: i.activity_id,
      activity: i.activity_title,
      price: `$${i.price}`,
    })),
  };
}

// ─── OpenAI Function Definitions for Meta-Tools ─────────────────────────────

/**
 * Returns the OpenAI function-calling tool definitions for all meta-tools.
 * These are always included in every API call to enable the AI to search
 * activities, manage itineraries, and access user memory.
 *
 * @returns Array of OpenAI ChatCompletionTool objects defining all available functions.
 *
 * @example
 * ```ts
 * const tools = getMetaToolDefinitions();
 * const completion = await openai.chat.completions.create({ model: "gpt-4o-mini", messages, tools });
 * ```
 */
export function getMetaToolDefinitions(): OpenAI.ChatCompletionTool[] {
  return [
    {
      type: "function",
      function: {
        name: "search_activities",
        description: "Search the activity catalog with filters. Returns top 5 matching activities.",
        parameters: {
          type: "object",
          properties: {
            category: { type: "string", description: "Activity category (e.g., 'Ocean Exploration', 'Off-Road Expeditions')" },
            max_price: { type: "number", description: "Maximum price per person in USD" },
            min_price: { type: "number", description: "Minimum price per person in USD" },
            difficulty: { type: "string", description: "Difficulty level (Easy, Moderate, Challenging)" },
            query: { type: "string", description: "Keyword search in title/description" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_activity_details",
        description: "Get complete details for an activity including description, booking guide, and provider info.",
        parameters: {
          type: "object",
          properties: {
            activity_id: { type: "number", description: "Activity ID from search results" },
          },
          required: ["activity_id"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_vendor_details",
        description: "Get complete vendor intelligence: booking methods, insider tips, warnings, contacts.",
        parameters: {
          type: "object",
          properties: {
            vendor_name: { type: "string", description: "Vendor name (partial match supported)" },
          },
          required: ["vendor_name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "search_user_memory",
        description: "Search this user's stored memories (preferences, details, concerns, feedback) using semantic similarity.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Natural language query (e.g., 'budget constraints', 'family details')" },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "save_user_memory",
        description: "Save an important memory about the user for future personalization. Only save meaningful preferences, details, concerns, or feedback.",
        parameters: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["preference", "detail", "feedback", "trip", "concern"], description: "Memory category" },
            content: { type: "string", description: "The memory content to save" },
          },
          required: ["type", "content"],
        },
      },
    },
    // ─── Itinerary Tools (directly callable) ─────────────
    {
      type: "function",
      function: {
        name: "list_user_itineraries",
        description: "List all of this user's itineraries with their IDs, titles, and day counts.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "get_itinerary_details",
        description: "Get full itinerary details including all scheduled activities per day/time slot.",
        parameters: {
          type: "object",
          properties: {
            itinerary_id: { type: "number", description: "Itinerary ID" },
          },
          required: ["itinerary_id"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "add_to_itinerary",
        description: "Add an activity to a specific day and time slot in the user's itinerary.",
        parameters: {
          type: "object",
          properties: {
            itinerary_id: { type: "number", description: "Itinerary ID" },
            activity_id: { type: "number", description: "Activity ID from search results" },
            day: { type: "number", description: "Day number (1-indexed)" },
            time_slot: { type: "string", enum: ["morning", "afternoon", "evening"], description: "Time slot" },
          },
          required: ["itinerary_id", "activity_id", "day", "time_slot"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "remove_from_itinerary",
        description: "Remove an activity from the user's itinerary by item ID.",
        parameters: {
          type: "object",
          properties: {
            itinerary_id: { type: "number", description: "Itinerary ID" },
            item_id: { type: "number", description: "Itinerary item ID (from get_itinerary_details)" },
          },
          required: ["itinerary_id", "item_id"],
        },
      },
    },
  ];
}

// ─── Tool Executor ──────────────────────────────────────────────────────────

/**
 * Executes a meta-tool by name with the given arguments.
 * Called by the chat route when OpenAI returns a function_call.
 * Routes to the appropriate handler based on the tool name string.
 *
 * @param toolName - The function name from the OpenAI tool_call (e.g., "search_activities").
 * @param args - Parsed JSON arguments from the tool call.
 * @param userId - The authenticated user's ID (passed to user-scoped tools).
 * @returns The tool's result object, or `{ error }` for unknown tool names.
 *
 * @example
 * ```ts
 * const result = await executeTool("search_activities", { category: "Ocean" }, userId);
 * ```
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: number
): Promise<unknown> {
  switch (toolName) {
    case "search_activities":
      return searchActivities(args as ActivitySearchFilters);

    case "get_activity_details":
      return getActivityDetails(args.activity_id as number);

    case "get_vendor_details":
      return getVendorDetails(args.vendor_name as string);

    case "search_user_memory":
      return searchUserMemory(userId, args.query as string);

    case "save_user_memory":
      return saveUserMemory(userId, args as unknown as SaveMemoryData);

    case "list_user_itineraries":
      return listUserItineraries(userId);

    case "get_itinerary_details":
      return getItineraryDetails(userId, args.itinerary_id as number);

    case "add_to_itinerary":
      return addToItinerary(userId, args as { itinerary_id: number; activity_id: number; day: number; time_slot: string });

    case "remove_from_itinerary":
      return removeFromItinerary(userId, args as { itinerary_id: number; item_id: number });

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
