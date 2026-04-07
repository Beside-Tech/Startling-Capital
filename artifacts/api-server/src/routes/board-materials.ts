import { Router } from "express";
import { db } from "@workspace/db";
import {
  boardMeetingsTable, boardMaterialsTable, foundersTable, usersTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireIC, requireManagingPartner } from "../lib/auth";

const router = Router();

router.get("/board/meetings", requireIC, async (_req, res) => {
  try {
    const meetings = await db.select({
      id: boardMeetingsTable.id,
      companyName: boardMeetingsTable.companyName,
      title: boardMeetingsTable.title,
      scheduledAt: boardMeetingsTable.scheduledAt,
      status: boardMeetingsTable.status,
      agenda: boardMeetingsTable.agenda,
      createdAt: boardMeetingsTable.createdAt,
      createdByName: usersTable.name,
    })
      .from(boardMeetingsTable)
      .leftJoin(usersTable, eq(boardMeetingsTable.createdById, usersTable.id))
      .orderBy(desc(boardMeetingsTable.createdAt));

    res.json({ meetings });
  } catch {
    res.status(500).json({ error: "Failed to fetch board meetings" });
  }
});

router.post("/board/meetings", requireManagingPartner, async (req, res) => {
  try {
    const { companyName, title, scheduledAt, agenda, founderId } = req.body;
    if (!companyName || !title) return res.status(400).json({ error: "companyName and title are required" });

    const [meeting] = await db.insert(boardMeetingsTable).values({
      companyName,
      title,
      scheduledAt: scheduledAt || null,
      agenda: agenda || null,
      founderId: founderId ? Number(founderId) : null,
      createdById: req.user!.userId,
    }).returning();

    res.status(201).json({ meeting });
  } catch {
    res.status(500).json({ error: "Failed to create board meeting" });
  }
});

router.get("/board/meetings/:id", requireIC, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const [meeting] = await db.select()
      .from(boardMeetingsTable)
      .where(eq(boardMeetingsTable.id, id))
      .limit(1);

    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const materials = await db.select({
      id: boardMaterialsTable.id,
      title: boardMaterialsTable.title,
      fileUrl: boardMaterialsTable.fileUrl,
      fileType: boardMaterialsTable.fileType,
      isConfidential: boardMaterialsTable.isConfidential,
      notes: boardMaterialsTable.notes,
      createdAt: boardMaterialsTable.createdAt,
      uploaderName: usersTable.name,
    })
      .from(boardMaterialsTable)
      .leftJoin(usersTable, eq(boardMaterialsTable.uploadedById, usersTable.id))
      .where(eq(boardMaterialsTable.boardMeetingId, id))
      .orderBy(desc(boardMaterialsTable.createdAt));

    res.json({ meeting, materials });
  } catch {
    res.status(500).json({ error: "Failed to fetch board meeting" });
  }
});

router.put("/board/meetings/:id", requireManagingPartner, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const { title, status, agenda, minutes, scheduledAt } = req.body;

    const updates: Partial<typeof boardMeetingsTable.$inferInsert> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (status !== undefined) updates.status = status;
    if (agenda !== undefined) updates.agenda = agenda;
    if (minutes !== undefined) updates.minutes = minutes;
    if (scheduledAt !== undefined) updates.scheduledAt = scheduledAt;

    const [updated] = await db.update(boardMeetingsTable).set(updates)
      .where(eq(boardMeetingsTable.id, id)).returning();

    res.json({ meeting: updated });
  } catch {
    res.status(500).json({ error: "Failed to update board meeting" });
  }
});

router.post("/board/materials", requireManagingPartner, async (req, res) => {
  try {
    const { boardMeetingId, founderId, title, fileUrl, fileType, isConfidential, notes } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });

    const [material] = await db.insert(boardMaterialsTable).values({
      boardMeetingId: boardMeetingId ? Number(boardMeetingId) : null,
      founderId: founderId ? Number(founderId) : null,
      title,
      fileUrl: fileUrl || null,
      fileType: fileType || "deck",
      isConfidential: isConfidential ?? false,
      notes: notes || null,
      uploadedById: req.user!.userId,
    }).returning();

    res.status(201).json({ material });
  } catch {
    res.status(500).json({ error: "Failed to upload board material" });
  }
});

router.delete("/board/materials/:id", requireManagingPartner, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const [deleted] = await db.delete(boardMaterialsTable)
      .where(eq(boardMaterialsTable.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Material not found" });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete board material" });
  }
});

export default router;
