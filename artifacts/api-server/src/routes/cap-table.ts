/**
 * Cap Table routes
 * Admin/MP: GET/POST/PUT/DELETE /admin/cap-table/:founderId
 * Founder: GET /founder/cap-table
 */
import { Router, Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import {
  capTableEntriesTable,
  foundersTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

const ADMIN_ROLES = ["Admin", "SuperAdmin", "ManagingPartner"];

function requireAdminOrMP(req: Request, res: Response, next: NextFunction) {
  if (!ADMIN_ROLES.includes(req.user?.role ?? "")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
}

// GET /api/admin/cap-table/:founderId — admin/MP views a startup's cap table
router.get("/admin/cap-table/:founderId", requireAuth, requireAdminOrMP, async (req, res) => {
  const founderId = parseInt(String(req.params.founderId));
  try {
    const entries = await db
      .select()
      .from(capTableEntriesTable)
      .where(eq(capTableEntriesTable.founderId, founderId))
      .orderBy(desc(capTableEntriesTable.createdAt));
    res.json(entries);
  } catch {
    res.status(500).json({ error: "Failed to fetch cap table" });
  }
});

// GET /api/admin/cap-table — admin lists all founders
router.get("/admin/cap-table", requireAuth, requireAdminOrMP, async (req, res) => {
  try {
    const founders = await db
      .select({
        founderId: foundersTable.id,
        companyName: foundersTable.companyName,
        sector: foundersTable.sector,
        stage: foundersTable.stage,
        userId: foundersTable.userId,
      })
      .from(foundersTable)
      .orderBy(foundersTable.companyName);
    res.json(founders);
  } catch {
    res.status(500).json({ error: "Failed to fetch founders" });
  }
});

// POST /api/admin/cap-table/:founderId — add entry
router.post("/admin/cap-table/:founderId", requireAuth, requireAdminOrMP, async (req, res) => {
  const founderId = parseInt(String(req.params.founderId));
  const {
    investorName, investorType, instrument, shares,
    equityPct, investmentAmountCad, roundName, date, notes,
  } = req.body as typeof capTableEntriesTable.$inferInsert;

  if (!investorName) return res.status(400).json({ error: "investorName is required" });

  try {
    const [entry] = await db
      .insert(capTableEntriesTable)
      .values({
        founderId,
        investorName,
        investorType: investorType ?? "investor",
        instrument: instrument ?? "Common",
        shares: shares ?? null,
        equityPct: equityPct ?? null,
        investmentAmountCad: investmentAmountCad ?? null,
        roundName: roundName ?? null,
        date: date ?? null,
        notes: notes ?? null,
      })
      .returning();
    res.status(201).json(entry);
  } catch {
    res.status(500).json({ error: "Failed to add cap table entry" });
  }
});

// PUT /api/admin/cap-table/entry/:id — update entry
router.put("/admin/cap-table/entry/:id", requireAuth, requireAdminOrMP, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const {
    investorName, investorType, instrument, shares,
    equityPct, investmentAmountCad, roundName, date, notes,
  } = req.body as Partial<typeof capTableEntriesTable.$inferInsert>;

  try {
    const updates: Partial<typeof capTableEntriesTable.$inferInsert> = { updatedAt: new Date() };
    if (investorName) updates.investorName = investorName;
    if (investorType) updates.investorType = investorType;
    if (instrument) updates.instrument = instrument;
    if (shares !== undefined) updates.shares = shares;
    if (equityPct !== undefined) updates.equityPct = equityPct;
    if (investmentAmountCad !== undefined) updates.investmentAmountCad = investmentAmountCad;
    if (roundName !== undefined) updates.roundName = roundName;
    if (date !== undefined) updates.date = date;
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db
      .update(capTableEntriesTable)
      .set(updates)
      .where(eq(capTableEntriesTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Entry not found" });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update entry" });
  }
});

// DELETE /api/admin/cap-table/entry/:id — delete entry
router.delete("/admin/cap-table/entry/:id", requireAuth, requireAdminOrMP, async (req, res) => {
  const id = parseInt(String(req.params.id));
  try {
    await db.delete(capTableEntriesTable).where(eq(capTableEntriesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

// GET /api/founder/cap-table — founder views their own cap table
router.get("/founder/cap-table", requireAuth, async (req, res) => {
  if (!["Founder", "Admin", "SuperAdmin", "ManagingPartner"].includes(req.user?.role ?? "")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const [founder] = await db
      .select()
      .from(foundersTable)
      .where(eq(foundersTable.userId, req.user!.userId));

    if (!founder) return res.json([]);

    const entries = await db
      .select()
      .from(capTableEntriesTable)
      .where(eq(capTableEntriesTable.founderId, founder.id))
      .orderBy(desc(capTableEntriesTable.createdAt));

    res.json(entries);
  } catch {
    res.status(500).json({ error: "Failed to fetch cap table" });
  }
});

export default router;
