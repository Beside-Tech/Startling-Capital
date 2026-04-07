import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { foundersTable } from "./founders";
import { usersTable } from "./users";

export const advisorySessionsTable = pgTable("advisory_sessions", {
  id: serial("id").primaryKey(),
  founderId: integer("founder_id").notNull().references(() => foundersTable.id, { onDelete: "cascade" }),
  advisorId: integer("advisor_id").references(() => usersTable.id),
  topic: text("topic", {
    enum: ["fundraising", "market_expansion", "product", "legal", "hr", "marketing", "other"],
  }).notNull().default("other"),
  description: text("description").notNull(),
  preferredDate: text("preferred_date"),
  preferredTime: text("preferred_time"),
  status: text("status", {
    enum: ["requested", "scheduled", "completed", "cancelled"],
  }).notNull().default("requested"),
  scheduledAt: timestamp("scheduled_at"),
  meetingUrl: text("meeting_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAdvisorySessionSchema = createInsertSchema(advisorySessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type AdvisorySession = typeof advisorySessionsTable.$inferSelect;
