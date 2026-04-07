import {
  pgTable, serial, text, numeric, integer, boolean, timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const fundsTable = pgTable("funds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  vintage: integer("vintage").notNull(),
  currency: text("currency").notNull().default("CAD"),
  fundSizeCad: numeric("fund_size_cad", { precision: 18, scale: 2 }),
  committedCapitalCad: numeric("committed_capital_cad", { precision: 18, scale: 2 }),
  calledCapitalCad: numeric("called_capital_cad", { precision: 18, scale: 2 }),
  distributedCapitalCad: numeric("distributed_capital_cad", { precision: 18, scale: 2 }),
  navCad: numeric("nav_cad", { precision: 18, scale: 2 }),
  tvpi: numeric("tvpi", { precision: 8, scale: 4 }),
  dpi: numeric("dpi", { precision: 8, scale: 4 }),
  rvpi: numeric("rvpi", { precision: 8, scale: 4 }),
  irr: numeric("irr", { precision: 8, scale: 4 }),
  managementFeePct: numeric("management_fee_pct", { precision: 5, scale: 2 }),
  carriedInterestPct: numeric("carried_interest_pct", { precision: 5, scale: 2 }),
  investmentPeriodEndDate: text("investment_period_end_date"),
  fundTermYears: integer("fund_term_years"),
  status: text("status", {
    enum: ["fundraising", "investing", "harvesting", "closed"],
  }).notNull().default("investing"),
  strategy: text("strategy"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFundSchema = createInsertSchema(fundsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFund = z.infer<typeof insertFundSchema>;
export type Fund = typeof fundsTable.$inferSelect;
