import { Router } from "express";
import { db } from "@workspace/db";
import {
  fundMetricsSnapshotsTable,
  fundsTable,
  capitalCallsTable,
  lpAccountsTable,
  capTableEntriesTable,
} from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
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

// GET /api/mp/funds/:fundId/metrics/computed — derive TVPI/DPI/RVPI/MOIC from ledger data
router.get("/mp/funds/:fundId/metrics/computed", requireManagingPartner, async (req, res) => {
  const fundId = Number(String(req.params.fundId));
  try {
    const [fund] = await db.select()
      .from(fundsTable)
      .where(eq(fundsTable.id, fundId))
      .limit(1);
    if (!fund) return res.status(404).json({ error: "Fund not found" });

    // Called capital = sum of all capital call totalAmounts for this fund
    const [{ calledCapital }] = await db.select({
      calledCapital: sql<string>`coalesce(sum(${capitalCallsTable.totalAmountCad}), 0)`,
    }).from(capitalCallsTable).where(eq(capitalCallsTable.fundId, fundId));

    // Committed capital = sum of LP account commitments for this fund
    const [{ committedCapital }] = await db.select({
      committedCapital: sql<string>`coalesce(sum(${lpAccountsTable.commitmentCad}), 0)`,
    }).from(lpAccountsTable).where(eq(lpAccountsTable.fundId, fundId));

    // LP distributed capital = sum of LP account distributions for this fund
    const [{ lpDistributed }] = await db.select({
      lpDistributed: sql<string>`coalesce(sum(${lpAccountsTable.distributedCapitalCad}), 0)`,
    }).from(lpAccountsTable).where(eq(lpAccountsTable.fundId, fundId));

    // Portfolio companies: count distinct founderId in cap table entries that link to this fund's deals
    // Cost basis NAV = sum of investmentAmountCad in cap table (proxy until FMV marks available)
    // We use fundsTable.navCad if manually updated, else fall back to cost basis
    const portfolioEntries = await db.select({
      founderId: capTableEntriesTable.founderId,
      investmentAmountCad: capTableEntriesTable.investmentAmountCad,
    }).from(capTableEntriesTable);

    const costBasisNav = portfolioEntries.reduce(
      (sum, e) => sum + parseFloat(e.investmentAmountCad ?? "0"),
      0
    );
    const portfolioCount = new Set(portfolioEntries.map(e => e.founderId).filter(Boolean)).size;

    // Use manually-recorded NAV from fund record if available, otherwise use cost basis
    const navCad = fund.navCad ? parseFloat(fund.navCad) : costBasisNav;
    const distributedCad = parseFloat(lpDistributed);
    const calledCad = parseFloat(calledCapital);
    const committedCad = parseFloat(committedCapital);

    // TVPI = (NAV + Distributions) / Called Capital
    const tvpi = calledCad > 0 ? ((navCad + distributedCad) / calledCad) : null;
    // DPI = Distributions / Called Capital (realised return multiple)
    const dpi = calledCad > 0 ? (distributedCad / calledCad) : null;
    // RVPI = NAV / Called Capital (unrealised return multiple)
    const rvpi = calledCad > 0 ? (navCad / calledCad) : null;
    // MOIC = (NAV + Distributions) / Cost Basis
    const moic = costBasisNav > 0 ? ((navCad + distributedCad) / costBasisNav) : null;

    res.json({
      fundId,
      fundName: fund.name,
      asOfDate: new Date().toISOString().split("T")[0],
      navCad: navCad.toFixed(2),
      navSource: fund.navCad ? "manually-recorded" : "cost-basis-estimate",
      calledCapitalCad: calledCad.toFixed(2),
      committedCapitalCad: committedCad.toFixed(2),
      distributedCapitalCad: distributedCad.toFixed(2),
      tvpi: tvpi !== null ? tvpi.toFixed(3) : null,
      dpi: dpi !== null ? dpi.toFixed(3) : null,
      rvpi: rvpi !== null ? rvpi.toFixed(3) : null,
      moic: moic !== null ? moic.toFixed(3) : null,
      portfolioCompanies: portfolioCount,
      notes: "NAV uses cost basis as placeholder; update via POST /metrics with quarterly FMV marks for accurate TVPI/IRR",
    });
  } catch {
    res.status(500).json({ error: "Failed to compute fund metrics" });
  }
});

export default router;
