import { pgTable, text, boolean, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";

export const faqsTable = pgTable("faqs", {
  id: serial("id").primaryKey(),
  programId: text("program_id").references(() => programsTable.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category"),
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const insertFaqSchema = createInsertSchema(faqsTable).omit({ id: true });
export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type Faq = typeof faqsTable.$inferSelect;
