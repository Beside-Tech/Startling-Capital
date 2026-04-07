/**
 * Founder Courses routes:
 * - GET /api/founder/courses          — get my assigned courses with progress
 * - PUT /api/founder/courses/:id/progress — update status + notes for a course
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  founderCourseProgressTable,
  programCoursesTable,
  founderCourseAssignmentsTable,
  coursesTable,
  foundersTable,
  applicationsTable,
} from "@workspace/db";
import { eq, and, inArray, ne } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

async function getFounderId(userId: number): Promise<number | null> {
  const [f] = await db
    .select({ id: foundersTable.id })
    .from(foundersTable)
    .where(eq(foundersTable.userId, userId));
  return f?.id ?? null;
}

// GET /api/founder/courses — get my assigned courses with progress
// Includes: cohort-level assignments (from submitted/active applications) + individual admin assignments
router.get("/founder/courses", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const founderId = await getFounderId(userId);
    if (!founderId) return res.status(404).json({ error: "Founder profile not found" });

    // Get cohorts this founder has a non-draft, non-rejected, non-withdrawn application to
    const myApps = await db
      .select({ cohortId: applicationsTable.cohortId, programId: applicationsTable.programId })
      .from(applicationsTable)
      .where(
        and(
          eq(applicationsTable.founderId, founderId),
          ne(applicationsTable.status, "draft"),
          ne(applicationsTable.status, "rejected"),
          ne(applicationsTable.status, "withdrawn")
        )
      );

    const cohortIds = [...new Set(myApps.map((a) => a.cohortId).filter(Boolean))] as string[];

    // Get cohort-level course assignments
    const cohortAssignments = cohortIds.length > 0
      ? await Promise.all(
          cohortIds.map((cohortId) =>
            db
              .select({
                assignmentId: programCoursesTable.id,
                programId: programCoursesTable.programId,
                cohortId: programCoursesTable.cohortId,
                courseId: programCoursesTable.courseId,
                displayOrder: programCoursesTable.displayOrder,
                required: programCoursesTable.required,
                courseTitle: coursesTable.title,
                courseDescription: coursesTable.description,
                courseType: coursesTable.type,
                courseDurationMins: coursesTable.durationMins,
                courseUrl: coursesTable.url,
                courseFileUrl: coursesTable.fileUrl,
                courseActive: coursesTable.active,
              })
              .from(programCoursesTable)
              .leftJoin(coursesTable, eq(coursesTable.id, programCoursesTable.courseId))
              .where(
                and(
                  eq(programCoursesTable.cohortId, cohortId),
                  eq(coursesTable.active, true)
                )
              )
              .orderBy(programCoursesTable.displayOrder)
          )
        ).then((r) => r.flat())
      : [];

    // Get individual admin assignments for this founder
    const rawIndividual = await db
      .select({
        assignmentId: founderCourseAssignmentsTable.id,
        courseId: founderCourseAssignmentsTable.courseId,
        required: founderCourseAssignmentsTable.required,
        courseTitle: coursesTable.title,
        courseDescription: coursesTable.description,
        courseType: coursesTable.type,
        courseDurationMins: coursesTable.durationMins,
        courseUrl: coursesTable.url,
        courseFileUrl: coursesTable.fileUrl,
        courseActive: coursesTable.active,
      })
      .from(founderCourseAssignmentsTable)
      .leftJoin(coursesTable, eq(coursesTable.id, founderCourseAssignmentsTable.courseId))
      .where(
        and(
          eq(founderCourseAssignmentsTable.founderId, founderId),
          eq(coursesTable.active, true)
        )
      );

    // Normalize individual assignments to same shape as cohort assignments
    const individualAssignments = rawIndividual.map((a) => ({
      assignmentId: a.assignmentId,
      programId: null as string | null,
      cohortId: null as string | null,
      courseId: a.courseId,
      displayOrder: 9999,
      required: a.required,
      courseTitle: a.courseTitle,
      courseDescription: a.courseDescription,
      courseType: a.courseType,
      courseDurationMins: a.courseDurationMins,
      courseUrl: a.courseUrl,
      courseFileUrl: a.courseFileUrl,
      courseActive: a.courseActive,
      assignedIndividually: true,
    }));

    // Normalize cohort assignments to same shape
    const normalizedCohortAssignments = cohortAssignments.map((a) => ({
      assignmentId: a.assignmentId,
      programId: (a.programId ?? null) as string | null,
      cohortId: (a.cohortId ?? null) as string | null,
      courseId: a.courseId,
      displayOrder: a.displayOrder ?? 0,
      required: a.required,
      courseTitle: a.courseTitle,
      courseDescription: a.courseDescription,
      courseType: a.courseType,
      courseDurationMins: a.courseDurationMins,
      courseUrl: a.courseUrl,
      courseFileUrl: a.courseFileUrl,
      courseActive: a.courseActive,
      assignedIndividually: false,
    }));

    // Merge: cohort assignments first, then individual (deduplicate by courseId)
    const seen = new Set<number>();
    const allCourses: typeof normalizedCohortAssignments = [];

    for (const a of normalizedCohortAssignments) {
      if (!a.courseId || seen.has(a.courseId)) continue;
      seen.add(a.courseId);
      allCourses.push(a);
    }
    for (const a of individualAssignments) {
      if (!a.courseId || seen.has(a.courseId)) continue;
      seen.add(a.courseId);
      allCourses.push(a);
    }

    if (allCourses.length === 0) return res.json([]);

    // Get progress for all courses
    const progressRows = await db
      .select()
      .from(founderCourseProgressTable)
      .where(eq(founderCourseProgressTable.founderId, founderId));

    const progressMap: Record<number, typeof progressRows[0]> = {};
    progressRows.forEach((p) => {
      progressMap[p.courseId] = p;
    });

    const result = allCourses.map((a) => {
      const progress = progressMap[a.courseId!];
      return {
        ...a,
        status: progress?.status ?? "not_started",
        notes: progress?.notes ?? null,
        completedAt: progress?.completedAt ?? null,
        progressId: progress?.id ?? null,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Failed to load founder courses:", err);
    res.status(500).json({ error: "Failed to load courses" });
  }
});

// PUT /api/founder/courses/:id/progress — update status + notes for a course
router.put("/founder/courses/:id/progress", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const courseId = parseInt(String(req.params.id));
  if (isNaN(courseId)) return res.status(400).json({ error: "Invalid course id" });

  const { status, notes } = req.body as {
    status: "not_started" | "in_progress" | "complete";
    notes?: string;
  };

  if (!["not_started", "in_progress", "complete"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const founderId = await getFounderId(userId);
    if (!founderId) return res.status(404).json({ error: "Founder profile not found" });

    // Authorization: verify the course is assigned to one of the founder's cohorts (submitted apps)
    // OR individually assigned to this founder
    const myApps = await db
      .select({ cohortId: applicationsTable.cohortId })
      .from(applicationsTable)
      .where(
        and(
          eq(applicationsTable.founderId, founderId),
          ne(applicationsTable.status, "draft"),
          ne(applicationsTable.status, "rejected"),
          ne(applicationsTable.status, "withdrawn")
        )
      );

    const myCohortIds = [...new Set(
      myApps.map((a) => a.cohortId).filter((id): id is string => id !== null)
    )];

    // Check cohort-level assignment
    const cohortAssigned = myCohortIds.length > 0
      ? await db
          .select({ id: programCoursesTable.id })
          .from(programCoursesTable)
          .where(
            and(
              eq(programCoursesTable.courseId, courseId),
              inArray(programCoursesTable.cohortId, myCohortIds)
            )
          )
      : [];

    // Check individual assignment
    const [individualAssigned] = await db
      .select({ id: founderCourseAssignmentsTable.id })
      .from(founderCourseAssignmentsTable)
      .where(
        and(
          eq(founderCourseAssignmentsTable.founderId, founderId),
          eq(founderCourseAssignmentsTable.courseId, courseId)
        )
      );

    if (cohortAssigned.length === 0 && !individualAssigned) {
      return res.status(403).json({ error: "Course is not assigned to you" });
    }

    const [existing] = await db
      .select()
      .from(founderCourseProgressTable)
      .where(
        and(
          eq(founderCourseProgressTable.founderId, founderId),
          eq(founderCourseProgressTable.courseId, courseId)
        )
      );

    const completedAt = status === "complete" ? new Date() : null;

    if (existing) {
      const [updated] = await db
        .update(founderCourseProgressTable)
        .set({
          status,
          notes: notes ?? existing.notes,
          completedAt: status === "complete" ? (existing.completedAt ?? new Date()) : null,
          updatedAt: new Date(),
        })
        .where(eq(founderCourseProgressTable.id, existing.id))
        .returning();
      return res.json(updated);
    }

    const [created] = await db
      .insert(founderCourseProgressTable)
      .values({
        founderId,
        courseId,
        status,
        notes: notes ?? null,
        completedAt,
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    console.error("Failed to update course progress:", err);
    res.status(500).json({ error: "Failed to update course progress" });
  }
});

export default router;
