import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { lpProfilesTable } from "./lp_profiles";

export const capitalCallsTable = pgTable("capital_calls", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  callDate: text("call_date").notNull(),
  dueDate: text("due_date"),
  totalAmountCad: numeric("total_amount_cad", { precision: 15, scale: 2 }),
  status: text("status", { enum: ["draft", "sent", "partial", "complete"] }).notNull().default("draft"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const capitalCallAllocationsTable = pgTable("capital_call_allocations", {
  id: serial("id").primaryKey(),
  capitalCallId: integer("capital_call_id").notNull().references(() => capitalCallsTable.id, { onDelete: "cascade" }),
  lpProfileId: integer("lp_profile_id").notNull().references(() => lpProfilesTable.id, { onDelete: "cascade" }),
  allocatedAmountCad: numeric("allocated_amount_cad", { precision: 15, scale: 2 }),
  paidAt: timestamp("paid_at"),
  confirmedBy: integer("confirmed_by").references(() => usersTable.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const capitalCallLineItemsTable = pgTable("capital_call_line_items", {
  id: serial("id").primaryKey(),
  capitalCallId: integer("capital_call_id").notNull().references(() => capitalCallsTable.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  description: text("description"),
  amountCad: numeric("amount_cad", { precision: 15, scale: 2 }).notNull(),
  category: text("category", {
    enum: ["new_investment", "follow_on", "reserve", "fees", "other"],
  }).notNull().default("new_investment"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCapitalCallLineItemSchema = createInsertSchema(capitalCallLineItemsTable).omit({ id: true, createdAt: true });
export type CapitalCallLineItem = typeof capitalCallLineItemsTable.$inferSelect;
export type InsertCapitalCallLineItem = z.infer<typeof insertCapitalCallLineItemSchema>;

export const insertCapitalCallSchema = createInsertSchema(capitalCallsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCapitalCallAllocationSchema = createInsertSchema(capitalCallAllocationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type CapitalCall = typeof capitalCallsTable.$inferSelect;
export type CapitalCallAllocation = typeof capitalCallAllocationsTable.$inferSelect;
export type InsertCapitalCall = z.infer<typeof insertCapitalCallSchema>;
