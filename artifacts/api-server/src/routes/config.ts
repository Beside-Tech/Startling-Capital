import { Router } from "express";
import { db } from "@workspace/db";
import {
  roundsTable,
  startupsTable,
  judgesTable,
  judgeAssignmentsTable,
  rubricCriteriaTable,
  rubricScaleTable,
  criterionLevelGuidanceTable,
  advancementRulesTable,
} from "@workspace/db";
import { eq, and, or, inArray } from "drizzle-orm";
import { requireAuth, checkJudgeAccess } from "../lib/auth";

const router = Router();

router.get("/config", requireAuth, async (req, res) => {
  const { programId, cohortId } = req.query as { programId?: string; cohortId?: string };

  if (!programId || !cohortId) {
    res.status(400).json({ error: "BadRequest", message: "programId and cohortId are required" });
    return;
  }

  // Access check for judges
  if (req.user!.role === "Judge") {
    const judgeId = req.user!.judgeId;
    if (!judgeId) {
      res.status(403).json({ error: "Forbidden", message: "Access denied" });
      return;
    }
    const allowed = await checkJudgeAccess(judgeId, programId, cohortId);
    if (!allowed) {
      res.status(403).json({ error: "Forbidden", message: "Access denied to this program/cohort" });
      return;
    }
  }

  const [rounds, startups, assignments, rubric, rubricScale, guidance, advancementRules] =
    await Promise.all([
      db
        .select()
        .from(roundsTable)
        .where(and(eq(roundsTable.programId, programId), eq(roundsTable.active, true)))
        .orderBy(roundsTable.sequence),

      db
        .select()
        .from(startupsTable)
        .where(
          and(
            eq(startupsTable.programId, programId),
            eq(startupsTable.cohortId, cohortId),
            eq(startupsTable.active, true),
          ),
        ),

      db
        .select({
          id: judgeAssignmentsTable.id,
          programId: judgeAssignmentsTable.programId,
          cohortId: judgeAssignmentsTable.cohortId,
          judgeId: judgeAssignmentsTable.judgeId,
          active: judgeAssignmentsTable.active,
          judgeName: judgesTable.name,
        })
        .from(judgeAssignmentsTable)
        .leftJoin(judgesTable, eq(judgesTable.id, judgeAssignmentsTable.judgeId))
        .where(
          and(
            eq(judgeAssignmentsTable.programId, programId),
            eq(judgeAssignmentsTable.cohortId, cohortId),
            eq(judgeAssignmentsTable.active, true),
          ),
        ),

      db
        .select()
        .from(rubricCriteriaTable)
        .where(
          and(
            or(
              eq(rubricCriteriaTable.programId, programId),
              eq(rubricCriteriaTable.programId, "ALL"),
            ),
            eq(rubricCriteriaTable.active, true),
          ),
        ),

      db
        .select()
        .from(rubricScaleTable)
        .where(eq(rubricScaleTable.active, true))
        .orderBy(rubricScaleTable.score),

      db
        .select()
        .from(criterionLevelGuidanceTable)
        .where(eq(criterionLevelGuidanceTable.active, true)),

      db
        .select()
        .from(advancementRulesTable)
        .where(
          and(
            or(
              eq(advancementRulesTable.programId, programId),
              eq(advancementRulesTable.programId, "ALL"),
            ),
            or(
              eq(advancementRulesTable.cohortId, cohortId),
              eq(advancementRulesTable.cohortId, "ALL"),
            ),
            eq(advancementRulesTable.active, true),
          ),
        ),
    ]);

  // Get assigned judge IDs for this program/cohort
  const assignedJudgeIds = assignments.map((a) => a.judgeId);

  const judges =
    assignedJudgeIds.length > 0
      ? await db
          .select()
          .from(judgesTable)
          .where(and(eq(judgesTable.active, true), inArray(judgesTable.id, assignedJudgeIds)))
      : [];

  res.json({
    rounds,
    startups,
    judges,
    rubric,
    rubricScale,
    guidance,
    advancementRules,
    judgeAssignments: assignments.map((a) => ({
      ...a,
      programName: null,
      cohortName: null,
    })),
  });
});

export default router;
