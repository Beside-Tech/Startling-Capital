import { Router } from "express";
import { db } from "@workspace/db";
import {
  diligenceQaThreadsTable, diligenceQaMessagesTable, dealFlowTable, usersTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireIC } from "../lib/auth";

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

router.get("/diligence/threads/deal/:dealId", requireIC, async (req, res) => {
  try {
    const dealId = Number(String(req.params.dealId));
    const fileId = req.query.fileId ? Number(String(req.query.fileId)) : null;
    const whereClause = fileId
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
      .where(whereClause)
      .orderBy(desc(diligenceQaThreadsTable.createdAt));

    res.json({ threads });
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

router.get("/diligence/threads/:id/messages", requireIC, async (req, res) => {
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

router.post("/diligence/threads/:id/messages", requireIC, async (req, res) => {
  try {
    const threadId = Number(String(req.params.id));
    const { body, isAnswer } = req.body;
    if (!body) return res.status(400).json({ error: "body is required" });

    const [message] = await db.insert(diligenceQaMessagesTable).values({
      threadId,
      authorId: req.user!.userId,
      body,
      isAnswer: isAnswer ?? false,
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
