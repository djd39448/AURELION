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
import { db, activitiesTable, providersTable, userMemoriesTable, usersTable } from "@workspace/db";
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

export async function searchActivities(filters: ActivitySearchFilters) {
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

export async function getActivityDetails(activityId: number) {
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

export async function getVendorDetails(vendorName: string) {
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

export async function searchUserMemory(userId: number, query: string) {
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

export async function saveUserMemory(userId: number, data: SaveMemoryData) {
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

export function getToolDefinition(category: string) {
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

export function getSkill(skillName: string) {
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

// ─── OpenAI Function Definitions for Meta-Tools ─────────────────────────────

/**
 * Returns the OpenAI function-calling tool definitions for all meta-tools.
 * These are always included in every API call.
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
    {
      type: "function",
      function: {
        name: "get_tool_definition",
        description: "Load full tool schemas for a category (itinerary_tools, activity_tools, user_tools). Use when you need to perform actions like creating itineraries or adding activities.",
        parameters: {
          type: "object",
          properties: {
            category: { type: "string", enum: ["itinerary_tools", "activity_tools", "user_tools"] },
          },
          required: ["category"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_skill",
        description: "Load detailed step-by-step workflow instructions for common interactions.",
        parameters: {
          type: "object",
          properties: {
            skill_name: { type: "string", enum: ["itinerary_creation", "activity_recommendation", "booking_assistance", "itinerary_modification", "preference_learning"] },
          },
          required: ["skill_name"],
        },
      },
    },
  ];
}

// ─── Tool Executor ──────────────────────────────────────────────────────────

/**
 * Executes a meta-tool by name with the given arguments.
 * Called by the chat route when OpenAI returns a function_call.
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

    case "get_tool_definition":
      return getToolDefinition(args.category as string);

    case "get_skill":
      return getSkill(args.skill_name as string);

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
