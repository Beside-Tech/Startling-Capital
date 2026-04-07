import {
  pgTable, serial, integer, text, numeric, timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { lpProfilesTable } from "./lp_profiles";
import { fundsTable } from "./funds";

export const lpAccountsTable = pgTable("lp_accounts", {
  id: serial("id").primaryKey(),
  lpProfileId: integer("lp_profile_id").notNull().references(() => lpProfilesTable.id, { onDelete: "cascade" }),
  fundId: integer("fund_id").notNull().references(() => fundsTable.id, { onDelete: "cascade" }),
  commitmentCad: numeric("commitment_cad", { precision: 15, scale: 2 }),
  capitalCalledCad: numeric("capital_called_cad", { precision: 15, scale: 2 }).default("0"),
  distributedCapitalCad: numeric("distributed_capital_cad", { precision: 15, scale: 2 }).default("0"),
  status: text("status", {
    enum: ["active", "exited", "suspended"],
  }).notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLpAccountSchema = createInsertSchema(lpAccountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type LpAccount = typeof lpAccountsTable.$inferSelect;
export type InsertLpAccount = z.infer<typeof insertLpAccountSchema>;
