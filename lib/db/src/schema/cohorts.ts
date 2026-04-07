import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";

export const cohortsTable = pgTable("cohorts", {
  id: text("id").primaryKey(),
  programId: text("program_id")
    .notNull()
    .references(() => programsTable.id),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  active: boolean("active").notNull().default(true),
});

export const insertCohortSchema = createInsertSchema(cohortsTable);
export type InsertCohort = z.infer<typeof insertCohortSchema>;
export type Cohort = typeof cohortsTable.$inferSelect;
