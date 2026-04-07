import { pgTable, serial, integer, text, numeric, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { foundersTable } from "./founders";

export const tractionMetricsTable = pgTable("traction_metrics", {
  id: serial("id").primaryKey(),
  founderId: integer("founder_id").notNull().references(() => foundersTable.id, { onDelete: "cascade" }),
  programId: text("program_id"),
  periodMonth: integer("period_month").notNull(),
  periodYear: integer("period_year").notNull(),
  revenue: numeric("revenue", { precision: 15, scale: 2 }),
  activeUsers: integer("active_users"),
  burnRate: numeric("burn_rate", { precision: 15, scale: 2 }),
  headcount: integer("headcount"),
  notes: text("notes"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  unique("uq_traction_period").on(t.founderId, t.periodMonth, t.periodYear),
]);

export const insertTractionMetricsSchema = createInsertSchema(tractionMetricsTable);
export type InsertTractionMetrics = z.infer<typeof insertTractionMetricsSchema>;
export type TractionMetrics = typeof tractionMetricsTable.$inferSelect;
