import {
  pgTable, serial, integer, text, boolean, timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { foundersTable } from "./founders";
import { usersTable } from "./users";

export const founderAsksTable = pgTable("founder_asks", {
  id: serial("id").primaryKey(),
  founderId: integer("founder_id").notNull().references(() => foundersTable.id, { onDelete: "cascade" }),
  category: text("category", {
    enum: ["intro", "hiring", "legal", "finance", "product", "marketing", "bd", "other"],
  }).notNull().default("other"),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority", {
    enum: ["low", "medium", "high", "urgent"],
  }).notNull().default("medium"),
  status: text("status", {
    enum: ["open", "in_progress", "fulfilled", "closed"],
  }).notNull().default("open"),
  assignedToId: integer("assigned_to_id").references(() => usersTable.id),
  fulfilledAt: timestamp("fulfilled_at"),
  fulfilledNote: text("fulfilled_note"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFounderAskSchema = createInsertSchema(founderAsksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFounderAsk = z.infer<typeof insertFounderAskSchema>;
export type FounderAsk = typeof founderAsksTable.$inferSelect;
