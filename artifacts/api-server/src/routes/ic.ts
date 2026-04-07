import { Router } from "express";
import { db } from "@workspace/db";
import {
  dealFlowTable, icVotesTable, investmentsTable, foundersTable, usersTable,
} from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { requireIC, requireManagingPartner } from "../lib/auth";

type PipelineStage = "sourced" | "screening" | "due_diligence" | "ic_review" | "term_sheet" | "closed" | "passed";

const VALID_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  sourced:       ["screening", "passed"],
  screening:     ["due_diligence", "passed"],
  due_diligence: ["ic_review", "passed"],
  ic_review:     ["term_sheet", "passed"],
  term_sheet:    ["closed", "passed"],
  closed:        [],
  passed:        [],
};

const MP_ONLY_TARGETS: PipelineStage[] = ["ic_review", "term_sheet", "closed"];

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

// GET /api/ic/deal/:id — get single deal detail with votes
router.get("/ic/deal/:id", requireIC, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const [deal] = await db
      .select()
      .from(dealFlowTable)
      .where(eq(dealFlowTable.id, id));

    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const votes = await db
      .select({
        id: icVotesTable.id,
        vote: icVotesTable.vote,
        comment: icVotesTable.comment,
        voterName: usersTable.name,
        createdAt: icVotesTable.createdAt,
      })
      .from(icVotesTable)
      .leftJoin(usersTable, eq(icVotesTable.voterId, usersTable.id))
      .where(eq(icVotesTable.dealId, id));

    res.json({ ...deal, votes });
  } catch {
    res.status(500).json({ error: "Failed to fetch deal" });
  }
});

router.patch("/deals/:id/stage", requireIC, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const { stage } = req.body as { stage: PipelineStage };
    if (!stage) return res.status(400).json({ error: "stage is required" });

    const [current] = await db.select({ pipelineStage: dealFlowTable.pipelineStage })
      .from(dealFlowTable).where(eq(dealFlowTable.id, id)).limit(1);
    if (!current) return res.status(404).json({ error: "Deal not found" });

    const from = current.pipelineStage as PipelineStage;
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (!allowed.includes(stage)) {
      return res.status(422).json({
        error: `Invalid transition: ${from} → ${stage}. Allowed: ${allowed.join(", ") || "none"}`,
      });
    }

    const role = req.user?.role ?? "";
    if (MP_ONLY_TARGETS.includes(stage) && role !== "ManagingPartner" && role !== "SuperAdmin") {
      return res.status(403).json({ error: `Advancing to '${stage}' requires Managing Partner role` });
    }

    const [updated] = await db.update(dealFlowTable)
      .set({ pipelineStage: stage, decisionDate: new Date().toISOString().slice(0, 10), updatedAt: new Date() })
      .where(eq(dealFlowTable.id, id)).returning();

    res.json({ deal: updated });
  } catch {
    res.status(500).json({ error: "Failed to advance deal stage" });
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

    const allVotes = await db.select().from(icVotesTable).where(eq(icVotesTable.dealId, dealId));
    const total = allVotes.length;
    const approves = allVotes.filter(v => v.vote === "approve").length;
    const rejects  = allVotes.filter(v => v.vote === "reject").length;

    let autoAdvancedTo: string | null = null;
    if (total >= 2) {
      const [currentDeal] = await db.select({ pipelineStage: dealFlowTable.pipelineStage })
        .from(dealFlowTable).where(eq(dealFlowTable.id, dealId)).limit(1);

      if (currentDeal?.pipelineStage === "ic_review") {
        let newStage: PipelineStage | null = null;
        if (approves > total / 2) newStage = "term_sheet";
        else if (rejects > total / 2) newStage = "passed";

        if (newStage) {
          await db.update(dealFlowTable)
            .set({ pipelineStage: newStage, decisionDate: new Date().toISOString().slice(0, 10), updatedAt: new Date() })
            .where(eq(dealFlowTable.id, dealId));
          autoAdvancedTo = newStage;
        }
      }
    }

    res.json({ vote: result, tally: { total, approves, rejects }, autoAdvancedTo });
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
