import { pgTable, text, boolean, serial, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const advancementRulesTable = pgTable("advancement_rules", {
  id: serial("id").primaryKey(),
  programId: text("program_id").notNull(),
  cohortId: text("cohort_id").notNull(),
  fromRound: text("from_round").notNull(),
  toRound: text("to_round").notNull(),
  thresholdPct: real("threshold_pct").notNull(),
  minJudges: integer("min_judges").notNull().default(1),
  active: boolean("active").notNull().default(true),
});

export const insertAdvancementRuleSchema = createInsertSchema(advancementRulesTable).omit({ id: true });
export type InsertAdvancementRule = z.infer<typeof insertAdvancementRuleSchema>;
export type AdvancementRule = typeof advancementRulesTable.$inferSelect;
