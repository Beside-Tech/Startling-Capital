import { Router } from "express";
import { db } from "@workspace/db";
import { fundMetricsSnapshotsTable, fundsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireManagingPartner } from "../lib/auth";

const router = Router();

router.get("/mp/funds/:fundId/metrics", requireManagingPartner, async (req, res) => {
  try {
    const fundId = Number(String(req.params.fundId));
    const snapshots = await db.select()
      .from(fundMetricsSnapshotsTable)
      .where(eq(fundMetricsSnapshotsTable.fundId, fundId))
      .orderBy(desc(fundMetricsSnapshotsTable.year), desc(fundMetricsSnapshotsTable.quarter));

    res.json({ snapshots });
  } catch {
    res.status(500).json({ error: "Failed to fetch fund metrics" });
  }
});

router.post("/mp/funds/:fundId/metrics", requireManagingPartner, async (req, res) => {
  try {
    const fundId = Number(String(req.params.fundId));
    const { snapshotDate, quarter, year, navCad, calledCapitalCad, distributedCapitalCad, tvpi, dpi, rvpi, irr, portfolioCount, notes } = req.body;
    if (!snapshotDate || !quarter || !year) return res.status(400).json({ error: "snapshotDate, quarter, year required" });

    const [snapshot] = await db.insert(fundMetricsSnapshotsTable).values({
      fundId,
      snapshotDate,
      quarter: Number(quarter),
      year: Number(year),
      navCad: navCad || null,
      calledCapitalCad: calledCapitalCad || null,
      distributedCapitalCad: distributedCapitalCad || null,
      tvpi: tvpi || null,
      dpi: dpi || null,
      rvpi: rvpi || null,
      irr: irr || null,
      portfolioCount: portfolioCount ? Number(portfolioCount) : null,
      notes: notes || null,
      recordedById: req.user!.userId,
    }).returning();

    await db.update(fundsTable).set({
      ...(navCad !== undefined && { navCad }),
      ...(calledCapitalCad !== undefined && { calledCapitalCad }),
      ...(distributedCapitalCad !== undefined && { distributedCapitalCad }),
      ...(tvpi !== undefined && { tvpi }),
      ...(dpi !== undefined && { dpi }),
      ...(rvpi !== undefined && { rvpi }),
      ...(irr !== undefined && { irr }),
      updatedAt: new Date(),
    }).where(eq(fundsTable.id, fundId));

    res.status(201).json({ snapshot });
  } catch {
    res.status(500).json({ error: "Failed to record fund metrics snapshot" });
  }
});

export default router;
