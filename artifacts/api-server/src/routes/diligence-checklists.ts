import { Router } from "express";
import { db } from "@workspace/db";
import {
  diligenceChecklistsTable, diligenceChecklistItemsTable, dealFlowTable, usersTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireIC, requireManagingPartner } from "../lib/auth";

const router = Router();

router.get("/diligence/checklists", requireIC, async (_req, res) => {
  try {
    const checklists = await db.select({
      id: diligenceChecklistsTable.id,
      dealId: diligenceChecklistsTable.dealId,
      name: diligenceChecklistsTable.name,
      status: diligenceChecklistsTable.status,
      createdAt: diligenceChecklistsTable.createdAt,
      companyName: dealFlowTable.companyName,
      pipelineStage: dealFlowTable.pipelineStage,
    })
      .from(diligenceChecklistsTable)
      .leftJoin(dealFlowTable, eq(diligenceChecklistsTable.dealId, dealFlowTable.id))
      .orderBy(desc(diligenceChecklistsTable.createdAt));

    res.json({ checklists });
  } catch {
    res.status(500).json({ error: "Failed to fetch diligence checklists" });
  }
});

router.post("/diligence/checklists", requireManagingPartner, async (req, res) => {
  try {
    const { dealId, name } = req.body;
    if (!dealId) return res.status(400).json({ error: "dealId is required" });

    const [checklist] = await db.insert(diligenceChecklistsTable).values({
      dealId: Number(dealId),
      name: name || "Standard Diligence",
      createdById: req.user!.userId,
    }).returning();

    const defaultItems = [
      { title: "Corporate structure & cap table review", category: "legal", sortOrder: 1 },
      { title: "IP ownership and freedom to operate", category: "legal", sortOrder: 2 },
      { title: "Financial statements (3 years)", category: "financial", sortOrder: 3 },
      { title: "Revenue model and unit economics validation", category: "financial", sortOrder: 4 },
      { title: "Founder background check", category: "team", sortOrder: 5 },
      { title: "Reference calls (3 customers)", category: "market", sortOrder: 6 },
      { title: "Technical architecture review", category: "technical", sortOrder: 7 },
      { title: "Competitive landscape analysis", category: "market", sortOrder: 8 },
      { title: "Product demo and roadmap review", category: "product", sortOrder: 9 },
      { title: "Regulatory and compliance assessment", category: "legal", sortOrder: 10 },
    ];

    await db.insert(diligenceChecklistItemsTable).values(
      defaultItems.map(i => ({
        checklistId: checklist.id,
        title: i.title,
        category: i.category as any,
        sortOrder: i.sortOrder,
      }))
    );

    const items = await db.select()
      .from(diligenceChecklistItemsTable)
      .where(eq(diligenceChecklistItemsTable.checklistId, checklist.id))
      .orderBy(diligenceChecklistItemsTable.sortOrder);

    res.status(201).json({ checklist, items });
  } catch {
    res.status(500).json({ error: "Failed to create diligence checklist" });
  }
});

router.get("/diligence/checklists/:id", requireIC, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const [checklist] = await db.select({
      id: diligenceChecklistsTable.id,
      dealId: diligenceChecklistsTable.dealId,
      name: diligenceChecklistsTable.name,
      status: diligenceChecklistsTable.status,
      notes: diligenceChecklistsTable.notes,
      createdAt: diligenceChecklistsTable.createdAt,
      companyName: dealFlowTable.companyName,
    })
      .from(diligenceChecklistsTable)
      .leftJoin(dealFlowTable, eq(diligenceChecklistsTable.dealId, dealFlowTable.id))
      .where(eq(diligenceChecklistsTable.id, id))
      .limit(1);

    if (!checklist) return res.status(404).json({ error: "Checklist not found" });

    const items = await db.select({
      id: diligenceChecklistItemsTable.id,
      checklistId: diligenceChecklistItemsTable.checklistId,
      category: diligenceChecklistItemsTable.category,
      title: diligenceChecklistItemsTable.title,
      description: diligenceChecklistItemsTable.description,
      status: diligenceChecklistItemsTable.status,
      notes: diligenceChecklistItemsTable.notes,
      sortOrder: diligenceChecklistItemsTable.sortOrder,
      completedAt: diligenceChecklistItemsTable.completedAt,
      assignedToName: usersTable.name,
    })
      .from(diligenceChecklistItemsTable)
      .leftJoin(usersTable, eq(diligenceChecklistItemsTable.assignedToId, usersTable.id))
      .where(eq(diligenceChecklistItemsTable.checklistId, id))
      .orderBy(diligenceChecklistItemsTable.sortOrder);

    res.json({ checklist, items });
  } catch {
    res.status(500).json({ error: "Failed to fetch diligence checklist" });
  }
});

router.patch("/diligence/checklists/:checklistId/items/:itemId", requireIC, async (req, res) => {
  try {
    const itemId = Number(String(req.params.itemId));
    const { status, notes, assignedToId } = req.body;

    const updates: Partial<typeof diligenceChecklistItemsTable.$inferInsert> = { updatedAt: new Date() };
    if (status !== undefined) {
      updates.status = status;
      if (status === "complete") updates.completedAt = new Date();
    }
    if (notes !== undefined) updates.notes = notes;
    if (assignedToId !== undefined) updates.assignedToId = Number(assignedToId);

    const [updated] = await db.update(diligenceChecklistItemsTable)
      .set(updates)
      .where(eq(diligenceChecklistItemsTable.id, itemId))
      .returning();

    if (!updated) return res.status(404).json({ error: "Item not found" });
    res.json({ item: updated });
  } catch {
    res.status(500).json({ error: "Failed to update diligence item" });
  }
});

export default router;
