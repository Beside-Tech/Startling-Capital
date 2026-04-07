import { pgTable, text, boolean, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";
import { cohortsTable } from "./cohorts";
import { foundersTable } from "./founders";

export const applicationsTable = pgTable("applications", {
  id: serial("id").primaryKey(),
  programId: text("program_id").notNull().references(() => programsTable.id),
  cohortId: text("cohort_id").notNull().references(() => cohortsTable.id),
  founderId: integer("founder_id").notNull().references(() => foundersTable.id),
  status: text("status", {
    enum: ["draft", "submitted", "under_review", "shortlisted", "accepted", "rejected", "withdrawn"],
  }).notNull().default("draft"),
  answers: jsonb("answers"),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;
