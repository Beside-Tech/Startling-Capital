import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { foundersTable } from "./founders";

export const boardMeetingsTable = pgTable("board_meetings", {
  id: serial("id").primaryKey(),
  founderId: integer("founder_id").references(() => foundersTable.id, { onDelete: "set null" }),
  companyName: text("company_name").notNull(),
  title: text("title").notNull(),
  scheduledAt: text("scheduled_at"),
  status: text("status", {
    enum: ["scheduled", "in_progress", "completed", "cancelled"],
  }).notNull().default("scheduled"),
  agenda: text("agenda"),
  minutes: text("minutes"),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const boardMaterialsTable = pgTable("board_materials", {
  id: serial("id").primaryKey(),
  boardMeetingId: integer("board_meeting_id").references(() => boardMeetingsTable.id, { onDelete: "cascade" }),
  founderId: integer("founder_id").references(() => foundersTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  fileUrl: text("file_url"),
  fileType: text("file_type", {
    enum: ["deck", "financials", "legal", "update", "other"],
  }).notNull().default("deck"),
  isConfidential: boolean("is_confidential").notNull().default(false),
  notes: text("notes"),
  uploadedById: integer("uploaded_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBoardMeetingSchema = createInsertSchema(boardMeetingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBoardMaterialSchema = createInsertSchema(boardMaterialsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type BoardMeeting = typeof boardMeetingsTable.$inferSelect;
export type BoardMaterial = typeof boardMaterialsTable.$inferSelect;
export type InsertBoardMeeting = z.infer<typeof insertBoardMeetingSchema>;
