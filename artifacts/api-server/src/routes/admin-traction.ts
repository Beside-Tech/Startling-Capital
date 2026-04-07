/**
 * Admin Traction routes:
 * - GET /api/admin/traction               — all founder traction data (filterable)
 * - GET /api/admin/traction/summary       — portfolio aggregates per period + all-founder status
 * - GET /api/admin/traction/by-company    — per-company revenue per period (for stacked chart)
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  tractionMetricsTable,
  foundersTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = Router();

// GET /api/admin/traction
// Returns all traction entries joined with founder info, optionally filtered
router.get("/admin/traction", requireAuth, requireAdmin, async (req, res) => {
  const { programId, year, startYear, startMonth, endYear, endMonth } = req.query as {
    programId?: string;
    year?: string;
    startYear?: string;
    startMonth?: string;
    endYear?: string;
    endMonth?: string;
  };

  try {
    const conditions = [];

    if (programId) conditions.push(eq(tractionMetricsTable.programId, programId));

    if (year && !startYear && !endYear) {
      const y = parseInt(year);
      if (!isNaN(y)) conditions.push(eq(tractionMetricsTable.periodYear, y));
    }

    if (startYear || startMonth) {
      const sy = parseInt(startYear ?? "2000");
      const sm = parseInt(startMonth ?? "1");
      if (!isNaN(sy) && !isNaN(sm)) {
        conditions.push(
          sql`(${tractionMetricsTable.periodYear} * 12 + ${tractionMetricsTable.periodMonth}) >= ${sy * 12 + sm}`
        );
      }
    }

    if (endYear || endMonth) {
      const ey = parseInt(endYear ?? "2100");
      const em = parseInt(endMonth ?? "12");
      if (!isNaN(ey) && !isNaN(em)) {
        conditions.push(
          sql`(${tractionMetricsTable.periodYear} * 12 + ${tractionMetricsTable.periodMonth}) <= ${ey * 12 + em}`
        );
      }
    }

    const rows = await db
      .select({
        id: tractionMetricsTable.id,
        founderId: tractionMetricsTable.founderId,
        programId: tractionMetricsTable.programId,
        periodMonth: tractionMetricsTable.periodMonth,
        periodYear: tractionMetricsTable.periodYear,
        revenue: tractionMetricsTable.revenue,
        activeUsers: tractionMetricsTable.activeUsers,
        burnRate: tractionMetricsTable.burnRate,
        headcount: tractionMetricsTable.headcount,
        notes: tractionMetricsTable.notes,
        submittedAt: tractionMetricsTable.submittedAt,
        updatedAt: tractionMetricsTable.updatedAt,
        founderName: usersTable.name,
        founderEmail: usersTable.email,
        companyName: foundersTable.companyName,
        sector: foundersTable.sector,
        stage: foundersTable.stage,
        country: foundersTable.country,
      })
      .from(tractionMetricsTable)
      .innerJoin(foundersTable, eq(foundersTable.id, tractionMetricsTable.founderId))
      .innerJoin(usersTable, eq(usersTable.id, foundersTable.userId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tractionMetricsTable.periodYear), desc(tractionMetricsTable.periodMonth));

    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to load traction data" });
  }
});

// GET /api/admin/traction/by-company
// Per-company revenue per period, for stacked area chart in admin dashboard
router.get("/admin/traction/by-company", requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select({
        founderId: tractionMetricsTable.founderId,
        companyName: foundersTable.companyName,
        founderName: usersTable.name,
        periodMonth: tractionMetricsTable.periodMonth,
        periodYear: tractionMetricsTable.periodYear,
        revenue: tractionMetricsTable.revenue,
      })
      .from(tractionMetricsTable)
      .innerJoin(foundersTable, eq(foundersTable.id, tractionMetricsTable.founderId))
      .innerJoin(usersTable, eq(usersTable.id, foundersTable.userId))
      .where(sql`${tractionMetricsTable.revenue} IS NOT NULL`)
      .orderBy(tractionMetricsTable.periodYear, tractionMetricsTable.periodMonth);

    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to load per-company data" });
  }
});

// GET /api/admin/traction/summary
// Portfolio-level aggregates per period + ALL founders' last submission status (null if never submitted)
// Also returns period-over-period avg user growth (delta)
router.get("/admin/traction/summary", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Per-period aggregates (ordered chronologically)
    const periodAggs = await db
      .select({
        periodMonth: tractionMetricsTable.periodMonth,
        periodYear: tractionMetricsTable.periodYear,
        totalRevenue: sql<string>`COALESCE(SUM(${tractionMetricsTable.revenue}), 0)`,
        avgUsers: sql<string>`COALESCE(AVG(${tractionMetricsTable.activeUsers}), 0)`,
        totalHeadcount: sql<string>`COALESCE(SUM(${tractionMetricsTable.headcount}), 0)`,
        avgBurnRate: sql<string>`COALESCE(AVG(${tractionMetricsTable.burnRate}), 0)`,
        founderCount: sql<string>`COUNT(DISTINCT ${tractionMetricsTable.founderId})`,
      })
      .from(tractionMetricsTable)
      .groupBy(tractionMetricsTable.periodYear, tractionMetricsTable.periodMonth)
      .orderBy(tractionMetricsTable.periodYear, tractionMetricsTable.periodMonth);

    // Compute period-over-period avg user growth (absolute delta)
    const enrichedPeriods = periodAggs.map((period, idx) => {
      const prev = idx > 0 ? periodAggs[idx - 1] : null;
      const avgUsersNow = parseFloat(period.avgUsers) || 0;
      const avgUsersPrev = prev ? (parseFloat(prev.avgUsers) || 0) : null;
      const avgUserGrowth = avgUsersPrev !== null ? avgUsersNow - avgUsersPrev : null;
      return { ...period, avgUserGrowth };
    });

    // ALL founders (left join traction) so founders with zero check-ins appear
    // lastSubmittedAt is NULL for founders with no check-ins
    const founderStatus = await db
      .select({
        founderId: foundersTable.id,
        founderName: usersTable.name,
        founderEmail: usersTable.email,
        companyName: foundersTable.companyName,
        lastSubmittedAt: sql<string | null>`MAX(${tractionMetricsTable.submittedAt})`,
        entryCount: sql<string>`COUNT(${tractionMetricsTable.id})`,
      })
      .from(foundersTable)
      .innerJoin(usersTable, eq(usersTable.id, foundersTable.userId))
      .leftJoin(tractionMetricsTable, eq(tractionMetricsTable.founderId, foundersTable.id))
      .groupBy(foundersTable.id, usersTable.name, usersTable.email, foundersTable.companyName)
      .orderBy(sql`MAX(${tractionMetricsTable.submittedAt}) DESC NULLS LAST`);

    res.json({
      periodSummary: enrichedPeriods,
      founderStatus,
    });
  } catch {
    res.status(500).json({ error: "Failed to load traction summary" });
  }
});

export default router;
