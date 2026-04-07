import { pgTable, text, integer, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";

export const roundsTable = pgTable("rounds", {
  id: serial("id").primaryKey(),
  programId: text("program_id")
    .notNull()
    .references(() => programsTable.id),
  name: text("name").notNull(),
  sequence: integer("sequence").notNull(),
  active: boolean("active").notNull().default(true),
});

export const insertRoundSchema = createInsertSchema(roundsTable).omit({ id: true });
export type InsertRound = z.infer<typeof insertRoundSchema>;
export type Round = typeof roundsTable.$inferSelect;
