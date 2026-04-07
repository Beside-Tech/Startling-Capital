import { pgTable, text, boolean, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { foundersTable } from "./founders";
import { cohortsTable } from "./cohorts";

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type", { enum: ["video", "workshop", "reading", "live_session"] }).notNull().default("video"),
  durationMins: integer("duration_mins"),
  url: text("url"),
  fileUrl: text("file_url"),
  active: boolean("active").notNull().default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const programCoursesTable = pgTable("program_courses", {
  id: serial("id").primaryKey(),
  programId: text("program_id").notNull(),
  cohortId: text("cohort_id").notNull().references(() => cohortsTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  displayOrder: integer("display_order").notNull().default(0),
  required: boolean("required").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const founderCourseProgressTable = pgTable("founder_course_progress", {
  id: serial("id").primaryKey(),
  founderId: integer("founder_id").notNull().references(() => foundersTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["not_started", "in_progress", "complete"] }).notNull().default("not_started"),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  unique("uq_founder_course_progress").on(t.founderId, t.courseId),
]);

export const insertCourseSchema = createInsertSchema(coursesTable);
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;

export const insertProgramCourseSchema = createInsertSchema(programCoursesTable);
export type InsertProgramCourse = z.infer<typeof insertProgramCourseSchema>;
export type ProgramCourse = typeof programCoursesTable.$inferSelect;

export const insertFounderCourseProgressSchema = createInsertSchema(founderCourseProgressTable);
export type InsertFounderCourseProgress = z.infer<typeof insertFounderCourseProgressSchema>;
export type FounderCourseProgress = typeof founderCourseProgressTable.$inferSelect;

// Individual founder-level course assignments (admin-assigned to a specific founder)
export const founderCourseAssignmentsTable = pgTable("founder_course_assignments", {
  id: serial("id").primaryKey(),
  founderId: integer("founder_id").notNull().references(() => foundersTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  assignedBy: integer("assigned_by"),
  required: boolean("required").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  unique("uq_founder_course_assignment").on(t.founderId, t.courseId),
]);

export const insertFounderCourseAssignmentSchema = createInsertSchema(founderCourseAssignmentsTable);
export type InsertFounderCourseAssignment = z.infer<typeof insertFounderCourseAssignmentSchema>;
export type FounderCourseAssignment = typeof founderCourseAssignmentsTable.$inferSelect;
