import { Router } from "express";
import { db } from "@workspace/db";
import {
  diligenceQaThreadsTable, diligenceQaMessagesTable, dealFlowTable, usersTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireIC, requireFounderOrIC } from "../lib/auth";

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
// IC/VA: sees all threads including private; Founder: sees only non-private threads for their deal
router.get("/diligence/threads/deal/:dealId", requireFounderOrIC, async (req, res) => {
  try {
    const dealId = Number(String(req.params.dealId));
    const fileId = req.query.fileId ? Number(String(req.query.fileId)) : null;
    const role = req.user!.role;

    // If requester is a Founder, verify this deal belongs to them
    if (role === "Founder") {
      const [deal] = await db.select({ founderId: dealFlowTable.founderId })
        .from(dealFlowTable).where(eq(dealFlowTable.id, dealId)).limit(1);
      if (!deal) return res.status(404).json({ error: "Deal not found" });
      // Look up the founder record that matches this user
      const [founderUser] = await db.select({ id: usersTable.id })
        .from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
      if (!founderUser) return res.status(403).json({ error: "Founder record not found" });
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

// GET /diligence/threads/:id/messages — IC/VA/Founder can all read (founders see non-private threads only)
router.get("/diligence/threads/:id/messages", requireFounderOrIC, async (req, res) => {
  try {
    const threadId = Number(String(req.params.id));
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
// Founders: isAnswer defaults true (they are responding to questions)
// IC/VA/MP: isAnswer from body
router.post("/diligence/threads/:id/messages", requireFounderOrIC, async (req, res) => {
  try {
    const threadId = Number(String(req.params.id));
    const { body, isAnswer: isAnswerRaw } = req.body;
    if (!body) return res.status(400).json({ error: "body is required" });

    // Founders answering questions are marked as answers by default
    const role = req.user!.role;
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
