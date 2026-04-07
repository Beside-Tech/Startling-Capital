import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { foundersTable, qaThreadsTable, qaRepliesTable, usersTable } from "@workspace/db";
import { eq, desc, or } from "drizzle-orm";
import { requireFounder, requireAuth } from "../lib/auth";

const router = Router();

router.get("/founder/qa", requireFounder, async (req: Request, res: Response): Promise<void> => {
  try {
    const [founder] = await db.select({ id: foundersTable.id }).from(foundersTable)
      .where(eq(foundersTable.userId, req.user!.userId)).limit(1);
    if (!founder) { res.status(404).json({ error: "Founder profile not found" }); return; }

    const threads = await db.select({
      id: qaThreadsTable.id,
      title: qaThreadsTable.title,
      body: qaThreadsTable.body,
      category: qaThreadsTable.category,
      status: qaThreadsTable.status,
      isPinned: qaThreadsTable.isPinned,
      isPublic: qaThreadsTable.isPublic,
      createdAt: qaThreadsTable.createdAt,
      authorName: usersTable.name,
    })
      .from(qaThreadsTable)
      .leftJoin(usersTable, eq(qaThreadsTable.authorId, usersTable.id))
      .where(or(
        eq(qaThreadsTable.founderId, founder.id),
        eq(qaThreadsTable.isPublic, true),
      ))
      .orderBy(desc(qaThreadsTable.isPinned), desc(qaThreadsTable.createdAt));

    res.json({ threads });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch Q&A" });
  }
});

router.post("/founder/qa", requireFounder, async (req: Request, res: Response): Promise<void> => {
  try {
    const [founder] = await db.select({ id: foundersTable.id }).from(foundersTable)
      .where(eq(foundersTable.userId, req.user!.userId)).limit(1);
    if (!founder) { res.status(404).json({ error: "Founder profile not found" }); return; }

    const { title, body, category } = req.body;
    if (!title || !body) { res.status(400).json({ error: "Title and body are required" }); return; }

    const [thread] = await db.insert(qaThreadsTable).values({
      founderId: founder.id,
      authorId: req.user!.userId,
      title,
      body,
      category: category || "general",
      isPublic: false,
      status: "open",
    }).returning();

    res.status(201).json({ thread });
  } catch (err) {
    res.status(500).json({ error: "Failed to post question" });
  }
});

router.get("/founder/qa/:id/replies", requireFounder, async (req: Request, res: Response): Promise<void> => {
  try {
    const threadId = Number(req.params["id"]);
    const [founder] = await db.select({ id: foundersTable.id }).from(foundersTable)
      .where(eq(foundersTable.userId, req.user!.userId)).limit(1);
    if (!founder) { res.status(404).json({ error: "Founder profile not found" }); return; }

    const [thread] = await db.select().from(qaThreadsTable)
      .where(eq(qaThreadsTable.id, threadId)).limit(1);
    if (!thread || (thread.founderId !== founder.id && !thread.isPublic)) {
      res.status(404).json({ error: "Thread not found" }); return;
    }

    const replies = await db.select({
      id: qaRepliesTable.id,
      body: qaRepliesTable.body,
      isStaffReply: qaRepliesTable.isStaffReply,
      createdAt: qaRepliesTable.createdAt,
      authorName: usersTable.name,
    })
      .from(qaRepliesTable)
      .leftJoin(usersTable, eq(qaRepliesTable.authorId, usersTable.id))
      .where(eq(qaRepliesTable.threadId, threadId))
      .orderBy(qaRepliesTable.createdAt);

    res.json({ thread, replies });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch replies" });
  }
});

router.post("/founder/qa/:id/reply", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const threadId = Number(req.params["id"]);
    const { body } = req.body;
    if (!body) { res.status(400).json({ error: "Reply body is required" }); return; }

    const user = req.user!;
    const role = user.role;

    const [thread] = await db.select().from(qaThreadsTable)
      .where(eq(qaThreadsTable.id, threadId)).limit(1);
    if (!thread) { res.status(404).json({ error: "Thread not found" }); return; }

    const isStaff = role === "Admin" || role === "SuperAdmin" || role === "IC" || role === "ManagingPartner";

    if (!isStaff) {
      if (role !== "Founder") {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const [founder] = await db.select({ id: foundersTable.id }).from(foundersTable)
        .where(eq(foundersTable.userId, user.userId)).limit(1);
      if (!founder) { res.status(403).json({ error: "Founder profile not found" }); return; }
      const ownsThread = thread.founderId === founder.id;
      const canSeeThread = ownsThread || thread.isPublic;
      if (!canSeeThread) { res.status(403).json({ error: "Forbidden" }); return; }
    }

    const [reply] = await db.insert(qaRepliesTable).values({
      threadId,
      authorId: user.userId,
      body,
      isStaffReply: isStaff,
    }).returning();

    if (isStaff) {
      await db.update(qaThreadsTable)
        .set({ status: "answered", updatedAt: new Date() })
        .where(eq(qaThreadsTable.id, threadId));
    }

    res.status(201).json({ reply });
  } catch {
    res.status(500).json({ error: "Failed to post reply" });
  }
});

export default router;
