import { Router } from "express";
import { db } from "@workspace/db";
import { lpProfilesTable, lpAccountsTable, usersTable, capitalCallAllocationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireManagingPartner } from "../lib/auth";

const router = Router();

router.get("/mp/lp-accounts", requireManagingPartner, async (_req, res) => {
  try {
    const accounts = await db.select({
      id: lpProfilesTable.id,
      userId: lpProfilesTable.userId,
      firmName: lpProfilesTable.firmName,
      contactName: lpProfilesTable.contactName,
      commitmentCad: lpProfilesTable.commitmentCad,
      capitalCalledCad: lpProfilesTable.capitalCalledCad,
      investorType: lpProfilesTable.investorType,
      active: lpProfilesTable.active,
      notes: lpProfilesTable.notes,
      createdAt: lpProfilesTable.createdAt,
      userEmail: usersTable.email,
      userName: usersTable.name,
    })
      .from(lpProfilesTable)
      .leftJoin(usersTable, eq(lpProfilesTable.userId, usersTable.id))
      .orderBy(desc(lpProfilesTable.createdAt));

    res.json({ accounts });
  } catch {
    res.status(500).json({ error: "Failed to fetch LP accounts" });
  }
});

router.get("/mp/lp-accounts/:id", requireManagingPartner, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const [account] = await db.select({
      id: lpProfilesTable.id,
      userId: lpProfilesTable.userId,
      firmName: lpProfilesTable.firmName,
      contactName: lpProfilesTable.contactName,
      commitmentCad: lpProfilesTable.commitmentCad,
      capitalCalledCad: lpProfilesTable.capitalCalledCad,
      investorType: lpProfilesTable.investorType,
      active: lpProfilesTable.active,
      notes: lpProfilesTable.notes,
      createdAt: lpProfilesTable.createdAt,
      updatedAt: lpProfilesTable.updatedAt,
      userEmail: usersTable.email,
      userName: usersTable.name,
    })
      .from(lpProfilesTable)
      .leftJoin(usersTable, eq(lpProfilesTable.userId, usersTable.id))
      .where(eq(lpProfilesTable.id, id))
      .limit(1);

    if (!account) return res.status(404).json({ error: "LP account not found" });

    const capitalCallHistory = await db.select()
      .from(capitalCallAllocationsTable)
      .where(eq(capitalCallAllocationsTable.lpProfileId, id))
      .orderBy(desc(capitalCallAllocationsTable.createdAt));

    res.json({ account, capitalCallHistory });
  } catch {
    res.status(500).json({ error: "Failed to fetch LP account" });
  }
});

router.post("/mp/lp-accounts", requireManagingPartner, async (req, res) => {
  try {
    const {
      userId, firmName, contactName, commitmentCad, investorType, active, notes,
    } = req.body;
    if (!firmName || !contactName) {
      return res.status(400).json({ error: "firmName and contactName are required" });
    }

    if (!userId) return res.status(400).json({ error: "userId is required to link an LP account to a user" });
    const [account] = await db.insert(lpProfilesTable).values({
      userId: Number(userId),
      firmName,
      contactName,
      commitmentCad: commitmentCad || null,
      investorType: investorType || "individual",
      active: active ?? true,
      notes: notes || null,
    }).returning();

    res.status(201).json({ account });
  } catch {
    res.status(500).json({ error: "Failed to create LP account" });
  }
});

router.put("/mp/lp-accounts/:id", requireManagingPartner, async (req, res) => {
  try {
    const id = Number(String(req.params.id));
    const { firmName, contactName, commitmentCad, capitalCalledCad, investorType, active, notes } = req.body;
    const updates: Partial<typeof lpProfilesTable.$inferInsert> = { updatedAt: new Date() };
    if (firmName !== undefined) updates.firmName = firmName;
    if (contactName !== undefined) updates.contactName = contactName;
    if (commitmentCad !== undefined) updates.commitmentCad = commitmentCad;
    if (capitalCalledCad !== undefined) updates.capitalCalledCad = capitalCalledCad;
    if (investorType !== undefined) updates.investorType = investorType;
    if (active !== undefined) updates.active = active;
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db.update(lpProfilesTable).set(updates)
      .where(eq(lpProfilesTable.id, id)).returning();

    if (!updated) return res.status(404).json({ error: "LP account not found" });
    res.json({ account: updated });
  } catch {
    res.status(500).json({ error: "Failed to update LP account" });
  }
});

// ── Per-fund LP account management ──────────────────────────────────────────

// GET /api/mp/funds/:fundId/lp-accounts — list LP accounts for a fund
router.get("/mp/funds/:fundId/lp-accounts", requireManagingPartner, async (req, res) => {
  try {
    const fundId = Number(String(req.params.fundId));
    const accounts = await db.select({
      id: lpAccountsTable.id,
      lpProfileId: lpAccountsTable.lpProfileId,
      fundId: lpAccountsTable.fundId,
      commitmentCad: lpAccountsTable.commitmentCad,
      capitalCalledCad: lpAccountsTable.capitalCalledCad,
      distributedCapitalCad: lpAccountsTable.distributedCapitalCad,
      status: lpAccountsTable.status,
      notes: lpAccountsTable.notes,
      createdAt: lpAccountsTable.createdAt,
      firmName: lpProfilesTable.firmName,
      contactName: lpProfilesTable.contactName,
      investorType: lpProfilesTable.investorType,
      userEmail: usersTable.email,
      userName: usersTable.name,
    })
      .from(lpAccountsTable)
      .leftJoin(lpProfilesTable, eq(lpAccountsTable.lpProfileId, lpProfilesTable.id))
      .leftJoin(usersTable, eq(lpProfilesTable.userId, usersTable.id))
      .where(eq(lpAccountsTable.fundId, fundId))
      .orderBy(desc(lpAccountsTable.createdAt));

    res.json({ accounts });
  } catch {
    res.status(500).json({ error: "Failed to fetch LP accounts for fund" });
  }
});

// POST /api/mp/funds/:fundId/lp-accounts — create LP account in a fund
router.post("/mp/funds/:fundId/lp-accounts", requireManagingPartner, async (req, res) => {
  try {
    const fundId = Number(String(req.params.fundId));
    const { lpProfileId, commitmentCad, capitalCalledCad, distributedCapitalCad, status, notes } = req.body;
    if (!lpProfileId) return res.status(400).json({ error: "lpProfileId is required" });

    const [account] = await db.insert(lpAccountsTable).values({
      lpProfileId: Number(lpProfileId),
      fundId,
      commitmentCad: commitmentCad || null,
      capitalCalledCad: capitalCalledCad || "0",
      distributedCapitalCad: distributedCapitalCad || "0",
      status: status || "active",
      notes: notes || null,
    }).returning();

    res.status(201).json({ account });
  } catch {
    res.status(500).json({ error: "Failed to create LP account for fund" });
  }
});

// PUT /api/mp/funds/:fundId/lp-accounts/:accountId — update LP account
router.put("/mp/funds/:fundId/lp-accounts/:accountId", requireManagingPartner, async (req, res) => {
  try {
    const accountId = Number(String(req.params.accountId));
    const { commitmentCad, capitalCalledCad, distributedCapitalCad, status, notes } = req.body;
    const updates: Partial<typeof lpAccountsTable.$inferInsert> = { updatedAt: new Date() };
    if (commitmentCad !== undefined) updates.commitmentCad = commitmentCad;
    if (capitalCalledCad !== undefined) updates.capitalCalledCad = capitalCalledCad;
    if (distributedCapitalCad !== undefined) updates.distributedCapitalCad = distributedCapitalCad;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db.update(lpAccountsTable).set(updates)
      .where(eq(lpAccountsTable.id, accountId)).returning();

    if (!updated) return res.status(404).json({ error: "LP fund account not found" });
    res.json({ account: updated });
  } catch {
    res.status(500).json({ error: "Failed to update LP fund account" });
  }
});

// DELETE /api/mp/funds/:fundId/lp-accounts/:accountId
router.delete("/mp/funds/:fundId/lp-accounts/:accountId", requireManagingPartner, async (req, res) => {
  try {
    const accountId = Number(String(req.params.accountId));
    await db.delete(lpAccountsTable).where(eq(lpAccountsTable.id, accountId));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete LP fund account" });
  }
});

export default router;
