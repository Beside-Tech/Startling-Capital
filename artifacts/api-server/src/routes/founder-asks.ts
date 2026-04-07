import { Router } from "express";
import { db } from "@workspace/db";
import {
  founderAsksTable, foundersTable, usersTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth, requireIC, requireManagingPartner } from "../lib/auth";

const router = Router();

const assigneeUsers = alias(usersTable, "assignee_users");

router.get("/mp/founder-asks", requireIC, async (_req, res) => {
  try {
    const asks = await db
      .select({
        id: founderAsksTable.id,
        founderId: founderAsksTable.founderId,
        assignedToId: founderAsksTable.assignedToId,
        category: founderAsksTable.category,
        title: founderAsksTable.title,
        description: founderAsksTable.description,
        priority: founderAsksTable.priority,
        status: founderAsksTable.status,
        isPublic: founderAsksTable.isPublic,
        createdAt: founderAsksTable.createdAt,
        updatedAt: founderAsksTable.updatedAt,
        fulfilledAt: founderAsksTable.fulfilledAt,
        fulfilledNote: founderAsksTable.fulfilledNote,
        companyName: foundersTable.companyName,
        founderName: usersTable.name,
        assignedToName: assigneeUsers.name,
      })
      .from(founderAsksTable)
      .leftJoin(foundersTable, eq(founderAsksTable.founderId, foundersTable.id))
      .leftJoin(usersTable, eq(foundersTable.userId, usersTable.id))
      .leftJoin(assigneeUsers, eq(founderAsksTable.assignedToId, assigneeUsers.id))
      .orderBy(desc(founderAsksTable.createdAt));

    res.json({ asks });
  } catch {
    res.status(500).json({ error: "Failed to fetch founder asks" });
  }
});

router.put("/mp/founder-asks/:id", requireIC, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const { status, assignedToId, fulfilledNote, priority } = req.body;

    const updates: Partial<typeof founderAsksTable.$inferInsert> = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (assignedToId !== undefined) updates.assignedToId = assignedToId ? Number(assignedToId) : null;
    if (fulfilledNote !== undefined) updates.fulfilledNote = fulfilledNote;
    if (priority !== undefined) updates.priority = priority;
    if (status === "fulfilled") updates.fulfilledAt = new Date();

    const [updated] = await db.update(founderAsksTable).set(updates)
      .where(eq(founderAsksTable.id, id)).returning();

    res.json({ ask: updated });
  } catch {
    res.status(500).json({ error: "Failed to update ask" });
  }
});

router.get("/founder/asks", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const [founder] = await db.select({ id: foundersTable.id })
      .from(foundersTable).where(eq(foundersTable.userId, userId)).limit(1);
    if (!founder) return res.json({ asks: [] });

    const asks = await db
      .select({
        id: founderAsksTable.id,
        category: founderAsksTable.category,
        title: founderAsksTable.title,
        description: founderAsksTable.description,
        priority: founderAsksTable.priority,
        status: founderAsksTable.status,
        fulfilledAt: founderAsksTable.fulfilledAt,
        fulfilledNote: founderAsksTable.fulfilledNote,
        createdAt: founderAsksTable.createdAt,
      })
      .from(founderAsksTable)
      .where(eq(founderAsksTable.founderId, founder.id))
      .orderBy(desc(founderAsksTable.createdAt));

    res.json({ asks });
  } catch {
    res.status(500).json({ error: "Failed to fetch your asks" });
  }
});

router.post("/founder/asks", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const [founder] = await db.select({ id: foundersTable.id })
      .from(foundersTable).where(eq(foundersTable.userId, userId)).limit(1);
    if (!founder) return res.status(404).json({ error: "Founder profile not found" });

    const { category, title, description, priority } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });

    const [ask] = await db.insert(founderAsksTable).values({
      founderId: founder.id,
      category: category || "other",
      title,
      description: description || null,
      priority: priority || "medium",
    }).returning();

    res.status(201).json({ ask });
  } catch {
    res.status(500).json({ error: "Failed to create ask" });
  }
});

router.delete("/founder/asks/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const userId = req.user!.userId;
    const [founder] = await db.select({ id: foundersTable.id })
      .from(foundersTable).where(eq(foundersTable.userId, userId)).limit(1);
    if (!founder) return res.status(403).json({ error: "Not a founder" });

    await db.delete(founderAsksTable).where(
      and(eq(founderAsksTable.id, id), eq(founderAsksTable.founderId, founder.id))
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete ask" });
  }
});

export default router;
