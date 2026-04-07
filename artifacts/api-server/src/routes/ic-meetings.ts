import { Router } from "express";
import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import {
  icMeetingsTable, icMeetingDealsTable, dealFlowTable, usersTable, icVotesTable,
} from "@workspace/db";
import { eq, desc, count, and, inArray } from "drizzle-orm";
import { requireIC, requireManagingPartner, requireICOrVA } from "../lib/auth";

const router = Router();

router.get("/ic/meetings", requireICOrVA, async (req, res) => {
  try {
    const meetings = await db
      .select({
        id: icMeetingsTable.id,
        title: icMeetingsTable.title,
        scheduledAt: icMeetingsTable.scheduledAt,
        status: icMeetingsTable.status,
        quorumReached: icMeetingsTable.quorumReached,
        agenda: icMeetingsTable.agenda,
        notes: icMeetingsTable.notes,
        createdAt: icMeetingsTable.createdAt,
        createdByName: usersTable.name,
      })
      .from(icMeetingsTable)
      .leftJoin(usersTable, eq(icMeetingsTable.createdById, usersTable.id))
      .orderBy(desc(icMeetingsTable.scheduledAt));

    res.json({ meetings });
  } catch {
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
});

router.post("/ic/meetings", requireManagingPartner, async (req, res) => {
  try {
    const { title, scheduledAt, agenda, status, notes } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });

    const [meeting] = await db.insert(icMeetingsTable).values({
      title,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      agenda: agenda || null,
      status: status || "draft",
      notes: notes || null,
      createdById: req.user!.userId,
    }).returning();

    res.status(201).json({ meeting });
  } catch {
    res.status(500).json({ error: "Failed to create meeting" });
  }
});

router.get("/ic/meetings/:id", requireICOrVA, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const [meeting] = await db
      .select({
        id: icMeetingsTable.id,
        title: icMeetingsTable.title,
        scheduledAt: icMeetingsTable.scheduledAt,
        status: icMeetingsTable.status,
        quorumReached: icMeetingsTable.quorumReached,
        agenda: icMeetingsTable.agenda,
        notes: icMeetingsTable.notes,
        minutesUrl: icMeetingsTable.minutesUrl,
        createdAt: icMeetingsTable.createdAt,
        updatedAt: icMeetingsTable.updatedAt,
        createdByName: usersTable.name,
      })
      .from(icMeetingsTable)
      .leftJoin(usersTable, eq(icMeetingsTable.createdById, usersTable.id))
      .where(eq(icMeetingsTable.id, id))
      .limit(1);

    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const deals = await db
      .select({
        id: icMeetingDealsTable.id,
        dealId: icMeetingDealsTable.dealId,
        packetUrl: icMeetingDealsTable.packetUrl,
        shareToken: icMeetingDealsTable.shareToken,
        recommendation: icMeetingDealsTable.recommendation,
        decisionReached: icMeetingDealsTable.decisionReached,
        decisionNotes: icMeetingDealsTable.decisionNotes,
        companyName: dealFlowTable.companyName,
        sector: dealFlowTable.sector,
        pipelineStage: dealFlowTable.pipelineStage,
        amountSoughtCad: dealFlowTable.amountSoughtCad,
        presenterName: usersTable.name,
      })
      .from(icMeetingDealsTable)
      .leftJoin(dealFlowTable, eq(icMeetingDealsTable.dealId, dealFlowTable.id))
      .leftJoin(usersTable, eq(icMeetingDealsTable.presentedById, usersTable.id))
      .where(eq(icMeetingDealsTable.meetingId, id));

    const dealIds = deals.map(d => d.dealId);
    const votesByDeal: Record<number, { id: number; vote: string; voterName?: string | null; dissentNote?: string | null }[]> = {};
    if (dealIds.length > 0) {
      const allVotes = await db
        .select({
          dealId: icVotesTable.dealId,
          id: icVotesTable.id,
          vote: icVotesTable.vote,
          dissentNote: icVotesTable.dissentNote,
          voterName: usersTable.name,
        })
        .from(icVotesTable)
        .leftJoin(usersTable, eq(icVotesTable.voterId, usersTable.id))
        .where(inArray(icVotesTable.dealId, dealIds));

      for (const v of allVotes) {
        if (!votesByDeal[v.dealId]) votesByDeal[v.dealId] = [];
        votesByDeal[v.dealId].push({ id: v.id, vote: v.vote, voterName: v.voterName, dissentNote: v.dissentNote });
      }
    }

    const dealsWithVotes = deals.map(d => ({ ...d, votes: votesByDeal[d.dealId] ?? [] }));
    res.json({ meeting, deals: dealsWithVotes });
  } catch {
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
});

router.put("/ic/meetings/:id", requireManagingPartner, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const { title, scheduledAt, agenda, status, notes, quorumReached, minutesUrl } = req.body;

    const [updated] = await db.update(icMeetingsTable).set({
      ...(title !== undefined && { title }),
      ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
      ...(agenda !== undefined && { agenda }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
      ...(quorumReached !== undefined && { quorumReached }),
      ...(minutesUrl !== undefined && { minutesUrl }),
      updatedAt: new Date(),
    }).where(eq(icMeetingsTable.id, id)).returning();

    res.json({ meeting: updated });
  } catch {
    res.status(500).json({ error: "Failed to update meeting" });
  }
});

router.post("/ic/meetings/:id/deals", requireManagingPartner, async (req, res) => {
  try {
    const meetingId = Number(String(req.params.id));
    const { dealId, packetUrl, recommendation, presentedById } = req.body;
    if (!dealId) return res.status(400).json({ error: "dealId is required" });

    const shareToken = randomBytes(32).toString("hex");

    const [entry] = await db.insert(icMeetingDealsTable).values({
      meetingId,
      dealId: Number(dealId),
      packetUrl: packetUrl || null,
      shareToken,
      recommendation: recommendation || null,
      presentedById: presentedById ? Number(presentedById) : null,
    }).returning();

    res.status(201).json({ entry });
  } catch {
    res.status(500).json({ error: "Failed to add deal to meeting" });
  }
});

// POST /api/ic/meetings/:id/deals/:dealEntryId/generate-token — regenerate share token
router.post("/ic/meetings/:id/deals/:dealEntryId/generate-token", requireManagingPartner, async (req, res) => {
  try {
    const dealEntryId = Number(String(req.params.dealEntryId));
    const shareToken = randomBytes(32).toString("hex");
    const [updated] = await db.update(icMeetingDealsTable)
      .set({ shareToken })
      .where(eq(icMeetingDealsTable.id, dealEntryId))
      .returning();
    if (!updated) return res.status(404).json({ error: "Deal entry not found" });
    res.json({ shareToken: updated.shareToken, packetUrl: updated.packetUrl });
  } catch {
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// GET /api/ic/packets/:shareToken — public read-only packet access (no auth required)
router.get("/ic/packets/:shareToken", async (req, res) => {
  try {
    const { shareToken } = req.params;
    const [entry] = await db
      .select({
        id: icMeetingDealsTable.id,
        packetUrl: icMeetingDealsTable.packetUrl,
        recommendation: icMeetingDealsTable.recommendation,
        decisionNotes: icMeetingDealsTable.decisionNotes,
        companyName: dealFlowTable.companyName,
        sector: dealFlowTable.sector,
        pipelineStage: dealFlowTable.pipelineStage,
        amountSoughtCad: dealFlowTable.amountSoughtCad,
        meetingTitle: icMeetingsTable.title,
        meetingScheduledAt: icMeetingsTable.scheduledAt,
        presenterName: usersTable.name,
      })
      .from(icMeetingDealsTable)
      .leftJoin(dealFlowTable, eq(icMeetingDealsTable.dealId, dealFlowTable.id))
      .leftJoin(icMeetingsTable, eq(icMeetingDealsTable.meetingId, icMeetingsTable.id))
      .leftJoin(usersTable, eq(icMeetingDealsTable.presentedById, usersTable.id))
      .where(eq(icMeetingDealsTable.shareToken, shareToken))
      .limit(1);

    if (!entry) return res.status(404).json({ error: "Packet not found or link expired" });
    res.json({ packet: entry });
  } catch {
    res.status(500).json({ error: "Failed to fetch packet" });
  }
});

router.put("/ic/meetings/:id/deals/:dealEntryId", requireManagingPartner, async (req, res) => {
  try {
    const dealEntryId = Number(String(req.params.dealEntryId));
    const { recommendation, decisionReached, decisionNotes, packetUrl } = req.body;

    const [updated] = await db.update(icMeetingDealsTable).set({
      ...(recommendation !== undefined && { recommendation }),
      ...(decisionReached !== undefined && { decisionReached }),
      ...(decisionNotes !== undefined && { decisionNotes }),
      ...(packetUrl !== undefined && { packetUrl }),
    }).where(eq(icMeetingDealsTable.id, dealEntryId)).returning();

    res.json({ entry: updated });
  } catch {
    res.status(500).json({ error: "Failed to update deal entry" });
  }
});

// DELETE /api/ic/meetings/:id/deals/:dealEntryId — remove a deal from an IC meeting packet
router.delete("/ic/meetings/:id/deals/:dealEntryId", requireManagingPartner, async (req, res) => {
  try {
    const meetingId = Number(String(req.params.id));
    const dealEntryId = Number(String(req.params.dealEntryId));

    const [deleted] = await db.delete(icMeetingDealsTable)
      .where(
        and(
          eq(icMeetingDealsTable.id, dealEntryId),
          eq(icMeetingDealsTable.meetingId, meetingId),
        )
      )
      .returning();

    if (!deleted) return res.status(404).json({ error: "Deal entry not found in this meeting" });

    res.json({ deleted });
  } catch {
    res.status(500).json({ error: "Failed to remove deal from meeting" });
  }
});

export default router;
