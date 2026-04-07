import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { foundersTable, advisorySessionsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireFounder } from "../lib/auth";

const router = Router();

router.get("/founder/advisory", requireFounder, async (req: Request, res: Response): Promise<void> => {
  try {
    const [founder] = await db.select({ id: foundersTable.id }).from(foundersTable)
      .where(eq(foundersTable.userId, req.user!.userId)).limit(1);
    if (!founder) { res.status(404).json({ error: "Founder profile not found" }); return; }

    const sessions = await db.select({
      id: advisorySessionsTable.id,
      topic: advisorySessionsTable.topic,
      description: advisorySessionsTable.description,
      preferredDate: advisorySessionsTable.preferredDate,
      preferredTime: advisorySessionsTable.preferredTime,
      status: advisorySessionsTable.status,
      scheduledAt: advisorySessionsTable.scheduledAt,
      meetingUrl: advisorySessionsTable.meetingUrl,
      notes: advisorySessionsTable.notes,
      createdAt: advisorySessionsTable.createdAt,
      advisorName: usersTable.name,
    })
      .from(advisorySessionsTable)
      .leftJoin(usersTable, eq(advisorySessionsTable.advisorId, usersTable.id))
      .where(eq(advisorySessionsTable.founderId, founder.id))
      .orderBy(desc(advisorySessionsTable.createdAt));

    res.json({ sessions });
  } catch {
    res.status(500).json({ error: "Failed to fetch advisory sessions" });
  }
});

router.post("/founder/advisory", requireFounder, async (req: Request, res: Response): Promise<void> => {
  try {
    const [founder] = await db.select({ id: foundersTable.id }).from(foundersTable)
      .where(eq(foundersTable.userId, req.user!.userId)).limit(1);
    if (!founder) { res.status(404).json({ error: "Founder profile not found" }); return; }

    const { topic, description, preferredDate, preferredTime } = req.body;
    if (!description) { res.status(400).json({ error: "Description is required" }); return; }

    const [session] = await db.insert(advisorySessionsTable).values({
      founderId: founder.id,
      topic: topic || "other",
      description,
      preferredDate: preferredDate || null,
      preferredTime: preferredTime || null,
      status: "requested",
    }).returning();

    res.status(201).json({ session });
  } catch {
    res.status(500).json({ error: "Failed to request advisory session" });
  }
});

export default router;
