import { Router } from "express";
import { db } from "@workspace/db";
import {
  investmentsTable, investmentRoundsTable, foundersTable, usersTable,
  lpProfilesTable, dealFlowTable, icVotesTable, dataRoomFilesTable, advisorySessionsTable,
} from "@workspace/db";
import { eq, desc, count, sql, and } from "drizzle-orm";
import { requireManagingPartner, requireICOrVA } from "../lib/auth";

const router = Router();

router.get("/mp/dashboard", requireManagingPartner, async (req, res) => {
  try {
    const [investmentStats] = await db.select({
      totalInvestments: count(investmentsTable.id),
      totalDeployedCad: sql<string>`COALESCE(SUM(${investmentsTable.amountCad}), 0)`,
    }).from(investmentsTable).where(eq(investmentsTable.status, "active"));

    const [dealStats] = await db.select({
      totalDeals: count(dealFlowTable.id),
      icReview: sql<string>`COUNT(CASE WHEN ${dealFlowTable.pipelineStage} IN ('ic_review','ready_for_ic','ic_approved','ic_rejected') THEN 1 END)`,
      termSheet: sql<string>`COUNT(CASE WHEN ${dealFlowTable.pipelineStage} IN ('term_sheet','closing') THEN 1 END)`,
    }).from(dealFlowTable);

    const [lpStats] = await db.select({
      totalLPs: count(lpProfilesTable.id),
      totalCommittedCad: sql<string>`COALESCE(SUM(${lpProfilesTable.commitmentCad}), 0)`,
    }).from(lpProfilesTable).where(eq(lpProfilesTable.active, true));

    const [portfolioFounders] = await db.select({
      cnt: count(foundersTable.id),
    }).from(foundersTable).where(eq(foundersTable.investmentStatus, "portfolio"));

    res.json({
      investments: { total: investmentStats.totalInvestments, deployedCad: investmentStats.totalDeployedCad },
      deals: { total: dealStats.totalDeals, icReview: dealStats.icReview, termSheet: dealStats.termSheet },
      lps: { total: lpStats.totalLPs, committedCad: lpStats.totalCommittedCad },
      portfolio: { founders: portfolioFounders.cnt },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

router.get("/mp/investments", requireICOrVA, async (req, res) => {
  try {
    const investments = await db.select({
      id: investmentsTable.id,
      startupName: investmentsTable.startupName,
      amountCad: investmentsTable.amountCad,
      amountUsd: investmentsTable.amountUsd,
      equityPct: investmentsTable.equityPct,
      instrument: investmentsTable.instrument,
      status: investmentsTable.status,
      investmentDate: investmentsTable.investmentDate,
      roundName: investmentsTable.roundName,
      isLead: investmentsTable.isLead,
      notes: investmentsTable.notes,
      founderName: usersTable.name,
      founderEmail: usersTable.email,
      sector: foundersTable.sector,
      stage: foundersTable.stage,
      investmentStatus: foundersTable.investmentStatus,
    })
      .from(investmentsTable)
      .leftJoin(foundersTable, eq(investmentsTable.founderId, foundersTable.id))
      .leftJoin(usersTable, eq(foundersTable.userId, usersTable.id))
      .orderBy(desc(investmentsTable.investmentDate));

    res.json({ investments });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch investments" });
  }
});

router.get("/mp/lps", requireManagingPartner, async (req, res) => {
  try {
    const lps = await db.select({
      id: lpProfilesTable.id,
      firmName: lpProfilesTable.firmName,
      contactName: lpProfilesTable.contactName,
      commitmentCad: lpProfilesTable.commitmentCad,
      capitalCalledCad: lpProfilesTable.capitalCalledCad,
      country: lpProfilesTable.country,
      investorType: lpProfilesTable.investorType,
      active: lpProfilesTable.active,
      notes: lpProfilesTable.notes,
      email: usersTable.email,
      userName: usersTable.name,
    })
      .from(lpProfilesTable)
      .leftJoin(usersTable, eq(lpProfilesTable.userId, usersTable.id))
      .orderBy(desc(lpProfilesTable.createdAt));

    res.json({ lps });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch LPs" });
  }
});

router.post("/mp/lps", requireManagingPartner, async (req, res) => {
  try {
    const { userId, firmName, contactName, commitmentCad, investorType, country, notes } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const [lp] = await db.insert(lpProfilesTable).values({
      userId: Number(userId),
      firmName: firmName || null,
      contactName: contactName || null,
      commitmentCad: commitmentCad || null,
      capitalCalledCad: "0",
      investorType: investorType || "individual",
      country: country || null,
      notes: notes || null,
    }).returning();

    res.status(201).json({ lp });
  } catch (err) {
    res.status(500).json({ error: "Failed to create LP profile" });
  }
});

router.get("/mp/deal-flow", requireICOrVA, async (req, res) => {
  try {
    const deals = await db.select({
      id: dealFlowTable.id,
      companyName: dealFlowTable.companyName,
      sector: dealFlowTable.sector,
      stage: dealFlowTable.stage,
      amountSoughtCad: dealFlowTable.amountSoughtCad,
      instrument: dealFlowTable.instrument,
      pipelineStage: dealFlowTable.pipelineStage,
      source: dealFlowTable.source,
      notes: dealFlowTable.notes,
      decisionDate: dealFlowTable.decisionDate,
      createdAt: dealFlowTable.createdAt,
      assignedToName: usersTable.name,
    })
      .from(dealFlowTable)
      .leftJoin(usersTable, eq(dealFlowTable.assignedToId, usersTable.id))
      .orderBy(desc(dealFlowTable.updatedAt));

    res.json({ deals });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch deal flow" });
  }
});

router.post("/mp/deal-flow", requireManagingPartner, async (req, res) => {
  try {
    const { companyName, sector, stage, amountSoughtCad, instrument, pipelineStage, source, notes, decisionDate } = req.body;
    if (!companyName) return res.status(400).json({ error: "companyName is required" });

    const [deal] = await db.insert(dealFlowTable).values({
      companyName,
      sector: sector || null,
      stage: stage || null,
      amountSoughtCad: amountSoughtCad || null,
      instrument: instrument || "SAFE",
      pipelineStage: pipelineStage || "sourced",
      source: source || null,
      notes: notes || null,
      decisionDate: decisionDate || null,
      assignedToId: req.user!.userId,
    }).returning();

    res.status(201).json({ deal });
  } catch (err) {
    res.status(500).json({ error: "Failed to create deal" });
  }
});

router.put("/mp/deal-flow/:id", requireManagingPartner, async (req, res) => {
  try {
    if ("pipelineStage" in req.body) {
      return res.status(400).json({
        error: "Direct pipelineStage mutation is not allowed. Use PATCH /api/deals/:id/stage to advance the state machine.",
      });
    }
    const id = Number(String(req.params.id));
    const { notes, decisionDate } = req.body;

    const [deal] = await db.update(dealFlowTable).set({
      ...(notes !== undefined && { notes }),
      ...(decisionDate !== undefined && { decisionDate }),
      updatedAt: new Date(),
    }).where(eq(dealFlowTable.id, id)).returning();

    res.json({ deal });
  } catch (err) {
    res.status(500).json({ error: "Failed to update deal" });
  }
});

router.get("/mp/advisory", requireICOrVA, async (req, res) => {
  try {
    const sessions = await db.select({
      id: advisorySessionsTable.id,
      topic: advisorySessionsTable.topic,
      description: advisorySessionsTable.description,
      status: advisorySessionsTable.status,
      scheduledAt: advisorySessionsTable.scheduledAt,
      createdAt: advisorySessionsTable.createdAt,
      preferredDate: advisorySessionsTable.preferredDate,
      founderCompany: foundersTable.companyName,
      founderName: usersTable.name,
    })
      .from(advisorySessionsTable)
      .leftJoin(foundersTable, eq(advisorySessionsTable.founderId, foundersTable.id))
      .leftJoin(usersTable, eq(foundersTable.userId, usersTable.id))
      .orderBy(desc(advisorySessionsTable.createdAt));

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch advisory sessions" });
  }
});

router.put("/mp/advisory/:id", requireManagingPartner, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const { status, scheduledAt, meetingUrl, notes, advisorId } = req.body;

    const [session] = await db.update(advisorySessionsTable).set({
      ...(status !== undefined && { status }),
      ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
      ...(meetingUrl !== undefined && { meetingUrl }),
      ...(notes !== undefined && { notes }),
      ...(advisorId !== undefined && { advisorId: advisorId || null }),
      updatedAt: new Date(),
    }).where(eq(advisorySessionsTable.id, id)).returning();

    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: "Failed to update session" });
  }
});

export default router;
