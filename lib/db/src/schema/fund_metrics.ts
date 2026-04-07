import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { fundsTable } from "./funds";
import { usersTable } from "./users";

export const fundMetricsSnapshotsTable = pgTable("fund_metrics_snapshots", {
  id: serial("id").primaryKey(),
  fundId: integer("fund_id").notNull().references(() => fundsTable.id, { onDelete: "cascade" }),
  snapshotDate: text("snapshot_date").notNull(),
  quarter: integer("quarter").notNull(),
  year: integer("year").notNull(),
  navCad: numeric("nav_cad", { precision: 18, scale: 2 }),
  calledCapitalCad: numeric("called_capital_cad", { precision: 18, scale: 2 }),
  distributedCapitalCad: numeric("distributed_capital_cad", { precision: 18, scale: 2 }),
  tvpi: numeric("tvpi", { precision: 8, scale: 4 }),
  dpi: numeric("dpi", { precision: 8, scale: 4 }),
  rvpi: numeric("rvpi", { precision: 8, scale: 4 }),
  irr: numeric("irr", { precision: 8, scale: 4 }),
  portfolioCount: integer("portfolio_count"),
  notes: text("notes"),
  recordedById: integer("recorded_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFundMetricsSnapshotSchema = createInsertSchema(fundMetricsSnapshotsTable).omit({ id: true, createdAt: true });
export type FundMetricsSnapshot = typeof fundMetricsSnapshotsTable.$inferSelect;
export type InsertFundMetricsSnapshot = z.infer<typeof insertFundMetricsSnapshotSchema>;
