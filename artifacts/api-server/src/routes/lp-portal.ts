import { Router } from "express";
import { db } from "@workspace/db";
import {
  lpQuarterlyUpdatesTable, lpProfilesTable, usersTable, capitalCallsTable,
  capitalCallAllocationsTable, fundsTable,
} from "@workspace/db";
import { eq, desc, and, sum } from "drizzle-orm";
import { requireAuth, requireLP, requireManagingPartner } from "../lib/auth";

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
        rvpi: lpQuarterlyUpdatesTable.rvpi,
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
        rvpi: lpQuarterlyUpdatesTable.rvpi,
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
      quarter, year, title, body, tvpi, dpi, rvpi, irr, nav,
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
      rvpi: rvpi || null,
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
      title, body, tvpi, dpi, rvpi, irr, nav, totalDeployedCad, portfolioCount, isPublished,
    } = req.body;

    const updates: Partial<typeof lpQuarterlyUpdatesTable.$inferInsert> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (body !== undefined) updates.body = body;
    if (tvpi !== undefined) updates.tvpi = tvpi;
    if (dpi !== undefined) updates.dpi = dpi;
    if (rvpi !== undefined) updates.rvpi = rvpi;
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

router.get("/lp/fund-summary", requireLP, async (req, res) => {
  try {
    const [lpProfile] = await db
      .select()
      .from(lpProfilesTable)
      .where(eq(lpProfilesTable.userId, req.user!.userId));

    if (!lpProfile) return res.json({ profile: null, capitalCalls: [], funds: [] });

    const capitalCalls = await db
      .select({
        callId: capitalCallsTable.id,
        title: capitalCallsTable.title,
        callDate: capitalCallsTable.callDate,
        dueDate: capitalCallsTable.dueDate,
        status: capitalCallsTable.status,
        allocatedAmountCad: capitalCallAllocationsTable.allocatedAmountCad,
        paidAt: capitalCallAllocationsTable.paidAt,
      })
      .from(capitalCallAllocationsTable)
      .leftJoin(capitalCallsTable, eq(capitalCallAllocationsTable.capitalCallId, capitalCallsTable.id))
      .where(eq(capitalCallAllocationsTable.lpProfileId, lpProfile.id))
      .orderBy(desc(capitalCallsTable.callDate));

    const totalCalled = capitalCalls
      .filter(c => c.paidAt != null)
      .reduce((s, c) => s + parseFloat(c.allocatedAmountCad ?? "0"), 0);

    const funds = await db.select({
      id: fundsTable.id,
      name: fundsTable.name,
      vintage: fundsTable.vintage,
      status: fundsTable.status,
      tvpi: fundsTable.tvpi,
      dpi: fundsTable.dpi,
      rvpi: fundsTable.rvpi,
      irr: fundsTable.irr,
      navCad: fundsTable.navCad,
    }).from(fundsTable).where(eq(fundsTable.isActive, true));

    res.json({
      profile: {
        ...lpProfile,
        totalCalledCad: totalCalled.toFixed(2),
      },
      capitalCalls,
      funds,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch fund summary" });
  }
});

router.get("/lp/k1/:year", requireLP, async (req, res) => {
  try {
    const year = parseInt(String(req.params.year));
    const [lpProfile] = await db
      .select()
      .from(lpProfilesTable)
      .where(eq(lpProfilesTable.userId, req.user!.userId));

    if (!lpProfile) return res.status(404).json({ error: "LP profile not found" });

    res.json({
      placeholder: true,
      year,
      lpName: lpProfile.contactName ?? lpProfile.firmName,
      firmName: lpProfile.firmName,
      commitmentCad: lpProfile.commitmentCad,
      message: `K-1 tax document for fiscal year ${year} will be available once the fund administrator finalizes distributions. Please contact the fund manager for an estimated delivery date.`,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch K-1 info" });
  }
});

export default router;
