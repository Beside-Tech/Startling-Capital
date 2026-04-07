import {
  pgTable, serial, integer, text, numeric, boolean, timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const lpQuarterlyUpdatesTable = pgTable("lp_quarterly_updates", {
  id: serial("id").primaryKey(),
  quarter: integer("quarter").notNull(),
  year: integer("year").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  tvpi: numeric("tvpi", { precision: 8, scale: 4 }),
  dpi: numeric("dpi", { precision: 8, scale: 4 }),
  irr: numeric("irr", { precision: 8, scale: 4 }),
  nav: numeric("nav", { precision: 18, scale: 2 }),
  totalDeployedCad: numeric("total_deployed_cad", { precision: 18, scale: 2 }),
  portfolioCount: integer("portfolio_count"),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLpQuarterlyUpdateSchema = createInsertSchema(lpQuarterlyUpdatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLpQuarterlyUpdate = z.infer<typeof insertLpQuarterlyUpdateSchema>;
export type LpQuarterlyUpdate = typeof lpQuarterlyUpdatesTable.$inferSelect;
