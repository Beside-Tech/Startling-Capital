/**
 * Admin Curriculum routes:
 * - GET    /api/admin/courses                           — list all courses in library
 * - POST   /api/admin/courses                           — create a course
 * - PUT    /api/admin/courses/:id                       — update a course
 * - DELETE /api/admin/courses/:id                       — delete a course
 * - GET    /api/admin/program-courses                   — list cohort assignments (optionally ?cohortId=)
 * - POST   /api/admin/program-courses                   — assign a course to a cohort
 * - DELETE /api/admin/program-courses/:id               — remove a cohort assignment
 * - GET    /api/admin/program-courses/progress          — per-cohort completion stats (?cohortId=)
 * - GET    /api/admin/founder-course-assignments        — list individual founder assignments (?founderId=)
 * - POST   /api/admin/founder-course-assignments        — assign a course to an individual founder
 * - DELETE /api/admin/founder-course-assignments/:id   — remove individual founder assignment
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  coursesTable,
  programCoursesTable,
  founderCourseProgressTable,
  founderCourseAssignmentsTable,
  foundersTable,
  cohortsTable,
  usersTable,
  applicationsTable,
} from "@workspace/db";
import { eq, and, desc, count, inArray, ne } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = Router();

// ─── Course Library ────────────────────────────────────────────────────────────

router.get("/admin/courses", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const courses = await db
      .select()
      .from(coursesTable)
      .orderBy(desc(coursesTable.createdAt));
    res.json(courses);
  } catch {
    res.status(500).json({ error: "Failed to load courses" });
  }
});

router.post("/admin/courses", requireAuth, requireAdmin, async (req, res) => {
  const userId = req.user?.userId;
  const { title, description, type, durationMins, url, fileUrl } = req.body as {
    title: string;
    description?: string;
    type: "video" | "workshop" | "reading" | "live_session";
    durationMins?: number;
    url?: string;
    fileUrl?: string;
  };

  if (!title?.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  if (!["video", "workshop", "reading", "live_session"].includes(type)) {
    return res.status(400).json({ error: "Invalid course type" });
  }

  try {
    const [course] = await db
      .insert(coursesTable)
      .values({
        title: title.trim(),
        description: description?.trim() ?? null,
        type,
        durationMins: durationMins ?? null,
        url: url?.trim() ?? null,
        fileUrl: fileUrl?.trim() ?? null,
        active: true,
        createdBy: userId ?? null,
      })
      .returning();
    res.status(201).json(course);
  } catch {
    res.status(500).json({ error: "Failed to create course" });
  }
});

router.put("/admin/courses/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid course id" });
  const { title, description, type, durationMins, url, fileUrl, active } = req.body as {
    title?: string;
    description?: string;
    type?: "video" | "workshop" | "reading" | "live_session";
    durationMins?: number;
    url?: string;
    fileUrl?: string;
    active?: boolean;
  };

  const updates: Partial<typeof coursesTable.$inferInsert> = { updatedAt: new Date() };
  if (title?.trim()) updates.title = title.trim();
  if (description !== undefined) updates.description = description?.trim() ?? null;
  if (type) updates.type = type;
  if (durationMins !== undefined) updates.durationMins = durationMins ?? null;
  if (url !== undefined) updates.url = url?.trim() ?? null;
  if (fileUrl !== undefined) updates.fileUrl = fileUrl?.trim() ?? null;
  if (typeof active === "boolean") updates.active = active;

  try {
    const [course] = await db
      .update(coursesTable)
      .set(updates)
      .where(eq(coursesTable.id, id))
      .returning();
    if (!course) return res.status(404).json({ error: "Course not found" });
    res.json(course);
  } catch {
    res.status(500).json({ error: "Failed to update course" });
  }
});

router.delete("/admin/courses/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid course id" });
  try {
    await db.delete(programCoursesTable).where(eq(programCoursesTable.courseId, id));
    await db.delete(founderCourseProgressTable).where(eq(founderCourseProgressTable.courseId, id));
    await db.delete(coursesTable).where(eq(coursesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete course" });
  }
});

// ─── Cohort Assignments ────────────────────────────────────────────────────────

router.get("/admin/program-courses", requireAuth, requireAdmin, async (req, res) => {
  const { cohortId } = req.query as { cohortId?: string };
  try {
    const query = db
      .select({
        id: programCoursesTable.id,
        programId: programCoursesTable.programId,
        cohortId: programCoursesTable.cohortId,
        courseId: programCoursesTable.courseId,
        displayOrder: programCoursesTable.displayOrder,
        required: programCoursesTable.required,
        createdAt: programCoursesTable.createdAt,
        courseTitle: coursesTable.title,
        courseType: coursesTable.type,
        courseDurationMins: coursesTable.durationMins,
        courseUrl: coursesTable.url,
        courseActive: coursesTable.active,
        cohortName: cohortsTable.name,
      })
      .from(programCoursesTable)
      .leftJoin(coursesTable, eq(coursesTable.id, programCoursesTable.courseId))
      .leftJoin(cohortsTable, eq(cohortsTable.id, programCoursesTable.cohortId));

    const results = cohortId
      ? await query.where(eq(programCoursesTable.cohortId, cohortId)).orderBy(programCoursesTable.displayOrder)
      : await query.orderBy(programCoursesTable.cohortId, programCoursesTable.displayOrder);

    res.json(results);
  } catch {
    res.status(500).json({ error: "Failed to load cohort assignments" });
  }
});

router.post("/admin/program-courses", requireAuth, requireAdmin, async (req, res) => {
  const { programId, cohortId, courseId, displayOrder, required } = req.body as {
    programId: string;
    cohortId: string;
    courseId: number;
    displayOrder?: number;
    required?: boolean;
  };

  if (!programId || !cohortId || !courseId) {
    return res.status(400).json({ error: "programId, cohortId, and courseId are required" });
  }

  try {
    const [existing] = await db
      .select({ id: programCoursesTable.id })
      .from(programCoursesTable)
      .where(
        and(
          eq(programCoursesTable.cohortId, cohortId),
          eq(programCoursesTable.courseId, courseId)
        )
      );

    if (existing) {
      return res.status(409).json({ error: "Course already assigned to this cohort" });
    }

    const [pc] = await db
      .insert(programCoursesTable)
      .values({
        programId,
        cohortId,
        courseId,
        displayOrder: displayOrder ?? 0,
        required: required ?? false,
      })
      .returning();
    res.status(201).json(pc);
  } catch {
    res.status(500).json({ error: "Failed to assign course" });
  }
});

router.delete("/admin/program-courses/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid assignment id" });
  try {
    await db.delete(programCoursesTable).where(eq(programCoursesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to remove course assignment" });
  }
});

// ─── Cohort Progress Summary ───────────────────────────────────────────────────

router.get("/admin/program-courses/progress", requireAuth, requireAdmin, async (req, res) => {
  const { cohortId } = req.query as { cohortId?: string };

  if (!cohortId) {
    return res.status(400).json({ error: "cohortId is required" });
  }

  try {
    // Get all courses assigned to this cohort
    const assignments = await db
      .select({
        id: programCoursesTable.id,
        courseId: programCoursesTable.courseId,
        displayOrder: programCoursesTable.displayOrder,
        required: programCoursesTable.required,
        courseTitle: coursesTable.title,
        courseType: coursesTable.type,
        courseDurationMins: coursesTable.durationMins,
      })
      .from(programCoursesTable)
      .leftJoin(coursesTable, eq(coursesTable.id, programCoursesTable.courseId))
      .where(eq(programCoursesTable.cohortId, cohortId))
      .orderBy(programCoursesTable.displayOrder);

    // Count founders enrolled in this cohort via submitted (non-draft, non-rejected, non-withdrawn) applications
    const cohortApplications = await db
      .select({ founderId: applicationsTable.founderId })
      .from(applicationsTable)
      .where(
        and(
          eq(applicationsTable.cohortId, cohortId),
          ne(applicationsTable.status, "draft"),
          ne(applicationsTable.status, "rejected"),
          ne(applicationsTable.status, "withdrawn")
        )
      );

    const cohortFounderIds = [...new Set(
      cohortApplications.map((a) => a.founderId).filter((id): id is number => id !== null)
    )];
    const totalFounders = cohortFounderIds.length;

    const courseIds = assignments.map((a) => a.courseId).filter((id): id is number => id !== null);

    // Get completion counts scoped to founders in this cohort and courses assigned to this cohort
    const progressCounts =
      cohortFounderIds.length > 0 && courseIds.length > 0
        ? await db
            .select({
              courseId: founderCourseProgressTable.courseId,
              status: founderCourseProgressTable.status,
              cnt: count(),
            })
            .from(founderCourseProgressTable)
            .where(
              and(
                inArray(founderCourseProgressTable.founderId, cohortFounderIds),
                inArray(founderCourseProgressTable.courseId, courseIds)
              )
            )
            .groupBy(founderCourseProgressTable.courseId, founderCourseProgressTable.status)
        : [];

    const progressMap: Record<number, Record<string, number>> = {};
    progressCounts.forEach(({ courseId, status, cnt }) => {
      if (!progressMap[courseId]) progressMap[courseId] = {};
      progressMap[courseId][status] = Number(cnt);
    });

    const result = assignments.map((a) => {
      const stats = progressMap[a.courseId!] ?? {};
      const complete = stats["complete"] ?? 0;
      const inProgress = stats["in_progress"] ?? 0;
      const notStarted = totalFounders - complete - inProgress;
      return {
        ...a,
        totalFounders,
        complete,
        inProgress,
        notStarted: Math.max(0, notStarted),
        completionPct: totalFounders > 0 ? Math.round((complete / totalFounders) * 100) : 0,
      };
    });

    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to load progress data" });
  }
});

// ─── Individual Founder Assignments ──────────────────────────────────────────

router.get("/admin/founder-course-assignments", requireAuth, requireAdmin, async (req, res) => {
  const { founderId } = req.query as { founderId?: string };
  try {
    const query = db
      .select({
        id: founderCourseAssignmentsTable.id,
        founderId: founderCourseAssignmentsTable.founderId,
        courseId: founderCourseAssignmentsTable.courseId,
        required: founderCourseAssignmentsTable.required,
        createdAt: founderCourseAssignmentsTable.createdAt,
        courseTitle: coursesTable.title,
        courseType: coursesTable.type,
        courseDurationMins: coursesTable.durationMins,
        courseActive: coursesTable.active,
        founderName: usersTable.name,
        founderEmail: usersTable.email,
      })
      .from(founderCourseAssignmentsTable)
      .leftJoin(coursesTable, eq(coursesTable.id, founderCourseAssignmentsTable.courseId))
      .leftJoin(foundersTable, eq(foundersTable.id, founderCourseAssignmentsTable.founderId))
      .leftJoin(usersTable, eq(usersTable.id, foundersTable.userId));

    const results = founderId
      ? await query.where(eq(founderCourseAssignmentsTable.founderId, parseInt(founderId))).orderBy(desc(founderCourseAssignmentsTable.createdAt))
      : await query.orderBy(desc(founderCourseAssignmentsTable.createdAt));

    res.json(results);
  } catch {
    res.status(500).json({ error: "Failed to load founder course assignments" });
  }
});

router.post("/admin/founder-course-assignments", requireAuth, requireAdmin, async (req, res) => {
  const adminUserId = req.user?.userId;
  const { founderId, courseId, required } = req.body as {
    founderId: number;
    courseId: number;
    required?: boolean;
  };

  if (!founderId || !courseId) {
    return res.status(400).json({ error: "founderId and courseId are required" });
  }

  try {
    const [existing] = await db
      .select({ id: founderCourseAssignmentsTable.id })
      .from(founderCourseAssignmentsTable)
      .where(
        and(
          eq(founderCourseAssignmentsTable.founderId, founderId),
          eq(founderCourseAssignmentsTable.courseId, courseId)
        )
      );

    if (existing) {
      return res.status(409).json({ error: "Course already individually assigned to this founder" });
    }

    const [assignment] = await db
      .insert(founderCourseAssignmentsTable)
      .values({
        founderId,
        courseId,
        required: required ?? false,
        assignedBy: adminUserId ?? null,
      })
      .returning();

    res.status(201).json(assignment);
  } catch {
    res.status(500).json({ error: "Failed to create founder course assignment" });
  }
});

router.delete("/admin/founder-course-assignments/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) return res.status(400).json({ error: "Invalid assignment id" });
  try {
    await db.delete(founderCourseAssignmentsTable).where(eq(founderCourseAssignmentsTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to remove founder course assignment" });
  }
});

export default router;
