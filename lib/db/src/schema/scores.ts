import { pgTable, text, boolean, serial, real, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";
import { cohortsTable } from "./cohorts";
import { startupsTable } from "./startups";
import { judgesTable } from "./judges";
import { rubricCriteriaTable } from "./rubric";

export const scoresTable = pgTable(
  "scores",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    programId: text("program_id")
      .notNull()
      .references(() => programsTable.id),
    cohortId: text("cohort_id")
      .notNull()
      .references(() => cohortsTable.id),
    roundName: text("round_name").notNull(),
    startupId: integer("startup_id")
      .notNull()
      .references(() => startupsTable.id),
    judgeId: integer("judge_id")
      .notNull()
      .references(() => judgesTable.id),
    criterionId: text("criterion_id")
      .notNull()
      .references(() => rubricCriteriaTable.id),
    score: integer("score").notNull(),
    weight: real("weight").notNull().default(1),
    comment: text("comment"),
    source: text("source").notNull().default("webapp"),
  },
  (table) => ({
    dedupe: unique("scores_dedupe").on(
      table.programId,
      table.cohortId,
      table.roundName,
      table.startupId,
      table.judgeId,
      table.criterionId,
    ),
  }),
);

export const insertScoreSchema = createInsertSchema(scoresTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertScore = z.infer<typeof insertScoreSchema>;
export type Score = typeof scoresTable.$inferSelect;
