import { pgTable, text, boolean, serial, timestamp, integer, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { foundersTable } from "./founders";

export const dataRoomFilesTable = pgTable("data_room_files", {
  id: serial("id").primaryKey(),
  founderId: integer("founder_id").notNull().references(() => foundersTable.id),
  category: text("category", {
    enum: ["legal", "financial", "technical", "team", "pitch_deck", "financial_model", "product", "market_research", "other"],
  }).notNull().default("other"),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: bigint("file_size", { mode: "number" }),
  mimeType: text("mime_type"),
  storageKey: text("storage_key").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(false),
  dealId: integer("deal_id"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDataRoomFileSchema = createInsertSchema(dataRoomFilesTable).omit({ id: true, uploadedAt: true, updatedAt: true });
export type InsertDataRoomFile = z.infer<typeof insertDataRoomFileSchema>;
export type DataRoomFile = typeof dataRoomFilesTable.$inferSelect;
