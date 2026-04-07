import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const lpProfilesTable = pgTable("lp_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  firmName: text("firm_name"),
  contactName: text("contact_name"),
  commitmentCad: numeric("commitment_cad", { precision: 15, scale: 2 }),
  capitalCalledCad: numeric("capital_called_cad", { precision: 15, scale: 2 }),
  country: text("country"),
  investorType: text("investor_type", {
    enum: ["individual", "family_office", "institutional", "corporate", "government", "other"],
  }).notNull().default("individual"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLpProfileSchema = createInsertSchema(lpProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type LpProfile = typeof lpProfilesTable.$inferSelect;
