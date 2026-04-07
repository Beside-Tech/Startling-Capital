import { Router } from "express";
import { db } from "@workspace/db";
import { icVotesTable, dealFlowTable, usersTable } from "@workspace/db";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { requireIC } from "../lib/auth";

const router = Router();

router.get("/ic/votes/:dealId", requireIC, async (req, res) => {
  try {
    const dealId = Number(String(req.params.dealId));
    const votes = await db.select({
      id: icVotesTable.id,
      dealId: icVotesTable.dealId,
      vote: icVotesTable.vote,
      comment: icVotesTable.comment,
      dissentNote: icVotesTable.dissentNote,
      createdAt: icVotesTable.createdAt,
      updatedAt: icVotesTable.updatedAt,
      voterName: usersTable.name,
      voterEmail: usersTable.email,
    })
      .from(icVotesTable)
      .leftJoin(usersTable, eq(icVotesTable.voterId, usersTable.id))
      .where(eq(icVotesTable.dealId, dealId))
      .orderBy(desc(icVotesTable.createdAt));

    const tally = votes.reduce(
      (acc, v) => {
        if (v.vote === "approve") acc.approves++;
        else if (v.vote === "reject") acc.rejects++;
        else if (v.vote === "abstain") acc.abstains++;
        else if (v.vote === "more_info") acc.moreInfo++;
        acc.total++;
        return acc;
      },
      { approves: 0, rejects: 0, abstains: 0, moreInfo: 0, total: 0 }
    );

    res.json({ votes, tally });
  } catch {
    res.status(500).json({ error: "Failed to fetch votes" });
  }
});

router.post("/ic/votes/:dealId", requireIC, async (req, res) => {
  try {
    const dealId = Number(String(req.params.dealId));
    const { vote, comment, dissentNote } = req.body as {
      vote?: "approve" | "reject" | "abstain" | "more_info";
      comment?: string;
      dissentNote?: string;
    };

    if (!vote || !["approve", "reject", "abstain", "more_info"].includes(vote)) {
      return res.status(400).json({ error: "vote must be one of: approve, reject, abstain, more_info" });
    }

    if (dissentNote && vote !== "reject") {
      return res.status(400).json({ error: "dissentNote is only applicable for reject votes" });
    }

    const [deal] = await db.select({ id: dealFlowTable.id, pipelineStage: dealFlowTable.pipelineStage })
      .from(dealFlowTable).where(eq(dealFlowTable.id, dealId)).limit(1);

    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const existing = await db.select({ id: icVotesTable.id })
      .from(icVotesTable)
      .where(and(eq(icVotesTable.dealId, dealId), eq(icVotesTable.voterId, req.user!.userId)))
      .limit(1);

    let icVote;
    if (existing.length > 0) {
      [icVote] = await db.update(icVotesTable).set({
        vote,
        comment: comment ?? null,
        dissentNote: vote === "reject" ? (dissentNote ?? null) : null,
        updatedAt: new Date(),
      }).where(eq(icVotesTable.id, existing[0].id)).returning();
    } else {
      [icVote] = await db.insert(icVotesTable).values({
        dealId,
        voterId: req.user!.userId,
        vote,
        comment: comment ?? null,
        dissentNote: vote === "reject" ? (dissentNote ?? null) : null,
      }).returning();
    }

    const allVotes = await db.select({ vote: icVotesTable.vote })
      .from(icVotesTable).where(eq(icVotesTable.dealId, dealId));

    const tally = allVotes.reduce(
      (acc, v) => {
        if (v.vote === "approve") acc.approves++;
        else if (v.vote === "reject") acc.rejects++;
        else if (v.vote === "abstain") acc.abstains++;
        acc.total++;
        return acc;
      },
      { approves: 0, rejects: 0, abstains: 0, total: 0 }
    );

    let autoAdvancedTo: string | null = null;
    if (
      (deal.pipelineStage === "ready_for_ic" || deal.pipelineStage === "ic_review") &&
      tally.total >= 2
    ) {
      let newStage: "ic_approved" | "ic_rejected" | null = null;
      if (tally.approves > tally.total / 2) newStage = "ic_approved";
      else if (tally.rejects > tally.total / 2) newStage = "ic_rejected";

      if (newStage) {
        await db.update(dealFlowTable).set({
          pipelineStage: newStage,
          decisionDate: new Date().toISOString().slice(0, 10),
          updatedAt: new Date(),
        }).where(eq(dealFlowTable.id, dealId));
        autoAdvancedTo = newStage;
      }
    }

    res.json({ icVote, tally, autoAdvancedTo });
  } catch {
    res.status(500).json({ error: "Failed to record vote" });
  }
});

router.put("/ic/votes/:dealId/dissent", requireIC, async (req, res) => {
  try {
    const dealId = Number(String(req.params.dealId));
    const { dissentNote } = req.body as { dissentNote?: string };
    if (!dissentNote) return res.status(400).json({ error: "dissentNote is required" });

    const [vote] = await db.select()
      .from(icVotesTable)
      .where(and(eq(icVotesTable.dealId, dealId), eq(icVotesTable.voterId, req.user!.userId)))
      .limit(1);

    if (!vote) return res.status(404).json({ error: "No vote found for this deal" });
    if (vote.vote !== "reject") return res.status(400).json({ error: "Can only add dissent note to a reject vote" });

    const [updated] = await db.update(icVotesTable).set({
      dissentNote,
      updatedAt: new Date(),
    }).where(eq(icVotesTable.id, vote.id)).returning();

    res.json({ vote: updated });
  } catch {
    res.status(500).json({ error: "Failed to update dissent note" });
  }
});

export default router;
