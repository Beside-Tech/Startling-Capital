import { Router } from "express";
import { db } from "@workspace/db";
import { dataRoomFilesTable, dealFlowTable, foundersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireIC, requireManagingPartner } from "../lib/auth";

const router = Router();

router.get("/data-room/deals/:dealId/files", requireIC, async (req, res) => {
  try {
    const dealId = Number(String(req.params.dealId));

    const [deal] = await db.select({
      id: dealFlowTable.id,
      companyName: dealFlowTable.companyName,
      founderId: dealFlowTable.founderId,
    }).from(dealFlowTable).where(eq(dealFlowTable.id, dealId)).limit(1);

    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const dealFiles = await db.select()
      .from(dataRoomFilesTable)
      .where(eq(dataRoomFilesTable.dealId, dealId))
      .orderBy(desc(dataRoomFilesTable.uploadedAt));

    const founderFiles = deal.founderId
      ? await db.select()
          .from(dataRoomFilesTable)
          .where(eq(dataRoomFilesTable.founderId, deal.founderId))
          .orderBy(desc(dataRoomFilesTable.uploadedAt))
      : [];

    res.json({
      deal,
      dealFiles,
      founderFiles,
      totalFiles: dealFiles.length + founderFiles.length,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch data room files" });
  }
});

router.post("/data-room/deals/:dealId/files", requireManagingPartner, async (req, res) => {
  try {
    const dealId = Number(String(req.params.dealId));
    const { fileName, originalName, storageKey, category, description, fileSize, mimeType, isPublic } = req.body;
    if (!fileName || !storageKey) {
      return res.status(400).json({ error: "fileName and storageKey are required" });
    }

    const [deal] = await db.select({ founderId: dealFlowTable.founderId })
      .from(dealFlowTable).where(eq(dealFlowTable.id, dealId)).limit(1);

    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const [file] = await db.insert(dataRoomFilesTable).values({
      founderId: deal.founderId!,
      dealId,
      fileName,
      originalName: originalName || fileName,
      storageKey,
      category: category || "other",
      description: description || null,
      fileSize: fileSize || null,
      mimeType: mimeType || null,
      isPublic: isPublic ?? false,
    }).returning();

    res.status(201).json({ file });
  } catch {
    res.status(500).json({ error: "Failed to upload file to deal data room" });
  }
});

router.get("/data-room/founder/:founderId/files", requireIC, async (req, res) => {
  try {
    const founderId = Number(String(req.params.founderId));
    const files = await db.select()
      .from(dataRoomFilesTable)
      .where(eq(dataRoomFilesTable.founderId, founderId))
      .orderBy(desc(dataRoomFilesTable.uploadedAt));

    res.json({ files });
  } catch {
    res.status(500).json({ error: "Failed to fetch founder data room files" });
  }
});

export default router;
