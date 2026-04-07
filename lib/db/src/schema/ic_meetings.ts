import {
  pgTable, serial, integer, text, timestamp, boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { dealFlowTable } from "./deal_flow";

export const icMeetingsTable = pgTable("ic_meetings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  agenda: text("agenda"),
  status: text("status", {
    enum: ["draft", "scheduled", "completed", "cancelled"],
  }).notNull().default("draft"),
  quorumReached: boolean("quorum_reached").notNull().default(false),
  notes: text("notes"),
  minutesUrl: text("minutes_url"),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const icMeetingDealsTable = pgTable("ic_meeting_deals", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().references(() => icMeetingsTable.id, { onDelete: "cascade" }),
  dealId: integer("deal_id").notNull().references(() => dealFlowTable.id, { onDelete: "cascade" }),
  packetUrl: text("packet_url"),
  presentedById: integer("presented_by_id").references(() => usersTable.id),
  recommendation: text("recommendation", {
    enum: ["invest", "pass", "more_diligence", "defer"],
  }),
  decisionReached: boolean("decision_reached").notNull().default(false),
  decisionNotes: text("decision_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIcMeetingSchema = createInsertSchema(icMeetingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIcMeeting = z.infer<typeof insertIcMeetingSchema>;
export type IcMeeting = typeof icMeetingsTable.$inferSelect;

export const insertIcMeetingDealSchema = createInsertSchema(icMeetingDealsTable).omit({ id: true, createdAt: true });
export type InsertIcMeetingDeal = z.infer<typeof insertIcMeetingDealSchema>;
export type IcMeetingDeal = typeof icMeetingDealsTable.$inferSelect;
