/**
 * @module routes/chat
 * @description AI concierge chat routes for AURELION Premium users.
 *
 * ## Access control
 * - All routes require authentication.
 * - Session creation and message sending require Premium entitlement,
 *   verified via {@link canUseAIChat}.
 * - Session ownership is verified on all message-level operations.
 *
 * ## AI integration
 * - Uses OpenAI `gpt-4o-mini` with 800 max tokens per response.
 * - The system prompt injects ALL activities from the database as JSON
 *   context, ensuring the AI only recommends real, bookable activities.
 * - Full conversation history is sent with each request for context continuity.
 *
 * ## Mock mode
 * - When `OPENAI_API_KEY` is not set, the `openai` client is null.
 * - Mock mode returns formatted suggestions from the first 3 activities in
 *   the database, enabling development/testing without an OpenAI account.
 */
import { Router } from "express";
import { db, chatSessionsTable, chatMessagesTable, activitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateChatSessionBody, GetChatMessagesParams, SendChatMessageParams, SendChatMessageBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { canUseAIChat } from "../lib/entitlements";
import { logger } from "../lib/logger";
import { buildConciergeSystemPrompt } from "../lib/ai-concierge-prompt";
import OpenAI from "openai";

const router = Router();

/**
 * OpenAI client instance. Null when OPENAI_API_KEY is not configured,
 * which activates mock mode — AI responses are replaced with static
 * activity suggestions from the database.
 */
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * @route GET /api/chat/sessions
 * @auth Required
 * @tier PREMIUM (implicitly — only Premium users can create sessions, but listing is not tier-gated)
 * @returns {Array<ChatSession>} User's chat sessions ordered by `createdAt` ascending.
 *   Each session includes: id, userId, itineraryId, createdAt (ISO 8601).
 * @throws {401} Unauthorized
 * @throws {500} Internal server error
 */
router.get("/chat/sessions", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const sessions = await db.select().from(chatSessionsTable)
      .where(eq(chatSessionsTable.userId, user.id))
      .orderBy(chatSessionsTable.createdAt);
    res.json(sessions.map(s => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing chat sessions");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /api/chat/sessions
 * @auth Required
 * @tier PREMIUM — entitlement-gated via {@link canUseAIChat}
 * @body {CreateChatSessionBody} — `{ itineraryId?: number }` (optional link to an itinerary)
 * @returns {ChatSession} The newly created session (HTTP 201)
 * @throws {401} Unauthorized
 * @throws {403} "Upgrade to Concierge Intelligence to access AI chat"
 * @throws {500} Internal server error
 *
 * @remarks If body parsing fails, `itineraryId` defaults to null (session
 * is created without an itinerary link). This is intentional — the body
 * schema is optional.
 */
router.post("/chat/sessions", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const aiAllowed = await canUseAIChat(user.id);
  if (!aiAllowed) {
    res.status(403).json({ error: "Upgrade to Concierge Intelligence to access AI chat" });
    return;
  }
  const parsed = CreateChatSessionBody.safeParse(req.body);
  try {
    const [session] = await db.insert(chatSessionsTable).values({
      userId: user.id,
      itineraryId: parsed.success ? (parsed.data.itineraryId ?? null) : null,
    }).returning();
    res.status(201).json({ ...session, createdAt: session.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error creating chat session");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route GET /api/chat/sessions/:sessionId/messages
 * @auth Required
 * @returns {Array<ChatMessage>} Message history for the session, ordered by
 *   `createdAt` ascending. Each message includes: id, sessionId, role
 *   ("user" | "assistant"), content, createdAt (ISO 8601).
 * @throws {400} Invalid session ID
 * @throws {401} Unauthorized
 * @throws {404} Session not found (or belongs to another user — ownership verified)
 * @throws {500} Internal server error
 */
router.get("/chat/sessions/:sessionId/messages", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = GetChatMessagesParams.safeParse({ sessionId: Number(req.params.sessionId) });
  if (!params.success) { res.status(400).json({ error: "Invalid session id" }); return; }
  try {
    const [session] = await db.select().from(chatSessionsTable)
      .where(and(eq(chatSessionsTable.id, params.data.sessionId), eq(chatSessionsTable.userId, user.id)));
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    const messages = await db.select().from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, params.data.sessionId))
      .orderBy(chatMessagesTable.createdAt);
    res.json(messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error fetching messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /api/chat/sessions/:sessionId/messages
 * @auth Required
 * @tier PREMIUM — entitlement re-checked on every message send
 * @body {SendChatMessageBody} — `{ content: string }` — the user's message text
 * @returns {ChatMessage} The AI assistant's response message (role: "assistant").
 *   Includes: id, sessionId, role, content (markdown-formatted), createdAt.
 * @throws {400} Invalid session ID or Zod validation failure
 * @throws {401} Unauthorized
 * @throws {403} "Premium required" — entitlement check failed
 * @throws {404} Session not found (or belongs to another user)
 * @throws {500} Internal server error / OpenAI API failure
 *
 * @description Sends a user message and returns the AI concierge response.
 *
 * ## Flow:
 * 1. Verify auth and Premium entitlement.
 * 2. Verify session ownership.
 * 3. Persist the user's message to `chatMessagesTable`.
 * 4. Load ALL activities from the database (used as AI context).
 * 5. Load full conversation history for the session.
 * 6. Build the system prompt with activity catalog JSON.
 * 7. Call OpenAI `gpt-4o-mini` (or return mock suggestions if no API key).
 * 8. Persist and return the assistant's response.
 *
 * ## System prompt behavior:
 * The AI is instructed to act as a luxury Aruba adventure concierge.
 * It receives the complete activity database as JSON and is forbidden from
 * inventing activities or provider details not in the catalog.
 *
 * ## Mock mode:
 * Returns a markdown-formatted message suggesting the first 3 activities
 * from the database with their price ranges.
 */
router.post("/chat/sessions/:sessionId/messages", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const aiAllowed = await canUseAIChat(user.id);
  if (!aiAllowed) {
    res.status(403).json({ error: "Premium required" });
    return;
  }
  const params = SendChatMessageParams.safeParse({ sessionId: Number(req.params.sessionId) });
  if (!params.success) { res.status(400).json({ error: "Invalid session id" }); return; }
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [session] = await db.select().from(chatSessionsTable)
      .where(and(eq(chatSessionsTable.id, params.data.sessionId), eq(chatSessionsTable.userId, user.id)));
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }

    await db.insert(chatMessagesTable).values({
      sessionId: params.data.sessionId,
      role: "user",
      content: parsed.data.content,
    });

    // Build rich system prompt with all vendor intelligence + activity catalog
    const systemPrompt = await buildConciergeSystemPrompt();

    const history = await db.select().from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, params.data.sessionId))
      .orderBy(chatMessagesTable.createdAt);

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...history.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    let aiContent = "I'm here to help you plan the perfect Aruba adventure. What would you like to explore?";

    if (openai) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 800,
        temperature: 0.7,
      });
      aiContent = completion.choices[0]?.message?.content ?? aiContent;
      logger.info({ sessionId: params.data.sessionId, tokens: completion.usage }, "AI concierge response");
    } else {
      // Mock mode: suggest first 3 activities from DB
      const activities = await db.select({
        title: activitiesTable.title,
        category: activitiesTable.category,
        priceLow: activitiesTable.priceLow,
        priceHigh: activitiesTable.priceHigh,
      }).from(activitiesTable);
      aiContent = `I'd love to help you plan your Aruba adventure! Based on our activities, here are some suggestions:\n\n${activities.slice(0, 3).map(a => `**${a.title}** — ${a.category}, ~$${a.priceLow}-${a.priceHigh}`).join("\n")}\n\nWould you like me to build an itinerary around any of these?`;
    }

    const [aiMessage] = await db.insert(chatMessagesTable).values({
      sessionId: params.data.sessionId,
      role: "assistant",
      content: aiContent,
    }).returning();

    res.json({ ...aiMessage, createdAt: aiMessage.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error sending message");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /api/chat/sessions/:sessionId/messages/stream
 * @auth Required
 * @tier PREMIUM — entitlement re-checked on every message send
 * @body {SendChatMessageBody} — `{ content: string }`
 * @returns Server-Sent Events stream of AI response chunks.
 *   Each event is `data: {"content":"..."}\n\n` or `data: {"done":true}\n\n`.
 *   On error: `data: {"error":"..."}\n\n`.
 *
 * @description Streams the AI concierge response token-by-token using SSE.
 * Saves both user message and completed AI response to the database.
 * Falls back to a simulated streaming mock when OPENAI_API_KEY is absent.
 */
router.post("/chat/sessions/:sessionId/messages/stream", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const aiAllowed = await canUseAIChat(user.id);
  if (!aiAllowed) { res.status(403).json({ error: "Premium required" }); return; }

  const params = SendChatMessageParams.safeParse({ sessionId: Number(req.params.sessionId) });
  if (!params.success) { res.status(400).json({ error: "Invalid session id" }); return; }
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  try {
    // Verify session ownership
    const [session] = await db.select().from(chatSessionsTable)
      .where(and(eq(chatSessionsTable.id, params.data.sessionId), eq(chatSessionsTable.userId, user.id)));
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }

    // Persist user message
    await db.insert(chatMessagesTable).values({
      sessionId: params.data.sessionId,
      role: "user",
      content: parsed.data.content,
    });

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // --- MOCK MODE ---
    if (!openai) {
      logger.warn("OpenAI API key not set — using mock streaming response");

      const activities = await db.select({
        title: activitiesTable.title,
        category: activitiesTable.category,
        priceLow: activitiesTable.priceLow,
        priceHigh: activitiesTable.priceHigh,
      }).from(activitiesTable);

      const mockResponse = `I'd love to help plan your Aruba adventure!\n\nHere are some top picks:\n\n${activities
        .slice(0, 3)
        .map((a) => `**${a.title}** — ${a.category}, ~$${a.priceLow}–$${a.priceHigh}`)
        .join("\n\n")}\n\nWould you like details on any of these?`;

      // Simulate token-by-token streaming
      const words = mockResponse.split(" ");
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ content: word + " " })}\n\n`);
        await new Promise((r) => setTimeout(r, 40));
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      await db.insert(chatMessagesTable).values({
        sessionId: params.data.sessionId,
        role: "assistant",
        content: mockResponse,
      });
      return;
    }

    // --- REAL STREAMING MODE ---
    const systemPrompt = await buildConciergeSystemPrompt();

    const history = await db.select().from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, params.data.sessionId))
      .orderBy(chatMessagesTable.createdAt);

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 800,
      temperature: 0.7,
      stream: true,
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    // Persist complete AI response
    await db.insert(chatMessagesTable).values({
      sessionId: params.data.sessionId,
      role: "assistant",
      content: fullResponse,
    });

    logger.info({ sessionId: params.data.sessionId, length: fullResponse.length }, "AI response streamed");

  } catch (error) {
    logger.error({ error }, "Error streaming chat message");
    // Try to send error via SSE if headers already sent, otherwise JSON
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "Failed to get AI response. Please try again." })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;
