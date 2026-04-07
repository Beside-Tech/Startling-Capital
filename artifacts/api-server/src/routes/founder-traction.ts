/**
 * Founder Traction routes:
 * - POST /api/founder/traction          — submit/upsert a monthly check-in
 * - GET  /api/founder/traction          — get my traction history (all periods)
 * - GET  /api/founder/traction/latest   — get my most recent submission
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { tractionMetricsTable, foundersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

async function getFounderId(userId: number): Promise<number | null> {
  const [f] = await db
    .select({ id: foundersTable.id })
    .from(foundersTable)
    .where(eq(foundersTable.userId, userId));
  return f?.id ?? null;
}

// GET /api/founder/traction/latest
router.get("/founder/traction/latest", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const founderId = await getFounderId(userId);
    if (!founderId) return res.status(404).json({ error: "Founder profile not found" });

    const [latest] = await db
      .select()
      .from(tractionMetricsTable)
      .where(eq(tractionMetricsTable.founderId, founderId))
      .orderBy(desc(tractionMetricsTable.periodYear), desc(tractionMetricsTable.periodMonth))
      .limit(1);

    res.json(latest ?? null);
  } catch {
    res.status(500).json({ error: "Failed to load latest traction" });
  }
});

// GET /api/founder/traction
router.get("/founder/traction", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const founderId = await getFounderId(userId);
    if (!founderId) return res.status(404).json({ error: "Founder profile not found" });

    const metrics = await db
      .select()
      .from(tractionMetricsTable)
      .where(eq(tractionMetricsTable.founderId, founderId))
      .orderBy(tractionMetricsTable.periodYear, tractionMetricsTable.periodMonth);

    res.json(metrics);
  } catch {
    res.status(500).json({ error: "Failed to load traction history" });
  }
});

// POST /api/founder/traction — upsert for a given period
router.post("/founder/traction", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { periodMonth, periodYear, revenue, activeUsers, burnRate, headcount, notes, programId } =
    req.body as {
      periodMonth: number;
      periodYear: number;
      revenue?: string;
      activeUsers?: number;
      burnRate?: string;
      headcount?: number;
      notes?: string;
      programId?: string;
    };

  if (!periodMonth || !periodYear) {
    return res.status(400).json({ error: "periodMonth and periodYear are required" });
  }
  if (periodMonth < 1 || periodMonth > 12) {
    return res.status(400).json({ error: "periodMonth must be 1-12" });
  }
  if (periodYear < 2000 || periodYear > 2100) {
    return res.status(400).json({ error: "Invalid periodYear" });
  }

  try {
    const founderId = await getFounderId(userId);
    if (!founderId) return res.status(404).json({ error: "Founder profile not found" });

    const values = {
      founderId,
      programId: programId ?? null,
      periodMonth,
      periodYear,
      revenue: revenue ?? null,
      activeUsers: activeUsers ?? null,
      burnRate: burnRate ?? null,
      headcount: headcount ?? null,
      notes: notes?.trim() ?? null,
      submittedAt: new Date(),
      updatedAt: new Date(),
    };

    const [result] = await db
      .insert(tractionMetricsTable)
      .values(values)
      .onConflictDoUpdate({
        target: [
          tractionMetricsTable.founderId,
          tractionMetricsTable.periodMonth,
          tractionMetricsTable.periodYear,
        ],
        set: {
          programId: values.programId,
          revenue: values.revenue,
          activeUsers: values.activeUsers,
          burnRate: values.burnRate,
          headcount: values.headcount,
          notes: values.notes,
          submittedAt: values.submittedAt,
          updatedAt: values.updatedAt,
        },
      })
      .returning();

    res.status(201).json(result);
  } catch {
    res.status(500).json({ error: "Failed to save traction check-in" });
  }
});

export default router;
