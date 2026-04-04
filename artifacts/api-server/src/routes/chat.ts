import { Router } from "express";
import { db, chatSessionsTable, chatMessagesTable, activitiesTable, itinerariesTable, itineraryItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateChatSessionBody, GetChatMessagesParams, SendChatMessageParams, SendChatMessageBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { canUseAIChat } from "../lib/entitlements";
import OpenAI from "openai";

const router = Router();

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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

    const activities = await db.select({
      id: activitiesTable.id,
      title: activitiesTable.title,
      category: activitiesTable.category,
      description: activitiesTable.description,
      priceLow: activitiesTable.priceLow,
      priceHigh: activitiesTable.priceHigh,
      durationMinutes: activitiesTable.durationMinutes,
      difficulty: activitiesTable.difficulty,
      location: activitiesTable.location,
      bestTimeOfDay: activitiesTable.bestTimeOfDay,
    }).from(activitiesTable);

    const history = await db.select().from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, params.data.sessionId))
      .orderBy(chatMessagesTable.createdAt);

    const systemPrompt = `You are a luxury Aruba adventure concierge for AURELION.

Help users:
- build itineraries
- optimize timing
- choose experiences
- avoid mistakes

Only use activities from this database:
${JSON.stringify(activities, null, 2)}

Never invent provider details or activities not in this list.
Be concise, structured, and confident. Use markdown formatting.`;

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
      });
      aiContent = completion.choices[0]?.message?.content ?? aiContent;
    } else {
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

export default router;
