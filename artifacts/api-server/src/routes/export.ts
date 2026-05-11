import { Router } from "express";
import ExcelJS from "exceljs";
import { db } from "@workspace/db";
import {
  scoresTable,
  startupsTable,
  judgesTable,
  advancementRulesTable,
  rubricCriteriaTable,
} from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router = Router();

function calcWeightedPct(scores: Array<{ score: number; weight: number }>): number {
  const total = scores.reduce((s, r) => s + r.score * r.weight, 0);
  const max = scores.reduce((s, r) => s + 5 * r.weight, 0);
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

router.get("/export/excel", requireAdmin, async (req, res) => {
  const { programId, cohortId, round } = req.query as {
    programId?: string;
    cohortId?: string;
    round?: string;
  };

  if (!programId || !cohortId || !round) {
    res.status(400).json({ error: "BadRequest", message: "programId, cohortId, and round are required" });
    return;
  }

  const [rawScores, startups, judges, criteria] = await Promise.all([
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
  ]);

  const startupMap = new Map(startups.map((s) => [s.id, s]));
  const judgeMap = new Map(judges.map((j) => [j.id, j]));
  const criterionMap = new Map(criteria.map((c) => [c.id, c]));

  // Group: startupId -> judgeId -> scores[]
  const grouped: Map<number, Map<number, typeof rawScores>> = new Map();
  for (const row of rawScores) {
    if (!grouped.has(row.startupId)) grouped.set(row.startupId, new Map());
    const jMap = grouped.get(row.startupId)!;
    if (!jMap.has(row.judgeId)) jMap.set(row.judgeId, []);
    jMap.get(row.judgeId)!.push(row);
  }

  // Rankings
  const rankings = startups.map((startup) => {
    const judgeScores = grouped.get(startup.id);
    if (!judgeScores || judgeScores.size === 0) {
      return { startupId: startup.id, startupName: startup.name, avgPct: 0, sdPct: 0, judgeCount: 0, decision: "hold" };
    }
    const pcts: number[] = [];
    for (const [, scores] of judgeScores) pcts.push(calcWeightedPct(scores));
    const avgPct = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    return {
      startupId: startup.id,
      startupName: startup.name,
      avgPct: Math.round(avgPct * 10) / 10,
      sdPct: Math.round(stdDev(pcts) * 10) / 10,
      judgeCount: pcts.length,
      decision: avgPct >= 70 ? "advance" : "hold",
    };
  });
  rankings.sort((a, b) => b.avgPct - a.avgPct);

  // Judge analytics
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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Startling Capital Score Sheet";
  workbook.created = new Date();

  const teal = "FF36A391";
  const white = "FFFFFFFF";
  const darkBg = "FF1A1A2E";
  const headerFont = { color: { argb: white }, bold: true };

  function styleHeader(sheet: ExcelJS.Worksheet, numCols: number) {
    const row = sheet.getRow(1);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber <= numCols) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: teal } };
        cell.font = headerFont;
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });
    row.height = 20;
  }

  // Sheet 1: Rankings
  const rankSheet = workbook.addWorksheet("Rankings");
  rankSheet.columns = [
    { header: "Rank", key: "rank", width: 8 },
    { header: "Startup", key: "startupName", width: 30 },
    { header: "Avg %", key: "avgPct", width: 12 },
    { header: "SD %", key: "sdPct", width: 12 },
    { header: "Judge Count", key: "judgeCount", width: 14 },
    { header: "Decision", key: "decision", width: 12 },
  ];
  styleHeader(rankSheet, 6);
  rankings.forEach((r, i) => {
    const row = rankSheet.addRow({ ...r, rank: i + 1 });
    if (r.decision === "advance") {
      row.getCell("decision").font = { color: { argb: "FF36A391" }, bold: true };
    }
  });

  // Sheet 2: Judge Analytics
  const judgeSheet = workbook.addWorksheet("Judge Analytics");
  judgeSheet.columns = [
    { header: "Judge", key: "judgeName", width: 25 },
    { header: "Mean %", key: "meanPct", width: 12 },
    { header: "SD %", key: "sdPct", width: 12 },
    { header: "Bias vs Overall", key: "bias", width: 18 },
    { header: "Startups Scored", key: "startupsScored", width: 18 },
  ];
  styleHeader(judgeSheet, 5);
  judgeAnalytics.forEach((j) => judgeSheet.addRow(j));

  // Sheet 3: Raw Scores
  const rawSheet = workbook.addWorksheet("Raw Scores");
  rawSheet.columns = [
    { header: "Startup", key: "startupName", width: 25 },
    { header: "Judge", key: "judgeName", width: 20 },
    { header: "Criterion", key: "criterionName", width: 25 },
    { header: "Category", key: "category", width: 18 },
    { header: "Score", key: "score", width: 8 },
    { header: "Weight", key: "weight", width: 8 },
    { header: "Weighted Score", key: "weighted", width: 15 },
    { header: "Comment", key: "comment", width: 40 },
  ];
  styleHeader(rawSheet, 8);
  for (const row of rawScores) {
    const startup = startupMap.get(row.startupId);
    const judge = judgeMap.get(row.judgeId);
    const criterion = criterionMap.get(row.criterionId);
    rawSheet.addRow({
      startupName: startup?.name ?? row.startupId,
      judgeName: judge?.name ?? row.judgeId,
      criterionName: criterion?.name ?? row.criterionId,
      category: criterion?.category ?? "",
      score: row.score,
      weight: row.weight,
      weighted: row.score * row.weight,
      comment: row.comment ?? "",
    });
  }

  // Sheet 4: Matrix
  const matrixSheet = workbook.addWorksheet("Matrix");
  const activeJudges = [...new Set(rawScores.map((r) => r.judgeId))]
    .map((id) => judgeMap.get(id))
    .filter(Boolean) as typeof judges;

  matrixSheet.columns = [
    { header: "Startup", key: "startup", width: 25 },
    ...activeJudges.map((j) => ({ header: j.name, key: `j_${j.id}`, width: 14 })),
    { header: "Avg %", key: "avg", width: 12 },
  ];
  styleHeader(matrixSheet, 1 + activeJudges.length + 1);

  for (const startup of startups) {
    const judgeScoreMap = grouped.get(startup.id) ?? new Map();
    const rowData: Record<string, unknown> = { startup: startup.name };
    const pcts: number[] = [];
    for (const j of activeJudges) {
      const scores = judgeScoreMap.get(j.id);
      if (scores && scores.length > 0) {
        const pct = calcWeightedPct(scores);
        rowData[`j_${j.id}`] = Math.round(pct * 10) / 10;
        pcts.push(pct);
      } else {
        rowData[`j_${j.id}`] = "-";
      }
    }
    rowData.avg = pcts.length > 0 ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10 : 0;
    matrixSheet.addRow(rowData);
  }

  const filename = `Startling Capital-scores-${programId}-${cohortId}-${round}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
});

export default router;

