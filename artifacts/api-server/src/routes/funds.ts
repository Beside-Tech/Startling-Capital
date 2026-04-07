import { Router } from "express";
import { db } from "@workspace/db";
import { fundsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireManagingPartner } from "../lib/auth";

const router = Router();

router.get("/mp/funds", requireManagingPartner, async (_req, res) => {
  try {
    const funds = await db
      .select({
        id: fundsTable.id,
        name: fundsTable.name,
        vintage: fundsTable.vintage,
        currency: fundsTable.currency,
        fundSizeCad: fundsTable.fundSizeCad,
        committedCapitalCad: fundsTable.committedCapitalCad,
        calledCapitalCad: fundsTable.calledCapitalCad,
        distributedCapitalCad: fundsTable.distributedCapitalCad,
        navCad: fundsTable.navCad,
        tvpi: fundsTable.tvpi,
        dpi: fundsTable.dpi,
        rvpi: fundsTable.rvpi,
        irr: fundsTable.irr,
        managementFeePct: fundsTable.managementFeePct,
        carriedInterestPct: fundsTable.carriedInterestPct,
        investmentPeriodEndDate: fundsTable.investmentPeriodEndDate,
        fundTermYears: fundsTable.fundTermYears,
        status: fundsTable.status,
        strategy: fundsTable.strategy,
        notes: fundsTable.notes,
        isActive: fundsTable.isActive,
        createdAt: fundsTable.createdAt,
      })
      .from(fundsTable)
      .orderBy(desc(fundsTable.vintage));

    res.json({ funds });
  } catch {
    res.status(500).json({ error: "Failed to fetch funds" });
  }
});

router.post("/mp/funds", requireManagingPartner, async (req, res) => {
  try {
    const {
      name, vintage, currency, fundSizeCad, committedCapitalCad, calledCapitalCad,
      distributedCapitalCad, navCad, tvpi, dpi, rvpi, irr, managementFeePct,
      carriedInterestPct, investmentPeriodEndDate, fundTermYears, status, strategy, notes,
    } = req.body;
    if (!name || !vintage) return res.status(400).json({ error: "name and vintage are required" });

    const [fund] = await db.insert(fundsTable).values({
      name,
      vintage: Number(vintage),
      currency: currency || "CAD",
      fundSizeCad: fundSizeCad || null,
      committedCapitalCad: committedCapitalCad || null,
      calledCapitalCad: calledCapitalCad || null,
      distributedCapitalCad: distributedCapitalCad || null,
      navCad: navCad || null,
      tvpi: tvpi || null,
      dpi: dpi || null,
      rvpi: rvpi || null,
      irr: irr || null,
      managementFeePct: managementFeePct || null,
      carriedInterestPct: carriedInterestPct || null,
      investmentPeriodEndDate: investmentPeriodEndDate || null,
      fundTermYears: fundTermYears ? Number(fundTermYears) : null,
      status: status || "investing",
      strategy: strategy || null,
      notes: notes || null,
      createdById: req.user!.userId,
    }).returning();

    res.status(201).json({ fund });
  } catch {
    res.status(500).json({ error: "Failed to create fund" });
  }
});

router.put("/mp/funds/:id", requireManagingPartner, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const {
      name, vintage, fundSizeCad, committedCapitalCad, calledCapitalCad,
      distributedCapitalCad, navCad, tvpi, dpi, rvpi, irr, managementFeePct,
      carriedInterestPct, investmentPeriodEndDate, fundTermYears, status, strategy, notes, isActive,
    } = req.body;

    const updates: Partial<typeof fundsTable.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (vintage !== undefined) updates.vintage = Number(vintage);
    if (fundSizeCad !== undefined) updates.fundSizeCad = fundSizeCad;
    if (committedCapitalCad !== undefined) updates.committedCapitalCad = committedCapitalCad;
    if (calledCapitalCad !== undefined) updates.calledCapitalCad = calledCapitalCad;
    if (distributedCapitalCad !== undefined) updates.distributedCapitalCad = distributedCapitalCad;
    if (navCad !== undefined) updates.navCad = navCad;
    if (tvpi !== undefined) updates.tvpi = tvpi;
    if (dpi !== undefined) updates.dpi = dpi;
    if (rvpi !== undefined) updates.rvpi = rvpi;
    if (irr !== undefined) updates.irr = irr;
    if (managementFeePct !== undefined) updates.managementFeePct = managementFeePct;
    if (carriedInterestPct !== undefined) updates.carriedInterestPct = carriedInterestPct;
    if (investmentPeriodEndDate !== undefined) updates.investmentPeriodEndDate = investmentPeriodEndDate;
    if (fundTermYears !== undefined) updates.fundTermYears = Number(fundTermYears);
    if (status !== undefined) updates.status = status;
    if (strategy !== undefined) updates.strategy = strategy;
    if (notes !== undefined) updates.notes = notes;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db.update(fundsTable).set(updates)
      .where(eq(fundsTable.id, id)).returning();

    res.json({ fund: updated });
  } catch {
    res.status(500).json({ error: "Failed to update fund" });
  }
});

router.delete("/mp/funds/:id", requireManagingPartner, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    await db.delete(fundsTable).where(eq(fundsTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete fund" });
  }
});

export default router;
