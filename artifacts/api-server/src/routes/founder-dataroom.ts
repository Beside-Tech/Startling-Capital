import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { foundersTable, dataRoomFilesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireFounder } from "../lib/auth";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const storage = new ObjectStorageService();

router.get("/founder/data-room", requireFounder, async (req: Request, res: Response): Promise<void> => {
  try {
    const [founder] = await db.select({ id: foundersTable.id }).from(foundersTable)
      .where(eq(foundersTable.userId, req.user!.userId)).limit(1);
    if (!founder) { res.status(404).json({ error: "Founder profile not found" }); return; }

    const files = await db.select().from(dataRoomFilesTable)
      .where(eq(dataRoomFilesTable.founderId, founder.id))
      .orderBy(desc(dataRoomFilesTable.uploadedAt));

    res.json({ files });
  } catch {
    res.status(500).json({ error: "Failed to fetch data room" });
  }
});

router.post("/founder/data-room", requireFounder, async (req: Request, res: Response): Promise<void> => {
  try {
    const [founder] = await db.select({ id: foundersTable.id }).from(foundersTable)
      .where(eq(foundersTable.userId, req.user!.userId)).limit(1);
    if (!founder) { res.status(404).json({ error: "Founder profile not found" }); return; }

    const { fileName, originalName, fileSize, mimeType, storageKey, category, description } = req.body;
    if (!storageKey || !originalName) {
      res.status(400).json({ error: "storageKey and originalName are required" }); return;
    }

    const [file] = await db.insert(dataRoomFilesTable).values({
      founderId: founder.id,
      fileName: fileName || originalName,
      originalName,
      fileSize: fileSize || null,
      mimeType: mimeType || null,
      storageKey,
      category: category || "other",
      description: description || null,
      isPublic: false,
    }).returning();

    await db.update(foundersTable)
      .set({ dataRoomLastUpdated: new Date(), updatedAt: new Date() })
      .where(eq(foundersTable.id, founder.id));

    res.status(201).json({ file });
  } catch {
    res.status(500).json({ error: "Failed to save file" });
  }
});

router.delete("/founder/data-room/:id", requireFounder, async (req: Request, res: Response): Promise<void> => {
  try {
    const [founder] = await db.select({ id: foundersTable.id }).from(foundersTable)
      .where(eq(foundersTable.userId, req.user!.userId)).limit(1);
    if (!founder) { res.status(404).json({ error: "Founder profile not found" }); return; }

    const fileId = Number(req.params["id"]);
    const [file] = await db.select().from(dataRoomFilesTable)
      .where(eq(dataRoomFilesTable.id, fileId)).limit(1);

    if (!file || file.founderId !== founder.id) {
      res.status(404).json({ error: "File not found" }); return;
    }

    await db.delete(dataRoomFilesTable).where(eq(dataRoomFilesTable.id, fileId));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
