import { pgTable, text, boolean, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const investmentStatusEnum = pgEnum("investment_status", ["none", "portfolio", "exited"]);

export const foundersTable = pgTable("founders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  companyName: text("company_name"),
  companyWebsite: text("company_website"),
  sector: text("sector"),
  stage: text("stage"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  bio: text("bio"),
  linkedinUrl: text("linkedin_url"),
  twitterUrl: text("twitter_url"),
  avatarUrl: text("avatar_url"),
  dataRoomLastUpdated: timestamp("data_room_last_updated"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  investmentStatus: investmentStatusEnum("investment_status").notNull().default("none"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFounderSchema = createInsertSchema(foundersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFounder = z.infer<typeof insertFounderSchema>;
export type Founder = typeof foundersTable.$inferSelect;
