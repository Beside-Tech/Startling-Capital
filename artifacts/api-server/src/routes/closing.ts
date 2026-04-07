import { Router } from "express";
import { db } from "@workspace/db";
import {
  closingChecklistsTable, closingChecklistItemsTable, dealFlowTable, usersTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireIC, requireManagingPartner } from "../lib/auth";

const router = Router();

router.get("/closing/checklists", requireIC, async (_req, res) => {
  try {
    const checklists = await db.select({
      id: closingChecklistsTable.id,
      dealId: closingChecklistsTable.dealId,
      name: closingChecklistsTable.name,
      status: closingChecklistsTable.status,
      notes: closingChecklistsTable.notes,
      createdAt: closingChecklistsTable.createdAt,
      companyName: dealFlowTable.companyName,
      pipelineStage: dealFlowTable.pipelineStage,
    })
      .from(closingChecklistsTable)
      .leftJoin(dealFlowTable, eq(closingChecklistsTable.dealId, dealFlowTable.id))
      .orderBy(desc(closingChecklistsTable.createdAt));

    res.json({ checklists });
  } catch {
    res.status(500).json({ error: "Failed to fetch closing checklists" });
  }
});

router.post("/closing/checklists", requireManagingPartner, async (req, res) => {
  try {
    const { dealId, name, notes } = req.body;
    if (!dealId) return res.status(400).json({ error: "dealId is required" });

    const [checklist] = await db.insert(closingChecklistsTable).values({
      dealId: Number(dealId),
      name: name || "Standard Closing",
      notes: notes || null,
      createdById: req.user!.userId,
    }).returning();

    const defaultItems: { title: string; sortOrder: number }[] = [
      { title: "Term sheet signed by all parties", sortOrder: 1 },
      { title: "Legal counsel engaged", sortOrder: 2 },
      { title: "Subscription agreement executed", sortOrder: 3 },
      { title: "Wire transfer initiated by investor", sortOrder: 4 },
      { title: "Wire transfer confirmed received", sortOrder: 5 },
      { title: "Cap table updated", sortOrder: 6 },
      { title: "Share certificates / SAFE issued", sortOrder: 7 },
      { title: "Closing documentation archived", sortOrder: 8 },
    ];

    await db.insert(closingChecklistItemsTable).values(
      defaultItems.map(i => ({
        checklistId: checklist.id,
        title: i.title,
        sortOrder: i.sortOrder,
      }))
    );

    const items = await db.select()
      .from(closingChecklistItemsTable)
      .where(eq(closingChecklistItemsTable.checklistId, checklist.id))
      .orderBy(closingChecklistItemsTable.sortOrder);

    res.status(201).json({ checklist, items });
  } catch {
    res.status(500).json({ error: "Failed to create closing checklist" });
  }
});

router.get("/closing/checklists/:id", requireIC, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const [checklist] = await db.select({
      id: closingChecklistsTable.id,
      dealId: closingChecklistsTable.dealId,
      name: closingChecklistsTable.name,
      status: closingChecklistsTable.status,
      notes: closingChecklistsTable.notes,
      createdAt: closingChecklistsTable.createdAt,
      companyName: dealFlowTable.companyName,
    })
      .from(closingChecklistsTable)
      .leftJoin(dealFlowTable, eq(closingChecklistsTable.dealId, dealFlowTable.id))
      .where(eq(closingChecklistsTable.id, id))
      .limit(1);

    if (!checklist) return res.status(404).json({ error: "Checklist not found" });

    const items = await db.select()
      .from(closingChecklistItemsTable)
      .where(eq(closingChecklistItemsTable.checklistId, id))
      .orderBy(closingChecklistItemsTable.sortOrder);

    res.json({ checklist, items });
  } catch {
    res.status(500).json({ error: "Failed to fetch closing checklist" });
  }
});

router.patch("/closing/checklists/:checklistId/items/:itemId", requireIC, async (req, res) => {
  try {
    const itemId = Number(String(req.params.itemId));
    const { isComplete, notes } = req.body;

    const updates: Partial<typeof closingChecklistItemsTable.$inferInsert> = { updatedAt: new Date() };
    if (isComplete !== undefined) {
      updates.isComplete = isComplete;
      updates.completedAt = isComplete ? new Date() : null;
      updates.completedById = isComplete ? req.user!.userId : null;
    }
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db.update(closingChecklistItemsTable)
      .set(updates)
      .where(eq(closingChecklistItemsTable.id, itemId))
      .returning();

    if (!updated) return res.status(404).json({ error: "Item not found" });
    res.json({ item: updated });
  } catch {
    res.status(500).json({ error: "Failed to update checklist item" });
  }
});

export default router;
