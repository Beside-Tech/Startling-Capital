import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { foundersTable } from "./founders";

export { investmentStatusEnum } from "./founders";

export const investmentsTable = pgTable("investments", {
  id: serial("id").primaryKey(),
  founderId: integer("founder_id").notNull().references(() => foundersTable.id, { onDelete: "cascade" }),
  startupName: text("startup_name").notNull(),
  investmentDate: text("investment_date").notNull(),
  amountCad: numeric("amount_cad", { precision: 15, scale: 2 }),
  amountUsd: numeric("amount_usd", { precision: 15, scale: 2 }),
  isLead: boolean("is_lead").notNull().default(false),
  equityPct: numeric("equity_pct", { precision: 6, scale: 3 }),
  instrument: text("instrument").notNull().default("SAFE"),
  roundName: text("round_name"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const investmentRoundsTable = pgTable("investment_rounds", {
  id: serial("id").primaryKey(),
  investmentId: integer("investment_id").notNull().references(() => investmentsTable.id, { onDelete: "cascade" }),
  roundName: text("round_name").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }),
  currency: text("currency").notNull().default("CAD"),
  isLead: boolean("is_lead").notNull().default(false),
  date: text("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInvestmentSchema = createInsertSchema(investmentsTable);
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investmentsTable.$inferSelect;

export const insertInvestmentRoundSchema = createInsertSchema(investmentRoundsTable);
export type InsertInvestmentRound = z.infer<typeof insertInvestmentRoundSchema>;
export type InvestmentRound = typeof investmentRoundsTable.$inferSelect;
