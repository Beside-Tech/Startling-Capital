import { Router } from "express";
import { db } from "@workspace/db";
import {
  diligenceQaThreadsTable, diligenceQaMessagesTable, dealFlowTable, usersTable, foundersTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireIC, requireFounderOrIC } from "../lib/auth";

// Returns the founder.id for the requesting user, or null if they have no founder record
async function getFounderId(userId: number): Promise<number | null> {
  const [founder] = await db.select({ id: foundersTable.id })
    .from(foundersTable)
    .where(eq(foundersTable.userId, userId))
    .limit(1);
  return founder?.id ?? null;
}

// Returns true if a deal with the given dealId is owned by this founderId
async function founderOwnsDeal(founderId: number, dealId: number): Promise<boolean> {
  const [deal] = await db.select({ id: dealFlowTable.id })
    .from(dealFlowTable)
    .where(and(eq(dealFlowTable.id, dealId), eq(dealFlowTable.founderId, founderId)))
    .limit(1);
  return !!deal;
}

// Returns the dealId for a thread, or null if thread not found
async function getDealIdForThread(threadId: number): Promise<number | null> {
  const [thread] = await db.select({ dealId: diligenceQaThreadsTable.dealId, isPrivate: diligenceQaThreadsTable.isPrivate })
    .from(diligenceQaThreadsTable)
    .where(eq(diligenceQaThreadsTable.id, threadId))
    .limit(1);
  return thread?.dealId ?? null;
}

// Returns true if a thread is private
async function isThreadPrivate(threadId: number): Promise<boolean> {
  const [thread] = await db.select({ isPrivate: diligenceQaThreadsTable.isPrivate })
    .from(diligenceQaThreadsTable)
    .where(eq(diligenceQaThreadsTable.id, threadId))
    .limit(1);
  return thread?.isPrivate ?? true;
}

const router = Router();

router.get("/diligence/threads", requireIC, async (_req, res) => {
  try {
    const threads = await db
      .select({
        id: diligenceQaThreadsTable.id,
        dealId: diligenceQaThreadsTable.dealId,
        subject: diligenceQaThreadsTable.subject,
        category: diligenceQaThreadsTable.category,
        status: diligenceQaThreadsTable.status,
        isPrivate: diligenceQaThreadsTable.isPrivate,
        createdAt: diligenceQaThreadsTable.createdAt,
        updatedAt: diligenceQaThreadsTable.updatedAt,
        companyName: dealFlowTable.companyName,
        createdByName: usersTable.name,
      })
      .from(diligenceQaThreadsTable)
      .leftJoin(dealFlowTable, eq(diligenceQaThreadsTable.dealId, dealFlowTable.id))
      .leftJoin(usersTable, eq(diligenceQaThreadsTable.createdById, usersTable.id))
      .orderBy(desc(diligenceQaThreadsTable.updatedAt));

    res.json({ threads });
  } catch {
    res.status(500).json({ error: "Failed to fetch threads" });
  }
});

// GET /api/diligence/threads/deal/:dealId
// IC/VA/MP: sees all threads including private
// Founder: must own the deal (foundersTable.userId=req.user.userId → deal.founderId=founder.id)
//          and sees only non-private threads
router.get("/diligence/threads/deal/:dealId", requireFounderOrIC, async (req, res) => {
  try {
    const dealId = Number(String(req.params.dealId));
    const fileId = req.query.fileId ? Number(String(req.query.fileId)) : null;
    const role = req.user!.role;

    if (role === "Founder") {
      // Resolve founder profile and verify deal ownership
      const founderId = await getFounderId(req.user!.userId);
      if (!founderId) return res.status(403).json({ error: "No founder profile associated with this account" });
      const owns = await founderOwnsDeal(founderId, dealId);
      if (!owns) return res.status(403).json({ error: "Access denied: this deal is not linked to your founder profile" });
    }

    const baseWhere = fileId
      ? eq(diligenceQaThreadsTable.fileId, fileId)
      : eq(diligenceQaThreadsTable.dealId, dealId);

    const threads = await db
      .select({
        id: diligenceQaThreadsTable.id,
        subject: diligenceQaThreadsTable.subject,
        category: diligenceQaThreadsTable.category,
        status: diligenceQaThreadsTable.status,
        fileId: diligenceQaThreadsTable.fileId,
        isPrivate: diligenceQaThreadsTable.isPrivate,
        createdAt: diligenceQaThreadsTable.createdAt,
        createdByName: usersTable.name,
      })
      .from(diligenceQaThreadsTable)
      .leftJoin(usersTable, eq(diligenceQaThreadsTable.createdById, usersTable.id))
      .where(baseWhere)
      .orderBy(desc(diligenceQaThreadsTable.createdAt));

    // Founders only see non-private threads
    const visible = role === "Founder"
      ? threads.filter(t => !t.isPrivate)
      : threads;

    res.json({ threads: visible });
  } catch {
    res.status(500).json({ error: "Failed to fetch threads for deal" });
  }
});

router.post("/diligence/threads", requireIC, async (req, res) => {
  try {
    const { dealId, fileId, subject, category, isPrivate } = req.body;
    if (!dealId || !subject) return res.status(400).json({ error: "dealId and subject are required" });

    const [thread] = await db.insert(diligenceQaThreadsTable).values({
      dealId: Number(dealId),
      fileId: fileId ? Number(fileId) : null,
      subject,
      category: category || "other",
      isPrivate: isPrivate ?? false,
      createdById: req.user!.userId,
    }).returning();

    res.status(201).json({ thread });
  } catch {
    res.status(500).json({ error: "Failed to create thread" });
  }
});

// GET /diligence/threads/:id/messages
// Founders: may only read messages for non-private threads linked to their own deal
router.get("/diligence/threads/:id/messages", requireFounderOrIC, async (req, res) => {
  try {
    const threadId = Number(String(req.params.id));
    const role = req.user!.role;

    if (role === "Founder") {
      const priv = await isThreadPrivate(threadId);
      if (priv) return res.status(403).json({ error: "Access denied: this thread is internal" });
      const dealId = await getDealIdForThread(threadId);
      if (!dealId) return res.status(404).json({ error: "Thread not found" });
      const founderId = await getFounderId(req.user!.userId);
      if (!founderId) return res.status(403).json({ error: "No founder profile associated with this account" });
      const owns = await founderOwnsDeal(founderId, dealId);
      if (!owns) return res.status(403).json({ error: "Access denied: this thread belongs to a different deal" });
    }

    const messages = await db
      .select({
        id: diligenceQaMessagesTable.id,
        body: diligenceQaMessagesTable.body,
        isAnswer: diligenceQaMessagesTable.isAnswer,
        createdAt: diligenceQaMessagesTable.createdAt,
        authorName: usersTable.name,
        authorRole: usersTable.role,
      })
      .from(diligenceQaMessagesTable)
      .leftJoin(usersTable, eq(diligenceQaMessagesTable.authorId, usersTable.id))
      .where(eq(diligenceQaMessagesTable.threadId, threadId))
      .orderBy(diligenceQaMessagesTable.createdAt);

    res.json({ messages });
  } catch {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /diligence/threads/:id/messages — Founders can answer; IC can ask follow-ups
// Founders: must own the deal linked to this thread, and thread must not be private
// Founders: isAnswer defaults true (they are responding to questions)
// IC/VA/MP: isAnswer from body
router.post("/diligence/threads/:id/messages", requireFounderOrIC, async (req, res) => {
  try {
    const threadId = Number(String(req.params.id));
    const { body, isAnswer: isAnswerRaw } = req.body;
    if (!body) return res.status(400).json({ error: "body is required" });

    // Founders answering questions are marked as answers by default
    const role = req.user!.role;

    if (role === "Founder") {
      const priv = await isThreadPrivate(threadId);
      if (priv) return res.status(403).json({ error: "Access denied: this thread is internal" });
      const dealId = await getDealIdForThread(threadId);
      if (!dealId) return res.status(404).json({ error: "Thread not found" });
      const founderId = await getFounderId(req.user!.userId);
      if (!founderId) return res.status(403).json({ error: "No founder profile associated with this account" });
      const owns = await founderOwnsDeal(founderId, dealId);
      if (!owns) return res.status(403).json({ error: "Access denied: this thread belongs to a different deal" });
    }

    const isAnswer = role === "Founder" ? (isAnswerRaw ?? true) : (isAnswerRaw ?? false);

    const [message] = await db.insert(diligenceQaMessagesTable).values({
      threadId,
      authorId: req.user!.userId,
      body,
      isAnswer,
    }).returning();

    if (isAnswer) {
      await db.update(diligenceQaThreadsTable)
        .set({ status: "answered", updatedAt: new Date() })
        .where(eq(diligenceQaThreadsTable.id, threadId));
    } else {
      await db.update(diligenceQaThreadsTable)
        .set({ updatedAt: new Date() })
        .where(eq(diligenceQaThreadsTable.id, threadId));
    }

    res.status(201).json({ message });
  } catch {
    res.status(500).json({ error: "Failed to add message" });
  }
});

router.put("/diligence/threads/:id", requireIC, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const { status } = req.body;
    const [updated] = await db.update(diligenceQaThreadsTable)
      .set({ ...(status !== undefined && { status }), updatedAt: new Date() })
      .where(eq(diligenceQaThreadsTable.id, id))
      .returning();
    res.json({ thread: updated });
  } catch {
    res.status(500).json({ error: "Failed to update thread" });
  }
});

export default router;
