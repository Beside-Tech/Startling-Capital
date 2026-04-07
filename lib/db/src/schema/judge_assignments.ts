import { pgTable, text, boolean, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";
import { cohortsTable } from "./cohorts";
import { judgesTable } from "./judges";

export const judgeAssignmentsTable = pgTable("judge_assignments", {
  id: serial("id").primaryKey(),
  programId: text("program_id")
    .notNull()
    .references(() => programsTable.id),
  cohortId: text("cohort_id")
    .notNull()
    .references(() => cohortsTable.id),
  judgeId: integer("judge_id")
    .notNull()
    .references(() => judgesTable.id),
  active: boolean("active").notNull().default(true),
});

export const insertJudgeAssignmentSchema = createInsertSchema(judgeAssignmentsTable).omit({ id: true });
export type InsertJudgeAssignment = z.infer<typeof insertJudgeAssignmentSchema>;
export type JudgeAssignment = typeof judgeAssignmentsTable.$inferSelect;
