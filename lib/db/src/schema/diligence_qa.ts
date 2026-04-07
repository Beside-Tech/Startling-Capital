import {
  pgTable, serial, integer, text, boolean, timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dealFlowTable } from "./deal_flow";
import { usersTable } from "./users";

export const diligenceQaThreadsTable = pgTable("diligence_qa_threads", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => dealFlowTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  category: text("category", {
    enum: ["financial", "legal", "technical", "market", "team", "other"],
  }).notNull().default("other"),
  status: text("status", {
    enum: ["open", "answered", "closed"],
  }).notNull().default("open"),
  isPrivate: boolean("is_private").notNull().default(false),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const diligenceQaMessagesTable = pgTable("diligence_qa_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => diligenceQaThreadsTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  body: text("body").notNull(),
  isAnswer: boolean("is_answer").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDiligenceQaThreadSchema = createInsertSchema(diligenceQaThreadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDiligenceQaThread = z.infer<typeof insertDiligenceQaThreadSchema>;
export type DiligenceQaThread = typeof diligenceQaThreadsTable.$inferSelect;

export const insertDiligenceQaMessageSchema = createInsertSchema(diligenceQaMessagesTable).omit({ id: true, createdAt: true });
export type InsertDiligenceQaMessage = z.infer<typeof insertDiligenceQaMessageSchema>;
export type DiligenceQaMessage = typeof diligenceQaMessagesTable.$inferSelect;
