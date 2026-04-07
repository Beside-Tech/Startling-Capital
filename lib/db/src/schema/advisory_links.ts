import { pgTable, text, boolean, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";

export const advisoryLinksTable = pgTable("advisory_links", {
  id: serial("id").primaryKey(),
  programId: text("program_id").references(() => programsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  icon: text("icon"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdvisoryLinkSchema = createInsertSchema(advisoryLinksTable).omit({ id: true, createdAt: true });
export type InsertAdvisoryLink = z.infer<typeof insertAdvisoryLinkSchema>;
export type AdvisoryLink = typeof advisoryLinksTable.$inferSelect;
