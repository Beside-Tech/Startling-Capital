import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dealFlowTable } from "./deal_flow";
import { usersTable } from "./users";

export const closingChecklistsTable = pgTable("closing_checklists", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => dealFlowTable.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Standard Closing"),
  status: text("status", {
    enum: ["pending", "in_progress", "complete", "blocked"],
  }).notNull().default("pending"),
  notes: text("notes"),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const closingChecklistItemsTable = pgTable("closing_checklist_items", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull().references(() => closingChecklistsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  isRequired: boolean("is_required").notNull().default(true),
  isComplete: boolean("is_complete").notNull().default(false),
  completedAt: timestamp("completed_at"),
  completedById: integer("completed_by_id").references(() => usersTable.id),
  dueDate: text("due_date"),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClosingChecklistSchema = createInsertSchema(closingChecklistsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClosingChecklistItemSchema = createInsertSchema(closingChecklistItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type ClosingChecklist = typeof closingChecklistsTable.$inferSelect;
export type ClosingChecklistItem = typeof closingChecklistItemsTable.$inferSelect;
export type InsertClosingChecklist = z.infer<typeof insertClosingChecklistSchema>;
