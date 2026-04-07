import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dealFlowTable } from "./deal_flow";
import { usersTable } from "./users";

export const diligenceChecklistsTable = pgTable("diligence_checklists", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => dealFlowTable.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Standard Diligence"),
  status: text("status", {
    enum: ["not_started", "in_progress", "complete"],
  }).notNull().default("not_started"),
  notes: text("notes"),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const diligenceChecklistItemsTable = pgTable("diligence_checklist_items", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull().references(() => diligenceChecklistsTable.id, { onDelete: "cascade" }),
  category: text("category", {
    enum: ["legal", "financial", "technical", "team", "market", "product", "other"],
  }).notNull().default("other"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["pending", "in_review", "complete", "flagged", "na"],
  }).notNull().default("pending"),
  assignedToId: integer("assigned_to_id").references(() => usersTable.id),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDiligenceChecklistSchema = createInsertSchema(diligenceChecklistsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDiligenceChecklistItemSchema = createInsertSchema(diligenceChecklistItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type DiligenceChecklist = typeof diligenceChecklistsTable.$inferSelect;
export type DiligenceChecklistItem = typeof diligenceChecklistItemsTable.$inferSelect;
export type InsertDiligenceChecklist = z.infer<typeof insertDiligenceChecklistSchema>;
