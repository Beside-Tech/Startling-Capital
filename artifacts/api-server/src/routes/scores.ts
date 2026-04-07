import { Router } from "express";
import { db } from "@workspace/db";
import { scoresTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkJudgeAccess } from "../lib/auth";

const router = Router();

router.post("/scores/submit", requireAuth, async (req, res) => {
  const { rows } = req.body as {
    rows: Array<{
      programId: string;
      cohortId: string;
      roundName: string;
      startupId: number;
      judgeId: number;
      criterionId: string;
      score: number;
      weight: number;
      comment?: string;
    }>;
  };

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "BadRequest", message: "rows array is required" });
    return;
  }

  // Judges can only submit scores for themselves
  if (req.user!.role === "Judge") {
    const judgeId = req.user!.judgeId;
    for (const row of rows) {
      if (row.judgeId !== judgeId) {
        res.status(403).json({ error: "Forbidden", message: "Judges can only submit their own scores" });
        return;
      }
      // Check assignment
      const allowed = await checkJudgeAccess(judgeId!, row.programId, row.cohortId);
      if (!allowed) {
        res.status(403).json({ error: "Forbidden", message: `Access denied to ${row.programId}/${row.cohortId}` });
        return;
      }
    }
  }

  // Validate scores
  for (const row of rows) {
    if (row.score < 0 || row.score > 5) {
      res.status(400).json({ error: "BadRequest", message: "Score must be between 0 and 5" });
      return;
    }
  }

  // Upsert rows
  for (const row of rows) {
    await db
      .insert(scoresTable)
      .values({
        programId: row.programId,
        cohortId: row.cohortId,
        roundName: row.roundName,
        startupId: row.startupId,
        judgeId: row.judgeId,
        criterionId: row.criterionId,
        score: row.score,
        weight: row.weight,
        comment: row.comment ?? null,
        source: "webapp",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          scoresTable.programId,
          scoresTable.cohortId,
          scoresTable.roundName,
          scoresTable.startupId,
          scoresTable.judgeId,
          scoresTable.criterionId,
        ],
        set: {
          score: row.score,
          weight: row.weight,
          comment: row.comment ?? null,
          updatedAt: new Date(),
        },
      });
  }

  res.json({ submitted: rows.length });
});

router.get("/scores", requireAuth, async (req, res) => {
  const { programId, cohortId, round, startupId, judgeId } = req.query as {
    programId?: string;
    cohortId?: string;
    round?: string;
    startupId?: string;
    judgeId?: string;
  };

  if (!programId || !cohortId || !round) {
    res.status(400).json({ error: "BadRequest", message: "programId, cohortId, and round are required" });
    return;
  }

  // Access check for judges
  if (req.user!.role === "Judge") {
    const jId = req.user!.judgeId;
    if (!jId) {
      res.status(403).json({ error: "Forbidden", message: "Access denied" });
      return;
    }
    const allowed = await checkJudgeAccess(jId, programId, cohortId);
    if (!allowed) {
      res.status(403).json({ error: "Forbidden", message: "Access denied" });
      return;
    }
    // Judges can only see their own scores
    if (judgeId && parseInt(judgeId) !== jId) {
      res.status(403).json({ error: "Forbidden", message: "Judges can only view their own scores" });
      return;
    }
  }

  const conditions = [
    eq(scoresTable.programId, programId),
    eq(scoresTable.cohortId, cohortId),
    eq(scoresTable.roundName, round),
  ];

  if (startupId) conditions.push(eq(scoresTable.startupId, parseInt(startupId)));

  // For judges, always filter to their own scores
  if (req.user!.role === "Judge" && req.user!.judgeId) {
    conditions.push(eq(scoresTable.judgeId, req.user!.judgeId));
  } else if (judgeId) {
    conditions.push(eq(scoresTable.judgeId, parseInt(judgeId)));
  }

  const scores = await db
    .select()
    .from(scoresTable)
    .where(and(...conditions));

  res.json(scores);
});

export default router;
