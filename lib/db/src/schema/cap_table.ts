import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { foundersTable } from "./founders";
import { fundsTable } from "./funds";

export const capTableEntriesTable = pgTable("cap_table_entries", {
  id: serial("id").primaryKey(),
  founderId: integer("founder_id").notNull().references(() => foundersTable.id, { onDelete: "cascade" }),
  fundId: integer("fund_id").references(() => fundsTable.id, { onDelete: "set null" }),
  investorName: text("investor_name").notNull(),
  investorType: text("investor_type", {
    enum: ["founder", "investor", "employee", "advisor", "other"],
  }).notNull().default("investor"),
  instrument: text("instrument").notNull().default("Common"),
  shares: numeric("shares", { precision: 18, scale: 0 }),
  equityPct: numeric("equity_pct", { precision: 8, scale: 4 }),
  investmentAmountCad: numeric("investment_amount_cad", { precision: 15, scale: 2 }),
  roundName: text("round_name"),
  date: text("date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCapTableEntrySchema = createInsertSchema(capTableEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type CapTableEntry = typeof capTableEntriesTable.$inferSelect;
export type InsertCapTableEntry = z.infer<typeof insertCapTableEntrySchema>;
