import { Router } from "express";
import { db } from "@workspace/db";
import {
  lpQuarterlyUpdatesTable, lpProfilesTable, usersTable, capitalCallsTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireLP, requireManagingPartner } from "../lib/auth";

const router = Router();

router.get("/lp/quarterly-updates", requireLP, async (_req, res) => {
  try {
    const updates = await db
      .select({
        id: lpQuarterlyUpdatesTable.id,
        quarter: lpQuarterlyUpdatesTable.quarter,
        year: lpQuarterlyUpdatesTable.year,
        title: lpQuarterlyUpdatesTable.title,
        body: lpQuarterlyUpdatesTable.body,
        tvpi: lpQuarterlyUpdatesTable.tvpi,
        dpi: lpQuarterlyUpdatesTable.dpi,
        irr: lpQuarterlyUpdatesTable.irr,
        nav: lpQuarterlyUpdatesTable.nav,
        totalDeployedCad: lpQuarterlyUpdatesTable.totalDeployedCad,
        portfolioCount: lpQuarterlyUpdatesTable.portfolioCount,
        publishedAt: lpQuarterlyUpdatesTable.publishedAt,
      })
      .from(lpQuarterlyUpdatesTable)
      .where(eq(lpQuarterlyUpdatesTable.isPublished, true))
      .orderBy(desc(lpQuarterlyUpdatesTable.year), desc(lpQuarterlyUpdatesTable.quarter));

    res.json({ updates });
  } catch {
    res.status(500).json({ error: "Failed to fetch updates" });
  }
});

router.get("/mp/quarterly-updates", requireManagingPartner, async (_req, res) => {
  try {
    const updates = await db
      .select({
        id: lpQuarterlyUpdatesTable.id,
        quarter: lpQuarterlyUpdatesTable.quarter,
        year: lpQuarterlyUpdatesTable.year,
        title: lpQuarterlyUpdatesTable.title,
        tvpi: lpQuarterlyUpdatesTable.tvpi,
        dpi: lpQuarterlyUpdatesTable.dpi,
        irr: lpQuarterlyUpdatesTable.irr,
        nav: lpQuarterlyUpdatesTable.nav,
        totalDeployedCad: lpQuarterlyUpdatesTable.totalDeployedCad,
        portfolioCount: lpQuarterlyUpdatesTable.portfolioCount,
        isPublished: lpQuarterlyUpdatesTable.isPublished,
        publishedAt: lpQuarterlyUpdatesTable.publishedAt,
        createdAt: lpQuarterlyUpdatesTable.createdAt,
      })
      .from(lpQuarterlyUpdatesTable)
      .orderBy(desc(lpQuarterlyUpdatesTable.year), desc(lpQuarterlyUpdatesTable.quarter));

    res.json({ updates });
  } catch {
    res.status(500).json({ error: "Failed to fetch updates" });
  }
});

router.post("/mp/quarterly-updates", requireManagingPartner, async (req, res) => {
  try {
    const {
      quarter, year, title, body, tvpi, dpi, irr, nav,
      totalDeployedCad, portfolioCount, isPublished,
    } = req.body;
    if (!quarter || !year || !title || !body) {
      return res.status(400).json({ error: "quarter, year, title and body are required" });
    }

    const [update] = await db.insert(lpQuarterlyUpdatesTable).values({
      quarter: Number(quarter),
      year: Number(year),
      title,
      body,
      tvpi: tvpi || null,
      dpi: dpi || null,
      irr: irr || null,
      nav: nav || null,
      totalDeployedCad: totalDeployedCad || null,
      portfolioCount: portfolioCount ? Number(portfolioCount) : null,
      isPublished: isPublished ?? false,
      publishedAt: isPublished ? new Date() : null,
      createdById: req.user!.userId,
    }).returning();

    res.status(201).json({ update });
  } catch {
    res.status(500).json({ error: "Failed to create quarterly update" });
  }
});

router.put("/mp/quarterly-updates/:id", requireManagingPartner, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const {
      title, body, tvpi, dpi, irr, nav, totalDeployedCad, portfolioCount, isPublished,
    } = req.body;

    const updates: Partial<typeof lpQuarterlyUpdatesTable.$inferInsert> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (body !== undefined) updates.body = body;
    if (tvpi !== undefined) updates.tvpi = tvpi;
    if (dpi !== undefined) updates.dpi = dpi;
    if (irr !== undefined) updates.irr = irr;
    if (nav !== undefined) updates.nav = nav;
    if (totalDeployedCad !== undefined) updates.totalDeployedCad = totalDeployedCad;
    if (portfolioCount !== undefined) updates.portfolioCount = Number(portfolioCount);
    if (isPublished !== undefined) {
      updates.isPublished = isPublished;
      if (isPublished) updates.publishedAt = new Date();
    }

    const [updated] = await db.update(lpQuarterlyUpdatesTable).set(updates)
      .where(eq(lpQuarterlyUpdatesTable.id, id)).returning();

    res.json({ update: updated });
  } catch {
    res.status(500).json({ error: "Failed to update quarterly update" });
  }
});

router.delete("/mp/quarterly-updates/:id", requireManagingPartner, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    await db.delete(lpQuarterlyUpdatesTable).where(eq(lpQuarterlyUpdatesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete update" });
  }
});

export default router;
