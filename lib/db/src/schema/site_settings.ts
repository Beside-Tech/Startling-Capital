import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const siteSettingsTable = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  type: text("type").notNull().default("text"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSiteSettingSchema = createInsertSchema(siteSettingsTable);
export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;
export type SiteSetting = typeof siteSettingsTable.$inferSelect;
