/**
 * Capital Calls routes
 * MP/Admin: GET/POST/PUT/DELETE /mp/capital-calls
 * LP: GET /lp/capital-calls
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  capitalCallsTable,
  capitalCallAllocationsTable,
  lpProfilesTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

const MP_ROLES = ["ManagingPartner", "Admin", "SuperAdmin"];

// GET /api/mp/capital-calls — list all capital calls
router.get("/mp/capital-calls", requireAuth, async (req, res) => {
  if (!MP_ROLES.includes(req.user?.role ?? "")) return res.status(403).json({ error: "Forbidden" });
  try {
    const calls = await db
      .select()
      .from(capitalCallsTable)
      .orderBy(desc(capitalCallsTable.createdAt));

    const result = await Promise.all(
      calls.map(async (c) => {
        const allocations = await db
          .select({
            id: capitalCallAllocationsTable.id,
            lpProfileId: capitalCallAllocationsTable.lpProfileId,
            firmName: lpProfilesTable.firmName,
            contactName: lpProfilesTable.contactName,
            allocatedAmountCad: capitalCallAllocationsTable.allocatedAmountCad,
            paidAt: capitalCallAllocationsTable.paidAt,
            notes: capitalCallAllocationsTable.notes,
          })
          .from(capitalCallAllocationsTable)
          .leftJoin(lpProfilesTable, eq(capitalCallAllocationsTable.lpProfileId, lpProfilesTable.id))
          .where(eq(capitalCallAllocationsTable.capitalCallId, c.id));
        return { ...c, allocations };
      })
    );
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to fetch capital calls" });
  }
});

// POST /api/mp/capital-calls
router.post("/mp/capital-calls", requireAuth, async (req, res) => {
  if (!MP_ROLES.includes(req.user?.role ?? "")) return res.status(403).json({ error: "Forbidden" });
  const { title, callDate, dueDate, totalAmountCad, status, notes, allocations } = req.body as {
    title: string;
    callDate: string;
    dueDate?: string;
    totalAmountCad?: string;
    status?: "draft" | "sent" | "partial" | "complete";
    notes?: string;
    allocations?: Array<{ lpProfileId: number; allocatedAmountCad?: string; notes?: string }>;
  };

  if (!title || !callDate) return res.status(400).json({ error: "title and callDate are required" });

  try {
    const [call] = await db
      .insert(capitalCallsTable)
      .values({
        title,
        callDate,
        dueDate: dueDate ?? null,
        totalAmountCad: totalAmountCad ?? null,
        status: status ?? "draft",
        notes: notes ?? null,
        createdBy: req.user!.userId,
      })
      .returning();

    if (allocations?.length) {
      await db.insert(capitalCallAllocationsTable).values(
        allocations.map((a) => ({
          capitalCallId: call.id,
          lpProfileId: a.lpProfileId,
          allocatedAmountCad: a.allocatedAmountCad ?? null,
          notes: a.notes ?? null,
        }))
      );
    }

    res.status(201).json(call);
  } catch {
    res.status(500).json({ error: "Failed to create capital call" });
  }
});

// PUT /api/mp/capital-calls/:id
router.put("/mp/capital-calls/:id", requireAuth, async (req, res) => {
  if (!MP_ROLES.includes(req.user?.role ?? "")) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(String(req.params.id));
  const { title, callDate, dueDate, totalAmountCad, status, notes } = req.body as Partial<typeof capitalCallsTable.$inferInsert>;

  try {
    const updates: Partial<typeof capitalCallsTable.$inferInsert> = { updatedAt: new Date() };
    if (title) updates.title = title;
    if (callDate) updates.callDate = callDate;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (totalAmountCad !== undefined) updates.totalAmountCad = totalAmountCad;
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db
      .update(capitalCallsTable)
      .set(updates)
      .where(eq(capitalCallsTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Capital call not found" });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update capital call" });
  }
});

// PUT /api/mp/capital-calls/:id/allocations/:allocId — mark allocation paid
router.put("/mp/capital-calls/:id/allocations/:allocId", requireAuth, async (req, res) => {
  if (!MP_ROLES.includes(req.user?.role ?? "")) return res.status(403).json({ error: "Forbidden" });
  const allocId = parseInt(String(req.params.allocId));
  const { paidAt, notes } = req.body as { paidAt?: string; notes?: string };

  try {
    const updates: Partial<typeof capitalCallAllocationsTable.$inferInsert> = {
      updatedAt: new Date(),
      confirmedBy: req.user!.userId,
    };
    if (paidAt) updates.paidAt = new Date(paidAt);
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db
      .update(capitalCallAllocationsTable)
      .set(updates)
      .where(eq(capitalCallAllocationsTable.id, allocId))
      .returning();

    if (!updated) return res.status(404).json({ error: "Allocation not found" });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update allocation" });
  }
});

// DELETE /api/mp/capital-calls/:id
router.delete("/mp/capital-calls/:id", requireAuth, async (req, res) => {
  if (!MP_ROLES.includes(req.user?.role ?? "")) return res.status(403).json({ error: "Forbidden" });
  const id = parseInt(String(req.params.id));
  try {
    await db.delete(capitalCallsTable).where(eq(capitalCallsTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete capital call" });
  }
});

// GET /api/lp/capital-calls — LP views their own capital calls
router.get("/lp/capital-calls", requireAuth, async (req, res) => {
  try {
    const [lpProfile] = await db
      .select()
      .from(lpProfilesTable)
      .where(eq(lpProfilesTable.userId, req.user!.userId));

    if (!lpProfile) return res.json([]);

    const allocations = await db
      .select({
        callId: capitalCallsTable.id,
        title: capitalCallsTable.title,
        callDate: capitalCallsTable.callDate,
        dueDate: capitalCallsTable.dueDate,
        status: capitalCallsTable.status,
        totalAmountCad: capitalCallsTable.totalAmountCad,
        allocatedAmountCad: capitalCallAllocationsTable.allocatedAmountCad,
        paidAt: capitalCallAllocationsTable.paidAt,
        notes: capitalCallAllocationsTable.notes,
        allocationId: capitalCallAllocationsTable.id,
      })
      .from(capitalCallAllocationsTable)
      .leftJoin(capitalCallsTable, eq(capitalCallAllocationsTable.capitalCallId, capitalCallsTable.id))
      .where(eq(capitalCallAllocationsTable.lpProfileId, lpProfile.id))
      .orderBy(desc(capitalCallsTable.createdAt));

    res.json(allocations);
  } catch {
    res.status(500).json({ error: "Failed to fetch capital calls" });
  }
});

export default router;
