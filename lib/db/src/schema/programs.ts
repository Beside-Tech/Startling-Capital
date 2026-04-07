import { pgTable, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const programsTable = pgTable("programs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  shortDescription: text("short_description"),
  active: boolean("active").notNull().default(true),
  phase: text("phase", { enum: ["pre_event", "in_event", "post_event"] }).notNull().default("pre_event"),
  applicationDeadline: timestamp("application_deadline"),
  programStartDate: timestamp("program_start_date"),
  programEndDate: timestamp("program_end_date"),
  bannerImageUrl: text("banner_image_url"),
  tags: text("tags").array(),
  benefits: text("benefits").array(),
  eligibility: text("eligibility"),
  applicationFormConfig: jsonb("application_form_config"),
  maxApplications: integer("max_applications"),
  fundingAmount: text("funding_amount"),
  location: text("location"),
  format: text("format", { enum: ["in_person", "virtual", "hybrid"] }).default("hybrid"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProgramSchema = createInsertSchema(programsTable);
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type Program = typeof programsTable.$inferSelect;
