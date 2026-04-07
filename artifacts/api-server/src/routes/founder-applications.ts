/**
 * Founder Application routes:
 * - GET  /api/founder/applications         — get my applications
 * - POST /api/founder/applications         — submit/create an application
 * - GET  /api/founder/programs             — get active programs (for browsing)
 * - GET  /api/founder/programs/:id/form    — get a program's application form config
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  applicationsTable,
  foundersTable,
  programsTable,
  cohortsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

async function getFounderId(userId: number): Promise<number | null> {
  const [f] = await db.select({ id: foundersTable.id }).from(foundersTable).where(eq(foundersTable.userId, userId));
  return f?.id ?? null;
}

// GET /api/founder/cohorts — get cohorts for a given program (or all active)
router.get("/founder/cohorts", requireAuth, async (req, res) => {
  const { programId } = req.query as { programId?: string };
  try {
    const allCohorts = programId
      ? await db.select().from(cohortsTable).where(and(eq(cohortsTable.programId, programId), eq(cohortsTable.active, true)))
      : await db.select().from(cohortsTable).where(eq(cohortsTable.active, true));
    res.json(allCohorts);
  } catch {
    res.status(500).json({ error: "Failed to load cohorts" });
  }
});

// GET /api/founder/programs — list active/open programs for founders
router.get("/founder/programs", requireAuth, async (_req, res) => {
  try {
    const programs = await db
      .select()
      .from(programsTable)
      .where(eq(programsTable.active, true))
      .orderBy(programsTable.createdAt);
    res.json(programs);
  } catch {
    res.status(500).json({ error: "Failed to load programs" });
  }
});

// GET /api/founder/programs/:id/form — get program form config
router.get("/founder/programs/:id/form", requireAuth, async (req, res) => {
  try {
    const [program] = await db
      .select({
        id: programsTable.id,
        name: programsTable.name,
        shortDescription: programsTable.shortDescription,
        description: programsTable.description,
        applicationFormConfig: programsTable.applicationFormConfig,
        applicationDeadline: programsTable.applicationDeadline,
        eligibility: programsTable.eligibility,
        benefits: programsTable.benefits,
        phase: programsTable.phase,
        format: programsTable.format,
        location: programsTable.location,
        tags: programsTable.tags,
      })
      .from(programsTable)
      .where(eq(programsTable.id, String(req.params.id)));
    if (!program) return res.status(404).json({ error: "Program not found" });
    res.json(program);
  } catch {
    res.status(500).json({ error: "Failed to load program" });
  }
});

// GET /api/founder/applications — get my applications
router.get("/founder/applications", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const founderId = await getFounderId(userId);
    if (!founderId) return res.status(404).json({ error: "Founder profile not found" });

    const apps = await db
      .select({
        id: applicationsTable.id,
        programId: applicationsTable.programId,
        cohortId: applicationsTable.cohortId,
        status: applicationsTable.status,
        answers: applicationsTable.answers,
        submittedAt: applicationsTable.submittedAt,
        reviewNotes: applicationsTable.reviewNotes,
        createdAt: applicationsTable.createdAt,
        programName: programsTable.name,
        cohortName: cohortsTable.name,
        cohortYear: cohortsTable.year,
      })
      .from(applicationsTable)
      .leftJoin(programsTable, eq(programsTable.id, applicationsTable.programId))
      .leftJoin(cohortsTable, eq(cohortsTable.id, applicationsTable.cohortId))
      .where(eq(applicationsTable.founderId, founderId))
      .orderBy(desc(applicationsTable.createdAt));

    res.json(apps);
  } catch {
    res.status(500).json({ error: "Failed to load applications" });
  }
});

// POST /api/founder/applications — create/submit application
router.post("/founder/applications", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { programId, cohortId, answers, status } = req.body as {
    programId: string;
    cohortId: string;
    answers?: Record<string, unknown>;
    status?: "draft" | "submitted";
  };

  if (!programId || !cohortId) {
    return res.status(400).json({ error: "programId and cohortId are required" });
  }

  try {
    const founderId = await getFounderId(userId);
    if (!founderId) return res.status(404).json({ error: "Founder profile not found" });

    // Server-side validation: program must exist, be active, and in pre_event phase
    const [program] = await db
      .select({ id: programsTable.id, active: programsTable.active, phase: programsTable.phase })
      .from(programsTable)
      .where(eq(programsTable.id, programId));
    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }
    if (!program.active) {
      return res.status(400).json({ error: "This program is not currently accepting applications" });
    }
    if (program.phase !== "pre_event") {
      return res.status(400).json({ error: "Applications are only accepted during the pre-event phase" });
    }

    // Server-side validation: cohort must exist, be active, and belong to the program
    const [cohort] = await db
      .select({ id: cohortsTable.id, active: cohortsTable.active, programId: cohortsTable.programId })
      .from(cohortsTable)
      .where(eq(cohortsTable.id, cohortId));
    if (!cohort) {
      return res.status(404).json({ error: "Cohort not found" });
    }
    if (!cohort.active) {
      return res.status(400).json({ error: "Selected cohort is not active" });
    }
    if (cohort.programId !== programId) {
      return res.status(400).json({ error: "Cohort does not belong to the specified program" });
    }

    // Check if already applied to this program+cohort
    const [existing] = await db
      .select({ id: applicationsTable.id })
      .from(applicationsTable)
      .where(
        and(
          eq(applicationsTable.founderId, founderId),
          eq(applicationsTable.programId, programId),
          eq(applicationsTable.cohortId, cohortId)
        )
      );

    if (existing) {
      // Update existing draft
      const submitting = status === "submitted";
      const [updated] = await db
        .update(applicationsTable)
        .set({
          answers: answers ?? null,
          status: submitting ? "submitted" : "draft",
          submittedAt: submitting ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(applicationsTable.id, existing.id))
        .returning();
      return res.json(updated);
    }

    const submitting = status === "submitted";
    const [app] = await db
      .insert(applicationsTable)
      .values({
        programId,
        cohortId,
        founderId,
        status: submitting ? "submitted" : "draft",
        answers: answers ?? null,
        submittedAt: submitting ? new Date() : null,
      })
      .returning();

    res.status(201).json(app);
  } catch (err) {
    console.error("Failed to submit application:", err);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

export default router;
