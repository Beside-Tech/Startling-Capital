import {
  pgTable, serial, integer, text, numeric, boolean, timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dealFlowTable } from "./deal_flow";
import { usersTable } from "./users";

export const termSheetsTable = pgTable("term_sheets", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => dealFlowTable.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  status: text("status", {
    enum: ["draft", "sent", "negotiating", "signed", "withdrawn"],
  }).notNull().default("draft"),
  valuationPreMoneyCad: numeric("valuation_pre_money_cad", { precision: 18, scale: 2 }),
  investmentAmountCad: numeric("investment_amount_cad", { precision: 15, scale: 2 }),
  equityPct: numeric("equity_pct", { precision: 6, scale: 3 }),
  instrument: text("instrument").notNull().default("SAFE"),
  discountRate: numeric("discount_rate", { precision: 5, scale: 2 }),
  valuationCap: numeric("valuation_cap", { precision: 18, scale: 2 }),
  proRataRights: boolean("pro_rata_rights").notNull().default(false),
  boardSeat: boolean("board_seat").notNull().default(false),
  informationRights: boolean("information_rights").notNull().default(true),
  closingConditions: text("closing_conditions"),
  expiryDate: text("expiry_date"),
  notes: text("notes"),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTermSheetSchema = createInsertSchema(termSheetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTermSheet = z.infer<typeof insertTermSheetSchema>;
export type TermSheet = typeof termSheetsTable.$inferSelect;
