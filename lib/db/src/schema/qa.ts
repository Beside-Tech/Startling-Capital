import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { foundersTable } from "./founders";
import { usersTable } from "./users";

export const qaThreadsTable = pgTable("qa_threads", {
  id: serial("id").primaryKey(),
  founderId: integer("founder_id").references(() => foundersTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category", {
    enum: ["general", "program", "funding", "legal", "product", "market", "other"],
  }).notNull().default("general"),
  isPublic: boolean("is_public").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  status: text("status", { enum: ["open", "answered", "closed"] }).notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const qaRepliesTable = pgTable("qa_replies", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => qaThreadsTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  body: text("body").notNull(),
  isStaffReply: boolean("is_staff_reply").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertQaThreadSchema = createInsertSchema(qaThreadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQaReplySchema = createInsertSchema(qaRepliesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type QaThread = typeof qaThreadsTable.$inferSelect;
export type QaReply = typeof qaRepliesTable.$inferSelect;
