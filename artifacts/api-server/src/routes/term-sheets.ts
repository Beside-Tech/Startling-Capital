import { Router } from "express";
import { db } from "@workspace/db";
import { termSheetsTable, dealFlowTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireIC, requireManagingPartner } from "../lib/auth";

const router = Router();

router.get("/term-sheets", requireIC, async (_req, res) => {
  try {
    const sheets = await db
      .select({
        id: termSheetsTable.id,
        dealId: termSheetsTable.dealId,
        version: termSheetsTable.version,
        status: termSheetsTable.status,
        instrument: termSheetsTable.instrument,
        valuationPreMoneyCad: termSheetsTable.valuationPreMoneyCad,
        investmentAmountCad: termSheetsTable.investmentAmountCad,
        equityPct: termSheetsTable.equityPct,
        discountRate: termSheetsTable.discountRate,
        valuationCap: termSheetsTable.valuationCap,
        proRataRights: termSheetsTable.proRataRights,
        boardSeat: termSheetsTable.boardSeat,
        expiryDate: termSheetsTable.expiryDate,
        createdAt: termSheetsTable.createdAt,
        companyName: dealFlowTable.companyName,
        sector: dealFlowTable.sector,
        createdByName: usersTable.name,
      })
      .from(termSheetsTable)
      .leftJoin(dealFlowTable, eq(termSheetsTable.dealId, dealFlowTable.id))
      .leftJoin(usersTable, eq(termSheetsTable.createdById, usersTable.id))
      .orderBy(desc(termSheetsTable.createdAt));

    res.json({ sheets });
  } catch {
    res.status(500).json({ error: "Failed to fetch term sheets" });
  }
});

router.get("/term-sheets/deal/:dealId", requireIC, async (req, res) => {
  try {
    const dealId = Number(String(req.params.dealId));
    const sheets = await db
      .select()
      .from(termSheetsTable)
      .where(eq(termSheetsTable.dealId, dealId))
      .orderBy(desc(termSheetsTable.version));

    res.json({ sheets });
  } catch {
    res.status(500).json({ error: "Failed to fetch term sheets for deal" });
  }
});

router.post("/term-sheets", requireManagingPartner, async (req, res) => {
  try {
    const {
      dealId, instrument, valuationPreMoneyCad, investmentAmountCad, equityPct,
      discountRate, valuationCap, proRataRights, boardSeat, informationRights,
      closingConditions, expiryDate, notes,
    } = req.body;
    if (!dealId) return res.status(400).json({ error: "dealId is required" });

    const existing = await db.select({ cnt: termSheetsTable.version })
      .from(termSheetsTable)
      .where(eq(termSheetsTable.dealId, Number(dealId)))
      .orderBy(desc(termSheetsTable.version))
      .limit(1);
    const version = existing.length > 0 ? existing[0].cnt + 1 : 1;

    const [sheet] = await db.insert(termSheetsTable).values({
      dealId: Number(dealId),
      version,
      instrument: instrument || "SAFE",
      valuationPreMoneyCad: valuationPreMoneyCad || null,
      investmentAmountCad: investmentAmountCad || null,
      equityPct: equityPct || null,
      discountRate: discountRate || null,
      valuationCap: valuationCap || null,
      proRataRights: proRataRights ?? false,
      boardSeat: boardSeat ?? false,
      informationRights: informationRights ?? true,
      closingConditions: closingConditions || null,
      expiryDate: expiryDate || null,
      notes: notes || null,
      createdById: req.user!.userId,
    }).returning();

    res.status(201).json({ sheet });
  } catch {
    res.status(500).json({ error: "Failed to create term sheet" });
  }
});

router.put("/term-sheets/:id", requireManagingPartner, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const {
      status, instrument, valuationPreMoneyCad, investmentAmountCad, equityPct,
      discountRate, valuationCap, proRataRights, boardSeat, informationRights,
      closingConditions, expiryDate, notes,
    } = req.body;

    const updates: Partial<typeof termSheetsTable.$inferInsert> = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (instrument !== undefined) updates.instrument = instrument;
    if (valuationPreMoneyCad !== undefined) updates.valuationPreMoneyCad = valuationPreMoneyCad;
    if (investmentAmountCad !== undefined) updates.investmentAmountCad = investmentAmountCad;
    if (equityPct !== undefined) updates.equityPct = equityPct;
    if (discountRate !== undefined) updates.discountRate = discountRate;
    if (valuationCap !== undefined) updates.valuationCap = valuationCap;
    if (proRataRights !== undefined) updates.proRataRights = proRataRights;
    if (boardSeat !== undefined) updates.boardSeat = boardSeat;
    if (informationRights !== undefined) updates.informationRights = informationRights;
    if (closingConditions !== undefined) updates.closingConditions = closingConditions;
    if (expiryDate !== undefined) updates.expiryDate = expiryDate;
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db.update(termSheetsTable).set(updates)
      .where(eq(termSheetsTable.id, id)).returning();

    res.json({ sheet: updated });
  } catch {
    res.status(500).json({ error: "Failed to update term sheet" });
  }
});

export default router;
