import { pgTable, text, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const judgesTable = pgTable("judges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  title: text("title"),
  active: boolean("active").notNull().default(true),
});

export const insertJudgeSchema = createInsertSchema(judgesTable).omit({ id: true });
export type InsertJudge = z.infer<typeof insertJudgeSchema>;
export type Judge = typeof judgesTable.$inferSelect;
