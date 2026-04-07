import { Router } from "express";
import { db } from "@workspace/db";
import { programsTable, cohortsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, checkJudgeAccess, getAssignments } from "../lib/auth";

const router = Router();

router.get("/programs", requireAuth, async (req, res) => {
  if (req.user!.role === "Admin") {
    const programs = await db
      .select()
      .from(programsTable)
      .where(eq(programsTable.active, true));
    res.json(programs);
    return;
  }

  // Judge — only assigned programs
  const judgeId = req.user!.judgeId;
  if (!judgeId) {
    res.json([]);
    return;
  }

  const assignments = await getAssignments(judgeId);
  const programIds = [...new Set(assignments.map((a) => a.programId))];

  if (programIds.length === 0) {
    res.json([]);
    return;
  }

  const programs = await db
    .select()
    .from(programsTable)
    .where(and(eq(programsTable.active, true), inArray(programsTable.id, programIds)));

  res.json(programs);
});

router.get("/cohorts", requireAuth, async (req, res) => {
  const { programId } = req.query as { programId?: string };
  if (!programId) {
    res.status(400).json({ error: "BadRequest", message: "programId is required" });
    return;
  }

  if (req.user!.role === "Admin") {
    const cohorts = await db
      .select()
      .from(cohortsTable)
      .where(and(eq(cohortsTable.programId, programId), eq(cohortsTable.active, true)));
    res.json(cohorts);
    return;
  }

  // Judge — only assigned cohorts
  const judgeId = req.user!.judgeId;
  if (!judgeId) {
    res.json([]);
    return;
  }

  const assignments = await getAssignments(judgeId);
  const cohortIds = assignments
    .filter((a) => a.programId === programId)
    .map((a) => a.cohortId);

  if (cohortIds.length === 0) {
    res.json([]);
    return;
  }

  const cohorts = await db
    .select()
    .from(cohortsTable)
    .where(
      and(
        eq(cohortsTable.programId, programId),
        eq(cohortsTable.active, true),
        inArray(cohortsTable.id, cohortIds),
      ),
    );

  res.json(cohorts);
});

export default router;
