import { Router } from "express";
import { db } from "@workspace/db";
import {
  programsTable,
  cohortsTable,
  startupsTable,
  judgesTable,
  usersTable,
  judgeAssignmentsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAdmin, hashPin } from "../lib/auth";

const router = Router();

function randomPin(digits = 6): string {
  return String(Math.floor(Math.random() * Math.pow(10, digits))).padStart(digits, "0");
}

// --- Programs ---
router.get("/admin/programs", requireAdmin, async (_req, res) => {
  const programs = await db.select().from(programsTable);
  res.json(programs);
});

router.post("/admin/programs", requireAdmin, async (req, res) => {
  const { id, name, description, active } = req.body;
  if (!id || !name) {
    res.status(400).json({ error: "BadRequest", message: "id and name are required" });
    return;
  }
  const [program] = await db
    .insert(programsTable)
    .values({ id, name, description: description ?? null, active: active ?? true })
    .returning();
  res.status(201).json(program);
});

router.put("/admin/programs/:id", requireAdmin, async (req, res) => {
  const {
    name, description, shortDescription, active, phase,
    location, format, applicationDeadline, programStartDate, programEndDate,
    maxApplications, eligibility, benefits, tags, applicationFormConfig,
  } = req.body;
  const setFields: Record<string, unknown> = { name, description, active, updatedAt: new Date() };
  if (shortDescription !== undefined) setFields.shortDescription = shortDescription;
  if (phase !== undefined) setFields.phase = phase;
  if (location !== undefined) setFields.location = location;
  if (format !== undefined) setFields.format = format;
  if (applicationDeadline !== undefined) setFields.applicationDeadline = applicationDeadline ? new Date(applicationDeadline) : null;
  if (programStartDate !== undefined) setFields.programStartDate = programStartDate ? new Date(programStartDate) : null;
  if (programEndDate !== undefined) setFields.programEndDate = programEndDate ? new Date(programEndDate) : null;
  if (maxApplications !== undefined) setFields.maxApplications = maxApplications ? Number(maxApplications) : null;
  if (eligibility !== undefined) setFields.eligibility = eligibility;
  if (benefits !== undefined) setFields.benefits = benefits;
  if (tags !== undefined) setFields.tags = tags;
  if (applicationFormConfig !== undefined) setFields.applicationFormConfig = applicationFormConfig;

  const [program] = await db
    .update(programsTable)
    .set(setFields as any)
    .where(eq(programsTable.id, String(req.params.id)))
    .returning();
  if (!program) {
    res.status(404).json({ error: "NotFound", message: "Program not found" });
    return;
  }
  res.json(program);
});

// --- Programs delete ---
router.delete("/admin/programs/:id", requireAdmin, async (req, res) => {
  await db.delete(programsTable).where(eq(programsTable.id, String(req.params.id)));
  res.json({ success: true });
});

// --- Cohorts ---
router.get("/admin/cohorts", requireAdmin, async (req, res) => {
  const { programId } = req.query as { programId?: string };
  const cohorts = programId
    ? await db.select().from(cohortsTable).where(eq(cohortsTable.programId, programId))
    : await db.select().from(cohortsTable);
  res.json(cohorts);
});

router.post("/admin/cohorts", requireAdmin, async (req, res) => {
  const { id, programId, name, year, active } = req.body;
  if (!id || !programId || !name || !year) {
    res.status(400).json({ error: "BadRequest", message: "id, programId, name, year are required" });
    return;
  }
  const [cohort] = await db
    .insert(cohortsTable)
    .values({ id, programId, name, year: Number(year), active: active ?? true })
    .returning();
  res.status(201).json(cohort);
});

router.put("/admin/cohorts/:id", requireAdmin, async (req, res) => {
  const { name, year, active } = req.body;
  const [cohort] = await db
    .update(cohortsTable)
    .set({ name, year: year !== undefined ? Number(year) : undefined, active })
    .where(eq(cohortsTable.id, String(req.params.id)))
    .returning();
  if (!cohort) {
    res.status(404).json({ error: "NotFound", message: "Cohort not found" });
    return;
  }
  res.json(cohort);
});

router.delete("/admin/cohorts/:id", requireAdmin, async (req, res) => {
  await db.delete(cohortsTable).where(eq(cohortsTable.id, String(req.params.id)));
  res.json({ success: true });
});

// --- Startups ---
router.get("/admin/startups", requireAdmin, async (req, res) => {
  const { programId, cohortId } = req.query as { programId?: string; cohortId?: string };
  let query = db.select().from(startupsTable);
  const conditions = [];
  if (programId) conditions.push(eq(startupsTable.programId, programId));
  if (cohortId) conditions.push(eq(startupsTable.cohortId, cohortId));
  const startups =
    conditions.length > 0
      ? await db.select().from(startupsTable).where(and(...conditions))
      : await db.select().from(startupsTable);
  res.json(startups);
});

router.post("/admin/startups", requireAdmin, async (req, res) => {
  const { programId, cohortId, name, sector, stage, location, website, email, notes } = req.body;
  if (!programId || !cohortId || !name) {
    res.status(400).json({ error: "BadRequest", message: "programId, cohortId, name are required" });
    return;
  }
  const [startup] = await db
    .insert(startupsTable)
    .values({ programId, cohortId, name, sector, stage, location, website, email, notes })
    .returning();
  res.status(201).json(startup);
});

router.put("/admin/startups/:id", requireAdmin, async (req, res) => {
  const { name, sector, stage, location, website, email, notes, active } = req.body;
  const [startup] = await db
    .update(startupsTable)
    .set({ name, sector, stage, location, website, email, notes, active })
    .where(eq(startupsTable.id, Number(String(req.params.id))))
    .returning();
  if (!startup) {
    res.status(404).json({ error: "NotFound", message: "Startup not found" });
    return;
  }
  res.json(startup);
});

router.delete("/admin/startups/:id", requireAdmin, async (req, res) => {
  await db.delete(startupsTable).where(eq(startupsTable.id, Number(String(req.params.id))));
  res.json({ success: true });
});

// --- Judges ---
router.get("/admin/judges", requireAdmin, async (_req, res) => {
  const rows = await db
    .select({
      id: judgesTable.id,
      name: judgesTable.name,
      email: judgesTable.email,
      title: judgesTable.title,
      active: judgesTable.active,
      userId: usersTable.id,
    })
    .from(judgesTable)
    .leftJoin(usersTable, eq(usersTable.judgeId, judgesTable.id));
  res.json(rows);
});

router.post("/admin/judges", requireAdmin, async (req, res) => {
  const { name, email, title, pin } = req.body;
  if (!name || !email || !pin) {
    res.status(400).json({ error: "BadRequest", message: "name, email, pin are required" });
    return;
  }

  const pinHash = await hashPin(String(pin));

  const [judge] = await db
    .insert(judgesTable)
    .values({ name, email, title: title ?? null })
    .returning();

  const [user] = await db
    .insert(usersTable)
    .values({
      email: email.toLowerCase(),
      name,
      role: "Judge",
      judgeId: judge.id,
      pinHash,
    })
    .returning();

  res.status(201).json({ judge, userId: user.id });
});

router.put("/admin/judges/:id", requireAdmin, async (req, res) => {
  const judgeId = Number(String(req.params.id));
  const { name, email, title, active } = req.body;
  const [judge] = await db
    .update(judgesTable)
    .set({ name, email, title, active })
    .where(eq(judgesTable.id, judgeId))
    .returning();
  if (!judge) {
    res.status(404).json({ error: "NotFound", message: "Judge not found" });
    return;
  }
  if (email) {
    await db
      .update(usersTable)
      .set({ email: email.toLowerCase(), name: name ?? judge.name })
      .where(eq(usersTable.judgeId, judgeId));
  }
  res.json(judge);
});

router.delete("/admin/judges/:id", requireAdmin, async (req, res) => {
  const judgeId = Number(String(req.params.id));
  await db.delete(usersTable).where(eq(usersTable.judgeId, judgeId));
  await db.delete(judgesTable).where(eq(judgesTable.id, judgeId));
  res.json({ success: true });
});

router.post("/admin/judges/:id/reset-pin", requireAdmin, async (req, res) => {
  const judgeId = Number(String(req.params.id));
  const pin = req.body?.pin ? String(req.body.pin) : randomPin(6);
  const pinHash = await hashPin(pin);

  const [user] = await db
    .update(usersTable)
    .set({ pinHash })
    .where(eq(usersTable.judgeId, judgeId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "NotFound", message: "User not found for this judge" });
    return;
  }

  res.json({ pin, userId: user.id });
});

// --- Assignments ---
router.get("/admin/assignments", requireAdmin, async (_req, res) => {
  const rows = await db
    .select({
      id: judgeAssignmentsTable.id,
      programId: judgeAssignmentsTable.programId,
      cohortId: judgeAssignmentsTable.cohortId,
      judgeId: judgeAssignmentsTable.judgeId,
      active: judgeAssignmentsTable.active,
      judgeName: judgesTable.name,
      programName: programsTable.name,
      cohortName: cohortsTable.name,
    })
    .from(judgeAssignmentsTable)
    .leftJoin(judgesTable, eq(judgesTable.id, judgeAssignmentsTable.judgeId))
    .leftJoin(programsTable, eq(programsTable.id, judgeAssignmentsTable.programId))
    .leftJoin(cohortsTable, eq(cohortsTable.id, judgeAssignmentsTable.cohortId));
  res.json(rows);
});

router.post("/admin/assignments", requireAdmin, async (req, res) => {
  const { programId, cohortId, judgeId } = req.body;
  if (!programId || !cohortId || !judgeId) {
    res.status(400).json({ error: "BadRequest", message: "programId, cohortId, judgeId required" });
    return;
  }
  const [assignment] = await db
    .insert(judgeAssignmentsTable)
    .values({ programId, cohortId, judgeId: Number(judgeId) })
    .returning();
  res.status(201).json({
    ...assignment,
    judgeName: null,
    programName: null,
    cohortName: null,
  });
});

router.delete("/admin/assignments/:id", requireAdmin, async (req, res) => {
  await db.delete(judgeAssignmentsTable).where(eq(judgeAssignmentsTable.id, Number(String(req.params.id))));
  res.json({ success: true });
});

export default router;
