import { Router } from "express";
import { db } from "@workspace/db";
import { termSheetsTable, dealFlowTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireIC, requireManagingPartner } from "../lib/auth";

const router = Router();

router.get("/mp/term-sheets", requireIC, async (_req, res) => {
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

router.get("/mp/term-sheets/deal/:dealId", requireIC, async (req, res) => {
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

function calcEquityPct(preMoney?: string | null, investment?: string | null): string | null {
  const pre = parseFloat(preMoney ?? "");
  const inv = parseFloat(investment ?? "");
  if (!isNaN(pre) && !isNaN(inv) && pre + inv > 0) {
    return ((inv / (pre + inv)) * 100).toFixed(4);
  }
  return null;
}

router.post("/mp/term-sheets", requireIC, async (req, res) => {
  try {
    const {
      dealId, instrument, valuationPreMoneyCad, investmentAmountCad,
      discountRate, valuationCap, proRataRights, boardSeat, informationRights,
      closingConditions, expiryDate, notes,
    } = req.body;
    const equityPct = calcEquityPct(valuationPreMoneyCad, investmentAmountCad);
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

router.put("/mp/term-sheets/:id", requireIC, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const {
      status, instrument, valuationPreMoneyCad, investmentAmountCad,
      discountRate, valuationCap, proRataRights, boardSeat, informationRights,
      closingConditions, expiryDate, notes,
    } = req.body;

    const updates: Partial<typeof termSheetsTable.$inferInsert> = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (instrument !== undefined) updates.instrument = instrument;
    if (valuationPreMoneyCad !== undefined) updates.valuationPreMoneyCad = valuationPreMoneyCad;
    if (investmentAmountCad !== undefined) updates.investmentAmountCad = investmentAmountCad;
    if (valuationPreMoneyCad !== undefined || investmentAmountCad !== undefined) {
      const [existing] = await db.select({ v: termSheetsTable.valuationPreMoneyCad, i: termSheetsTable.investmentAmountCad })
        .from(termSheetsTable).where(eq(termSheetsTable.id, id)).limit(1);
      const calc = calcEquityPct(
        valuationPreMoneyCad ?? existing?.v,
        investmentAmountCad ?? existing?.i,
      );
      if (calc) updates.equityPct = calc;
    }
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

// POST /api/term-sheets/:id/submit-to-ic — submit term sheet to IC + advance deal stage
router.post("/mp/term-sheets/:id/submit-to-ic", requireManagingPartner, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const [sheet] = await db.select().from(termSheetsTable).where(eq(termSheetsTable.id, id)).limit(1);
    if (!sheet) return res.status(404).json({ error: "Term sheet not found" });

    const [updated] = await db.update(termSheetsTable)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(termSheetsTable.id, id))
      .returning();

    // Advance deal stage to ready_for_ic (canonical) or ic_review (legacy compat)
    const [deal] = await db.update(dealFlowTable)
      .set({ pipelineStage: "ready_for_ic", updatedAt: new Date() })
      .where(eq(dealFlowTable.id, sheet.dealId))
      .returning({ pipelineStage: dealFlowTable.pipelineStage, companyName: dealFlowTable.companyName });

    res.json({ sheet: updated, deal });
  } catch {
    res.status(500).json({ error: "Failed to submit term sheet to IC" });
  }
});

export default router;
