import { Router } from "express";
import { db } from "@workspace/db";
import {
  dealFlowTable, icVotesTable, investmentsTable, foundersTable, usersTable,
} from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { requireIC } from "../lib/auth";

const router = Router();

router.get("/ic/deals", requireIC, async (req, res) => {
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
      .orderBy(desc(dealFlowTable.createdAt));

    const voteCounts = await db.select({
      dealId: icVotesTable.dealId,
      vote: icVotesTable.vote,
      cnt: count(icVotesTable.id),
    })
      .from(icVotesTable)
      .groupBy(icVotesTable.dealId, icVotesTable.vote);

    res.json({ deals, voteCounts });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch deals" });
  }
});

router.post("/ic/deals", requireIC, async (req, res) => {
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

router.put("/ic/deals/:id", requireIC, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const { pipelineStage, notes, decisionDate, sector, stage, amountSoughtCad, instrument } = req.body;

    const [deal] = await db.update(dealFlowTable).set({
      ...(pipelineStage !== undefined && { pipelineStage }),
      ...(notes !== undefined && { notes }),
      ...(decisionDate !== undefined && { decisionDate }),
      ...(sector !== undefined && { sector }),
      ...(stage !== undefined && { stage }),
      ...(amountSoughtCad !== undefined && { amountSoughtCad }),
      ...(instrument !== undefined && { instrument }),
      updatedAt: new Date(),
    }).where(eq(dealFlowTable.id, id)).returning();

    res.json({ deal });
  } catch (err) {
    res.status(500).json({ error: "Failed to update deal" });
  }
});

router.post("/ic/deals/:id/vote", requireIC, async (req, res) => {
  try {
    const dealId = Number(String(req.params.id));
    const { vote, comment } = req.body;
    if (!vote) return res.status(400).json({ error: "vote is required" });

    const existing = await db.select().from(icVotesTable)
      .where(eq(icVotesTable.dealId, dealId))
      .then(rows => rows.find(r => r.voterId === req.user!.userId));

    let result;
    if (existing) {
      const [updated] = await db.update(icVotesTable)
        .set({ vote, comment: comment || null })
        .where(eq(icVotesTable.id, existing.id))
        .returning();
      result = updated;
    } else {
      const [created] = await db.insert(icVotesTable).values({
        dealId,
        voterId: req.user!.userId,
        vote,
        comment: comment || null,
      }).returning();
      result = created;
    }

    res.json({ vote: result });
  } catch (err) {
    res.status(500).json({ error: "Failed to cast vote" });
  }
});

router.get("/ic/portfolio", requireIC, async (req, res) => {
  try {
    const portfolio = await db.select({
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
      founderName: usersTable.name,
    })
      .from(investmentsTable)
      .leftJoin(foundersTable, eq(investmentsTable.founderId, foundersTable.id))
      .leftJoin(usersTable, eq(foundersTable.userId, usersTable.id))
      .orderBy(desc(investmentsTable.createdAt));

    res.json({ portfolio });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

export default router;
