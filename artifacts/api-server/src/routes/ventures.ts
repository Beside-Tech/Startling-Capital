/**
 * Nobellum Ventures routes:
 *
 * Admin:
 *   GET  /api/admin/ventures/portfolio-summary      — aggregate stats
 *   GET  /api/admin/ventures/investments             — list all investments
 *   POST /api/admin/ventures/investments             — create investment
 *   GET  /api/admin/ventures/investments/:id         — detail with founder profile + scoring + traction
 *   PUT  /api/admin/ventures/investments/:id         — update investment
 *   DELETE /api/admin/ventures/investments/:id       — delete investment
 *   POST /api/admin/ventures/investments/:id/rounds  — add an investment round
 *
 * Founder:
 *   GET  /api/founder/ventures/status               — current founder's investment status
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  investmentsTable,
  investmentRoundsTable,
  foundersTable,
  usersTable,
  tractionMetricsTable,
  scoresTable,
  startupsTable,
} from "@workspace/db";
import { eq, desc, sql, avg, count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = Router();

/**
 * Recalculate a founder's investmentStatus from all their investments:
 *   - "portfolio" if any investment is "active"
 *   - "exited"    if all investments are "exited" (none active)
 *   - "none"      if no investments remain
 */
async function recalcFounderStatus(founderId: number): Promise<void> {
  const allInvestments = await db
    .select({ status: investmentsTable.status })
    .from(investmentsTable)
    .where(eq(investmentsTable.founderId, founderId));

  let newStatus: "none" | "portfolio" | "exited" = "none";
  if (allInvestments.length > 0) {
    if (allInvestments.some((i) => i.status === "active")) {
      newStatus = "portfolio";
    } else {
      newStatus = "exited";
    }
  }

  await db
    .update(foundersTable)
    .set({ investmentStatus: newStatus, updatedAt: new Date() })
    .where(eq(foundersTable.id, founderId));
}

// ─── Founder ──────────────────────────────────────────────────────────────────

// GET /api/founder/ventures/status
router.get("/founder/ventures/status", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [founder] = await db
      .select({ id: foundersTable.id, investmentStatus: foundersTable.investmentStatus })
      .from(foundersTable)
      .where(eq(foundersTable.userId, userId));

    if (!founder) return res.json({ status: "none", isPortfolio: false });

    const isPortfolio = founder.investmentStatus === "portfolio";
    res.json({ status: founder.investmentStatus ?? "none", isPortfolio, founderId: founder.id });
  } catch {
    res.status(500).json({ error: "Failed to load investment status" });
  }
});

// ─── Admin ────────────────────────────────────────────────────────────────────

// GET /api/admin/ventures/portfolio-summary
router.get("/admin/ventures/portfolio-summary", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const agg = await db
      .select({
        totalInvested: sql<string>`COALESCE(SUM(${investmentsTable.amountCad}), 0)`,
        portfolioCount: sql<string>`COUNT(DISTINCT ${investmentsTable.founderId})`,
        avgEquityPct: sql<string>`COALESCE(AVG(${investmentsTable.equityPct}), 0)`,
        activeCount: sql<string>`COUNT(DISTINCT ${investmentsTable.founderId}) FILTER (WHERE ${investmentsTable.status} = 'active')`,
        exitedCount: sql<string>`COUNT(DISTINCT ${investmentsTable.founderId}) FILTER (WHERE ${investmentsTable.status} = 'exited')`,
        leadCount: sql<string>`COUNT(*) FILTER (WHERE ${investmentsTable.isLead} = true)`,
      })
      .from(investmentsTable);

    res.json(agg[0]);
  } catch {
    res.status(500).json({ error: "Failed to load portfolio summary" });
  }
});

// GET /api/admin/ventures/investments
router.get("/admin/ventures/investments", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const investments = await db
      .select({
        id: investmentsTable.id,
        founderId: investmentsTable.founderId,
        startupName: investmentsTable.startupName,
        investmentDate: investmentsTable.investmentDate,
        amountCad: investmentsTable.amountCad,
        amountUsd: investmentsTable.amountUsd,
        isLead: investmentsTable.isLead,
        equityPct: investmentsTable.equityPct,
        instrument: investmentsTable.instrument,
        roundName: investmentsTable.roundName,
        status: investmentsTable.status,
        notes: investmentsTable.notes,
        createdAt: investmentsTable.createdAt,
        founderName: usersTable.name,
        founderEmail: usersTable.email,
        companyName: foundersTable.companyName,
        sector: foundersTable.sector,
        stage: foundersTable.stage,
        country: foundersTable.country,
        avatarUrl: foundersTable.avatarUrl,
      })
      .from(investmentsTable)
      .innerJoin(foundersTable, eq(foundersTable.id, investmentsTable.founderId))
      .innerJoin(usersTable, eq(usersTable.id, foundersTable.userId))
      .orderBy(desc(investmentsTable.investmentDate));

    res.json(investments);
  } catch {
    res.status(500).json({ error: "Failed to load investments" });
  }
});

// POST /api/admin/ventures/investments
router.post("/admin/ventures/investments", requireAuth, requireAdmin, async (req, res) => {
  const {
    founderId,
    startupName,
    investmentDate,
    amountCad,
    amountUsd,
    isLead,
    equityPct,
    instrument,
    roundName,
    notes,
    status,
  } = req.body as {
    founderId: number;
    startupName: string;
    investmentDate: string;
    amountCad?: string;
    amountUsd?: string;
    isLead?: boolean;
    equityPct?: string;
    instrument?: string;
    roundName?: string;
    notes?: string;
    status?: string;
  };

  if (!founderId || !startupName || !investmentDate) {
    return res.status(400).json({ error: "founderId, startupName, and investmentDate are required" });
  }

  try {
    const [investment] = await db
      .insert(investmentsTable)
      .values({
        founderId,
        startupName,
        investmentDate,
        amountCad: amountCad ?? null,
        amountUsd: amountUsd ?? null,
        isLead: isLead ?? false,
        equityPct: equityPct ?? null,
        instrument: instrument ?? "SAFE",
        roundName: roundName ?? null,
        notes: notes?.trim() ?? null,
        status: status ?? "active",
      })
      .returning();

    // Recalculate founder status from all their investments
    await recalcFounderStatus(founderId);

    res.status(201).json(investment);
  } catch {
    res.status(500).json({ error: "Failed to create investment" });
  }
});

// GET /api/admin/ventures/investments/:id
// Full detail: investment + rounds + founder profile + scoring history + last 3 traction check-ins
router.get("/admin/ventures/investments/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [investment] = await db
      .select({
        id: investmentsTable.id,
        founderId: investmentsTable.founderId,
        startupName: investmentsTable.startupName,
        investmentDate: investmentsTable.investmentDate,
        amountCad: investmentsTable.amountCad,
        amountUsd: investmentsTable.amountUsd,
        isLead: investmentsTable.isLead,
        equityPct: investmentsTable.equityPct,
        instrument: investmentsTable.instrument,
        roundName: investmentsTable.roundName,
        status: investmentsTable.status,
        notes: investmentsTable.notes,
        createdAt: investmentsTable.createdAt,
        updatedAt: investmentsTable.updatedAt,
        founderName: usersTable.name,
        founderEmail: usersTable.email,
        companyName: foundersTable.companyName,
        companyWebsite: foundersTable.companyWebsite,
        sector: foundersTable.sector,
        stage: foundersTable.stage,
        country: foundersTable.country,
        city: foundersTable.city,
        bio: foundersTable.bio,
        linkedinUrl: foundersTable.linkedinUrl,
        avatarUrl: foundersTable.avatarUrl,
        investmentStatus: foundersTable.investmentStatus,
      })
      .from(investmentsTable)
      .innerJoin(foundersTable, eq(foundersTable.id, investmentsTable.founderId))
      .innerJoin(usersTable, eq(usersTable.id, foundersTable.userId))
      .where(eq(investmentsTable.id, id));

    if (!investment) return res.status(404).json({ error: "Investment not found" });

    // Investment rounds
    const rounds = await db
      .select()
      .from(investmentRoundsTable)
      .where(eq(investmentRoundsTable.investmentId, id))
      .orderBy(investmentRoundsTable.date);

    // Last 3 traction check-ins for this founder
    const traction = await db
      .select()
      .from(tractionMetricsTable)
      .where(eq(tractionMetricsTable.founderId, investment.founderId))
      .orderBy(desc(tractionMetricsTable.periodYear), desc(tractionMetricsTable.periodMonth))
      .limit(3);

    // Scoring history: aggregate scores per round for any startup whose email matches the founder's email
    // Groups by program round, computing average weighted score across all criteria
    const scoring = await db
      .select({
        roundName: scoresTable.roundName,
        startupName: startupsTable.name,
        programId: scoresTable.programId,
        cohortId: scoresTable.cohortId,
        avgScore: avg(scoresTable.score),
        totalScores: count(scoresTable.id),
        latestAt: sql<string>`MAX(${scoresTable.createdAt})`,
      })
      .from(scoresTable)
      .innerJoin(startupsTable, eq(startupsTable.id, scoresTable.startupId))
      .where(eq(startupsTable.email, investment.founderEmail))
      .groupBy(
        scoresTable.roundName,
        startupsTable.name,
        scoresTable.programId,
        scoresTable.cohortId,
      )
      .orderBy(sql`MAX(${scoresTable.createdAt}) DESC`);

    res.json({ investment, rounds, traction, scoring });
  } catch {
    res.status(500).json({ error: "Failed to load investment detail" });
  }
});

// PUT /api/admin/ventures/investments/:id
router.put("/admin/ventures/investments/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const {
    startupName,
    investmentDate,
    amountCad,
    amountUsd,
    isLead,
    equityPct,
    instrument,
    roundName,
    notes,
    status,
  } = req.body as {
    startupName?: string;
    investmentDate?: string;
    amountCad?: string;
    amountUsd?: string;
    isLead?: boolean;
    equityPct?: string;
    instrument?: string;
    roundName?: string;
    notes?: string;
    status?: string;
  };

  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (startupName) updates.startupName = startupName;
    if (investmentDate) updates.investmentDate = investmentDate;
    if (amountCad !== undefined) updates.amountCad = amountCad;
    if (amountUsd !== undefined) updates.amountUsd = amountUsd;
    if (isLead !== undefined) updates.isLead = isLead;
    if (equityPct !== undefined) updates.equityPct = equityPct;
    if (instrument) updates.instrument = instrument;
    if (roundName !== undefined) updates.roundName = roundName;
    if (notes !== undefined) updates.notes = notes;
    if (status) {
      updates.status = status;
    }

    const [updated] = await db
      .update(investmentsTable)
      .set(updates as Partial<typeof investmentsTable.$inferInsert>)
      .where(eq(investmentsTable.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Investment not found" });
    }

    // Recalculate founder's investment_status from all their investments
    await recalcFounderStatus(updated.founderId);

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update investment" });
  }
});

// DELETE /api/admin/ventures/investments/:id
router.delete("/admin/ventures/investments/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [inv] = await db
      .select({ founderId: investmentsTable.founderId })
      .from(investmentsTable)
      .where(eq(investmentsTable.id, id));

    if (!inv) {
      return res.status(404).json({ error: "Investment not found" });
    }

    await db.delete(investmentsTable).where(eq(investmentsTable.id, id));

    // Recalculate founder status based on remaining investments
    await recalcFounderStatus(inv.founderId);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete investment" });
  }
});

// POST /api/admin/ventures/investments/:id/rounds
router.post("/admin/ventures/investments/:id/rounds", requireAuth, requireAdmin, async (req, res) => {
  const investmentId = parseInt(String(req.params.id));
  if (isNaN(investmentId)) return res.status(400).json({ error: "Invalid id" });

  const { roundName, amount, currency, isLead, date, notes } = req.body as {
    roundName: string;
    amount?: string;
    currency?: string;
    isLead?: boolean;
    date: string;
    notes?: string;
  };

  if (!roundName || !date) {
    return res.status(400).json({ error: "roundName and date are required" });
  }

  try {
    const [round] = await db
      .insert(investmentRoundsTable)
      .values({
        investmentId,
        roundName,
        amount: amount ?? null,
        currency: currency ?? "CAD",
        isLead: isLead ?? false,
        date,
        notes: notes ?? null,
      })
      .returning();
    res.status(201).json(round);
  } catch {
    res.status(500).json({ error: "Failed to add investment round" });
  }
});

export default router;
