import { pgTable, text, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";
import { cohortsTable } from "./cohorts";

export const startupsTable = pgTable("startups", {
  id: serial("id").primaryKey(),
  programId: text("program_id")
    .notNull()
    .references(() => programsTable.id),
  cohortId: text("cohort_id")
    .notNull()
    .references(() => cohortsTable.id),
  name: text("name").notNull(),
  sector: text("sector"),
  stage: text("stage"),
  location: text("location"),
  website: text("website"),
  email: text("email"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
});

export const insertStartupSchema = createInsertSchema(startupsTable).omit({ id: true });
export type InsertStartup = z.infer<typeof insertStartupSchema>;
export type Startup = typeof startupsTable.$inferSelect;
