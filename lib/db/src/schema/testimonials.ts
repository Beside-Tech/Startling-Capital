import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { foundersTable } from "./founders";

export const testimonialsTable = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  founderId: integer("founder_id").notNull().references(() => foundersTable.id),
  content: text("content").notNull(),
  programName: text("program_name"),
  cohortYear: text("cohort_year"),
  isActive: boolean("is_active").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedByUserId: integer("approved_by_user_id"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTestimonialSchema = createInsertSchema(testimonialsTable).omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
});
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonialsTable.$inferSelect;
