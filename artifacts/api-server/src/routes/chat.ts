/**
 * @module routes/chat
 * @description AI concierge chat routes for AURELION Premium users.
 *
 * ## Architecture: Lazy-Loading Agent
 * - **Tier 1 (always loaded):** Lightweight system prompt assembled from
 *   markdown files + dynamic user context (~3,700 tokens vs old 10,550).
 * - **Tier 2 (on-demand):** Full data loaded via OpenAI function calling
 *   when the AI determines it needs more context.
 * - **Compression:** Old conversation turns are summarized and archived
 *   to keep the context window small.
 * - **User memory:** Preferences and details stored with embeddings for
 *   semantic search across sessions.
 *
 * ## Endpoints
 * - GET  /chat/sessions — List user's chat sessions
 * - POST /chat/sessions — Create a new chat session
 * - GET  /chat/sessions/:id/messages — Get message history
 * - POST /chat/sessions/:id/messages — Send message (non-streaming, with function calling)
 * - POST /chat/sessions/:id/messages/stream — Send message (SSE streaming, with function calling)
 */
import { Router } from "express";
import { db, chatSessionsTable, chatMessagesTable, activitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateChatSessionBody, GetChatMessagesParams, SendChatMessageParams, SendChatMessageBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.js";
import { canUseAIChat } from "../lib/entitlements.js";
import { logger } from "../lib/logger.js";
import { assembleSystemPrompt, getRecentMessages } from "../lib/ai-concierge/prompt-assembler.js";
import { getMetaToolDefinitions, executeTool } from "../lib/ai-concierge/tools.js";
import { maybeCompressSession } from "../lib/ai-concierge/compression.js";
import OpenAI from "openai";

const router = Router();

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/** Maximum tool-call iterations to prevent infinite loops. */
const MAX_TOOL_ITERATIONS = 5;

// ─── Session CRUD (unchanged) ───────────────────────────────────────────────

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

// ─── Non-Streaming Send (with function calling) ────────────────────────────

router.post("/chat/sessions/:sessionId/messages", async (req, res): Promise<void> => {
  const user = requireAuth(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const aiAllowed = await canUseAIChat(user.id);
  if (!aiAllowed) { res.status(403).json({ error: "Premium required" }); return; }

  const params = SendChatMessageParams.safeParse({ sessionId: Number(req.params.sessionId) });
  if (!params.success) { res.status(400).json({ error: "Invalid session id" }); return; }
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  try {
    const sessionId = params.data.sessionId;
    const [session] = await db.select().from(chatSessionsTable)
      .where(and(eq(chatSessionsTable.id, sessionId), eq(chatSessionsTable.userId, user.id)));
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }

    // Persist user message
    await db.insert(chatMessagesTable).values({
      sessionId,
      role: "user",
      content: parsed.data.content,
    });

    // Maybe compress old messages
    await maybeCompressSession(sessionId);

    let aiContent = "I'm here to help you plan the perfect Aruba adventure. What would you like to explore?";

    if (openai) {
      // Assemble lightweight Tier 1 prompt + recent messages
      const systemPrompt = await assembleSystemPrompt(user.id, sessionId);
      const recentMessages = await getRecentMessages(sessionId);

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...recentMessages,
      ];

      const tools = getMetaToolDefinitions();

      // Function-calling loop: AI may request tools, we execute and feed results back
      let iterations = 0;
      while (iterations < MAX_TOOL_ITERATIONS) {
        iterations++;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          tools,
          max_tokens: 800,
          temperature: 0.7,
        });

        const choice = completion.choices[0];
        if (!choice) break;

        // If AI wants to call tools
        if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
          messages.push(choice.message);

          for (const toolCall of choice.message.tool_calls) {
            if (toolCall.type !== "function") continue;
            const fn = toolCall.function;
            const args = JSON.parse(fn.arguments);
            logger.info({ tool: fn.name, args }, "AI tool call");

            const result = await executeTool(fn.name, args, user.id);

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          }
          continue; // Let AI process tool results
        }

        // AI returned a text response (done)
        aiContent = choice.message.content ?? aiContent;
        logger.info({ sessionId, tokens: completion.usage, iterations }, "AI concierge response (lazy)");
        break;
      }
    } else {
      // Mock mode
      const activities = await db.select({
        title: activitiesTable.title,
        category: activitiesTable.category,
        priceLow: activitiesTable.priceLow,
        priceHigh: activitiesTable.priceHigh,
      }).from(activitiesTable);
      aiContent = `I'd love to help! Here are suggestions:\n\n${activities.slice(0, 3).map(a => `**${a.title}** — ${a.category}, ~$${a.priceLow}–$${a.priceHigh}`).join("\n")}\n\nWant details on any?`;
    }

    const [aiMessage] = await db.insert(chatMessagesTable).values({
      sessionId,
      role: "assistant",
      content: aiContent,
    }).returning();

    res.json({ ...aiMessage, createdAt: aiMessage.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error sending message");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Streaming Send (SSE with function calling) ────────────────────────────

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
    const sessionId = params.data.sessionId;
    const [session] = await db.select().from(chatSessionsTable)
      .where(and(eq(chatSessionsTable.id, sessionId), eq(chatSessionsTable.userId, user.id)));
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }

    // Persist user message
    await db.insert(chatMessagesTable).values({
      sessionId,
      role: "user",
      content: parsed.data.content,
    });

    // Maybe compress old messages
    await maybeCompressSession(sessionId);

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // --- MOCK MODE ---
    if (!openai) {
      logger.warn("OpenAI API key not set — mock streaming");
      const activities = await db.select({
        title: activitiesTable.title, category: activitiesTable.category,
        priceLow: activitiesTable.priceLow, priceHigh: activitiesTable.priceHigh,
      }).from(activitiesTable);
      const mockResponse = `Here are some top picks:\n\n${activities.slice(0, 3).map(a => `**${a.title}** — ${a.category}, ~$${a.priceLow}–$${a.priceHigh}`).join("\n\n")}\n\nWant details?`;
      for (const word of mockResponse.split(" ")) {
        res.write(`data: ${JSON.stringify({ content: word + " " })}\n\n`);
        await new Promise(r => setTimeout(r, 40));
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      await db.insert(chatMessagesTable).values({ sessionId, role: "assistant", content: mockResponse });
      return;
    }

    // --- REAL MODE: Function calling loop then stream final response ---
    const systemPrompt = await assembleSystemPrompt(user.id, sessionId);
    const recentMessages = await getRecentMessages(sessionId);
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...recentMessages,
    ];
    const tools = getMetaToolDefinitions();

    // Phase 1: Non-streaming tool-calling loop (tools need full responses)
    let iterations = 0;
    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools,
        max_tokens: 800,
        temperature: 0.7,
      });

      const choice = completion.choices[0];
      if (!choice) break;

      if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
        messages.push(choice.message);

        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.type !== "function") continue;
          const fn = toolCall.function;
          const args = JSON.parse(fn.arguments);
          logger.info({ tool: fn.name, args }, "AI tool call (stream)");
          const result = await executeTool(fn.name, args, user.id);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      // AI returned text — but we want to stream it, so break and re-request with streaming
      // If the AI already returned text during tool resolution, use it
      if (choice.message.content) {
        // Stream the already-generated content
        const content = choice.message.content;
        for (const word of content.split(" ")) {
          res.write(`data: ${JSON.stringify({ content: word + " " })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        await db.insert(chatMessagesTable).values({ sessionId, role: "assistant", content });
        logger.info({ sessionId, tokens: completion.usage, iterations }, "AI streamed (from tool loop)");
        return;
      }
      break;
    }

    // Phase 2: Stream final response (if tool loop exhausted without text)
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

    await db.insert(chatMessagesTable).values({ sessionId, role: "assistant", content: fullResponse });
    logger.info({ sessionId, length: fullResponse.length, iterations }, "AI response streamed (lazy)");

  } catch (error) {
    logger.error({ error }, "Error streaming chat message");
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "Failed to get AI response. Please try again." })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;
