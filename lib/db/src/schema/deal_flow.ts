import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { foundersTable } from "./founders";
import { usersTable } from "./users";

export const dealFlowTable = pgTable("deal_flow", {
  id: serial("id").primaryKey(),
  founderId: integer("founder_id").references(() => foundersTable.id, { onDelete: "set null" }),
  companyName: text("company_name").notNull(),
  sector: text("sector"),
  stage: text("stage"),
  amountSoughtCad: numeric("amount_sought_cad", { precision: 15, scale: 2 }),
  instrument: text("instrument").notNull().default("SAFE"),
  pipelineStage: text("pipeline_stage", {
    enum: [
      "sourced", "interested", "due_diligence", "ready_for_ic",
      "ic_approved", "ic_rejected", "closing", "invested", "passed", "deal_dead",
      "screening", "ic_review", "term_sheet", "closed",
    ],
  }).notNull().default("sourced"),
  source: text("source"),
  assignedToId: integer("assigned_to_id").references(() => usersTable.id),
  notes: text("notes"),
  decisionDate: text("decision_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const icVotesTable = pgTable("ic_votes", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => dealFlowTable.id, { onDelete: "cascade" }),
  voterId: integer("voter_id").notNull().references(() => usersTable.id),
  vote: text("vote", { enum: ["approve", "reject", "abstain", "more_info"] }).notNull(),
  comment: text("comment"),
  dissentNote: text("dissent_note"),
  updatedAt: timestamp("updated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDealFlowSchema = createInsertSchema(dealFlowTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIcVoteSchema = createInsertSchema(icVotesTable).omit({ id: true, createdAt: true });
export type DealFlow = typeof dealFlowTable.$inferSelect;
export type IcVote = typeof icVotesTable.$inferSelect;
