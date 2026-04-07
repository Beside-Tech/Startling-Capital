import { Router } from "express";
import { db } from "@workspace/db";
import { dealFlowTable, icVotesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireICOrVA, requireManagingPartner } from "../lib/auth";

type PipelineStage =
  | "sourced" | "interested" | "due_diligence" | "ready_for_ic"
  | "ic_approved" | "ic_rejected" | "closing" | "invested" | "passed" | "deal_dead"
  | "screening" | "ic_review" | "term_sheet" | "closed";

const VALID_TRANSITIONS: Record<string, PipelineStage[]> = {
  sourced:       ["interested", "passed", "deal_dead"],
  interested:    ["due_diligence", "passed", "deal_dead"],
  due_diligence: ["ready_for_ic", "passed", "deal_dead"],
  ready_for_ic:  ["ic_approved", "ic_rejected", "deal_dead"],
  ic_approved:   ["closing", "deal_dead"],
  ic_rejected:   ["deal_dead"],
  closing:       ["invested", "passed", "deal_dead"],
  invested:      [],
  passed:        [],
  deal_dead:     [],
  screening:     ["due_diligence", "passed", "deal_dead"],
  ic_review:     ["ic_approved", "ic_rejected", "deal_dead"],
  term_sheet:    ["closing", "invested", "deal_dead"],
  closed:        [],
};

// Stages that only IC members (or above) can advance from — VAs handle early pipeline only
const IC_GATED_SOURCES: PipelineStage[] = ["due_diligence", "ready_for_ic", "ic_approved", "ic_rejected", "ic_review", "screening"];
// Stages that only Managing Partners (or above) can target
const MP_ONLY_TARGETS: PipelineStage[] = ["ic_approved", "ic_rejected", "closing", "invested"];
// Venture Associates can only advance deals from these early-pipeline stages
const VA_ALLOWED_SOURCES: PipelineStage[] = ["sourced", "interested"];

const router = Router();

router.patch("/deals/:id/stage", requireICOrVA, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const { toStage } = req.body as { toStage?: string };
    if (!toStage) return res.status(400).json({ error: "toStage is required" });

    const [deal] = await db.select({ pipelineStage: dealFlowTable.pipelineStage })
      .from(dealFlowTable).where(eq(dealFlowTable.id, id)).limit(1);

    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const role = req.user!.role;

    // Venture Associates can only move deals that are still in their early-pipeline purview
    if (role === "VentureAssociate" && !VA_ALLOWED_SOURCES.includes(deal.pipelineStage as PipelineStage)) {
      return res.status(403).json({
        error: `Venture Associates can only advance deals from sourced/interested stages (current: ${deal.pipelineStage})`,
      });
    }

    // IC members cannot advance deals that have entered IC decision territory if they are a VA
    if (IC_GATED_SOURCES.includes(deal.pipelineStage as PipelineStage) && role === "VentureAssociate") {
      return res.status(403).json({ error: `Venture Associates cannot advance deals from '${deal.pipelineStage}' stage` });
    }

    const allowed = VALID_TRANSITIONS[deal.pipelineStage] ?? [];
    if (!allowed.includes(toStage as PipelineStage)) {
      return res.status(400).json({
        error: `Invalid transition: ${deal.pipelineStage} → ${toStage}`,
        allowedTransitions: allowed,
      });
    }

    if (MP_ONLY_TARGETS.includes(toStage as PipelineStage) && role !== "ManagingPartner" && role !== "SuperAdmin") {
      return res.status(403).json({ error: `Only Managing Partners can move deals to '${toStage}'` });
    }

    const [updated] = await db.update(dealFlowTable)
      .set({ pipelineStage: toStage as PipelineStage, updatedAt: new Date() })
      .where(eq(dealFlowTable.id, id))
      .returning();

    res.json({ deal: updated, previousStage: deal.pipelineStage, newStage: toStage });
  } catch {
    res.status(500).json({ error: "Failed to advance deal stage" });
  }
});

router.get("/ventures-vc/deals", requireICOrVA, async (_req, res) => {
  try {
    const deals = await db.select()
      .from(dealFlowTable)
      .orderBy(dealFlowTable.updatedAt);
    res.json({ deals });
  } catch {
    res.status(500).json({ error: "Failed to fetch deals" });
  }
});

router.get("/ventures-vc/deals/:id", requireICOrVA, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const [deal] = await db.select().from(dealFlowTable)
      .where(eq(dealFlowTable.id, id)).limit(1);

    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const votes = await db.select().from(icVotesTable)
      .where(eq(icVotesTable.dealId, id));

    res.json({ deal, votes });
  } catch {
    res.status(500).json({ error: "Failed to fetch deal" });
  }
});

export default router;
