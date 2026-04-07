import { Router } from "express";
import { db } from "@workspace/db";
import {
  scoresTable,
  startupsTable,
  judgesTable,
  advancementRulesTable,
} from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router = Router();

function calcWeightedPct(
  scores: Array<{ score: number; weight: number; maxScore?: number }>,
): number {
  const total = scores.reduce((s, r) => s + r.score * r.weight, 0);
  const max = scores.reduce((s, r) => s + (r.maxScore ?? 5) * r.weight, 0);
  if (max === 0) return 0;
  return (total / max) * 100;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

router.get("/committee/analytics", requireAdmin, async (req, res) => {
  const { programId, cohortId, round } = req.query as {
    programId?: string;
    cohortId?: string;
    round?: string;
  };

  if (!programId || !cohortId || !round) {
    res
      .status(400)
      .json({ error: "BadRequest", message: "programId, cohortId, and round are required" });
    return;
  }

  const [rawScores, startups, judges] = await Promise.all([
    db
      .select()
      .from(scoresTable)
      .where(
        and(
          eq(scoresTable.programId, programId),
          eq(scoresTable.cohortId, cohortId),
          eq(scoresTable.roundName, round),
        ),
      ),
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
    db.select().from(judgesTable).where(eq(judgesTable.active, true)),
  ]);

  // --- Rankings ---
  // Group scores by startup then by judge
  const startupMap = new Map(startups.map((s) => [s.id, s]));
  const judgeMap = new Map(judges.map((j) => [j.id, j]));

  // startupId -> judgeId -> scores[]
  const grouped: Map<number, Map<number, typeof rawScores>> = new Map();
  for (const row of rawScores) {
    if (!grouped.has(row.startupId)) grouped.set(row.startupId, new Map());
    const jMap = grouped.get(row.startupId)!;
    if (!jMap.has(row.judgeId)) jMap.set(row.judgeId, []);
    jMap.get(row.judgeId)!.push(row);
  }

  const rankings = startups.map((startup) => {
    const judgeScores = grouped.get(startup.id);
    if (!judgeScores || judgeScores.size === 0) {
      return {
        startupId: startup.id,
        startupName: startup.name,
        avgPct: 0,
        sdPct: 0,
        judgeCount: 0,
      };
    }
    const pcts: number[] = [];
    for (const [, scores] of judgeScores) {
      pcts.push(calcWeightedPct(scores));
    }
    const avgPct = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    return {
      startupId: startup.id,
      startupName: startup.name,
      avgPct: Math.round(avgPct * 10) / 10,
      sdPct: Math.round(stdDev(pcts) * 10) / 10,
      judgeCount: pcts.length,
    };
  });

  rankings.sort((a, b) => b.avgPct - a.avgPct);

  // --- Judge Analytics ---
  // judgeId -> startup pcts
  const judgePcts: Map<number, number[]> = new Map();
  for (const [startupId, judgeScoreMap] of grouped) {
    for (const [judgeId, scores] of judgeScoreMap) {
      if (!judgePcts.has(judgeId)) judgePcts.set(judgeId, []);
      judgePcts.get(judgeId)!.push(calcWeightedPct(scores));
    }
  }

  const overallMean =
    rankings.filter((r) => r.judgeCount > 0).reduce((s, r) => s + r.avgPct, 0) /
    (rankings.filter((r) => r.judgeCount > 0).length || 1);

  const judgeAnalytics = [...judgePcts.entries()].map(([judgeId, pcts]) => {
    const meanPct = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const judge = judgeMap.get(judgeId);
    return {
      judgeId,
      judgeName: judge?.name ?? `Judge ${judgeId}`,
      meanPct: Math.round(meanPct * 10) / 10,
      sdPct: Math.round(stdDev(pcts) * 10) / 10,
      bias: Math.round((meanPct - overallMean) * 10) / 10,
      startupsScored: pcts.length,
    };
  });

  // --- Matrix ---
  const matrix = startups.map((startup) => {
    const judgeScoreMap = grouped.get(startup.id) ?? new Map();
    const judgeScores: Record<string, number> = {};
    for (const [judgeId, scores] of judgeScoreMap) {
      judgeScores[String(judgeId)] = Math.round(calcWeightedPct(scores) * 10) / 10;
    }
    return {
      startupId: startup.id,
      startupName: startup.name,
      judgeScores,
    };
  });

  res.json({
    rankings,
    judgeAnalytics,
    matrix,
    judges: [...new Set(rawScores.map((s) => s.judgeId))]
      .map((id) => judgeMap.get(id))
      .filter(Boolean),
  });
});

router.get("/committee/advance-preview", requireAdmin, async (req, res) => {
  const { programId, cohortId, fromRound, toRound } = req.query as {
    programId?: string;
    cohortId?: string;
    fromRound?: string;
    toRound?: string;
  };

  if (!programId || !cohortId || !fromRound) {
    res.status(400).json({
      error: "BadRequest",
      message: "programId, cohortId, and fromRound are required",
    });
    return;
  }

  // Find applicable advancement rule
  const rules = await db
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
        eq(advancementRulesTable.fromRound, fromRound),
        eq(advancementRulesTable.active, true),
      ),
    );

  // Prefer exact match over "ALL"
  let rule = rules.find(
    (r) => r.programId === programId && r.cohortId === cohortId,
  );
  if (!rule) rule = rules.find((r) => r.programId === programId);
  if (!rule) rule = rules[0];

  const thresholdPct = rule?.thresholdPct ?? 70;
  const minJudges = rule?.minJudges ?? 1;

  const [rawScores, startups] = await Promise.all([
    db
      .select()
      .from(scoresTable)
      .where(
        and(
          eq(scoresTable.programId, programId),
          eq(scoresTable.cohortId, cohortId),
          eq(scoresTable.roundName, fromRound),
        ),
      ),
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
  ]);

  // Group: startupId -> judgeId -> scores
  const grouped: Map<number, Map<number, typeof rawScores>> = new Map();
  for (const row of rawScores) {
    if (!grouped.has(row.startupId)) grouped.set(row.startupId, new Map());
    const jMap = grouped.get(row.startupId)!;
    if (!jMap.has(row.judgeId)) jMap.set(row.judgeId, []);
    jMap.get(row.judgeId)!.push(row);
  }

  const preview = startups.map((startup) => {
    const judgeScoreMap = grouped.get(startup.id) ?? new Map();
    const pcts: number[] = [];
    for (const [, scores] of judgeScoreMap) {
      pcts.push(calcWeightedPct(scores));
    }
    const avgPct = pcts.length > 0 ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
    const judgeCount = pcts.length;
    const decision: "advance" | "hold" =
      judgeCount >= minJudges && avgPct >= thresholdPct ? "advance" : "hold";

    return {
      startupId: startup.id,
      startupName: startup.name,
      avgPct: Math.round(avgPct * 10) / 10,
      judgeCount,
      decision,
      thresholdPct,
      minJudges,
    };
  });

  preview.sort((a, b) => b.avgPct - a.avgPct);
  res.json(preview);
});

export default router;
