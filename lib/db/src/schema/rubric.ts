import { pgTable, text, boolean, serial, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";

export const rubricScaleTable = pgTable("rubric_scale", {
  score: integer("score").primaryKey(),
  label: text("label").notNull(),
  meaning: text("meaning").notNull(),
  active: boolean("active").notNull().default(true),
});

export const rubricCriteriaTable = pgTable("rubric_criteria", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull(),
  roundName: text("round_name").notNull(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  required: boolean("required").notNull().default(false),
  weight: real("weight").notNull().default(1),
  maxScore: integer("max_score").notNull().default(5),
  active: boolean("active").notNull().default(true),
});

export const criterionLevelGuidanceTable = pgTable("criterion_level_guidance", {
  id: serial("id").primaryKey(),
  criterionId: text("criterion_id")
    .notNull()
    .references(() => rubricCriteriaTable.id),
  score: integer("score").notNull(),
  guidanceText: text("guidance_text").notNull(),
  active: boolean("active").notNull().default(true),
});

export const insertRubricScaleSchema = createInsertSchema(rubricScaleTable);
export type InsertRubricScale = z.infer<typeof insertRubricScaleSchema>;
export type RubricScale = typeof rubricScaleTable.$inferSelect;

export const insertRubricCriterionSchema = createInsertSchema(rubricCriteriaTable);
export type InsertRubricCriterion = z.infer<typeof insertRubricCriterionSchema>;
export type RubricCriterion = typeof rubricCriteriaTable.$inferSelect;

export const insertCriterionLevelGuidanceSchema = createInsertSchema(criterionLevelGuidanceTable).omit({ id: true });
export type InsertCriterionLevelGuidance = z.infer<typeof insertCriterionLevelGuidanceSchema>;
export type CriterionLevelGuidance = typeof criterionLevelGuidanceTable.$inferSelect;
