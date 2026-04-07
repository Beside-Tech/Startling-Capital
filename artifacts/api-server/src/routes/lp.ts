import { Router } from "express";
import { db } from "@workspace/db";
import {
  investmentsTable, foundersTable, usersTable, dataRoomFilesTable, lpProfilesTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireLP } from "../lib/auth";

const router = Router();

router.get("/lp/portfolio", requireLP, async (req, res) => {
  try {
    const portfolio = await db.select({
      id: investmentsTable.id,
      startupName: investmentsTable.startupName,
      amountCad: investmentsTable.amountCad,
      amountUsd: investmentsTable.amountUsd,
      equityPct: investmentsTable.equityPct,
      instrument: investmentsTable.instrument,
      status: investmentsTable.status,
      investmentDate: investmentsTable.investmentDate,
      roundName: investmentsTable.roundName,
      sector: foundersTable.sector,
      stage: foundersTable.stage,
      country: foundersTable.country,
    })
      .from(investmentsTable)
      .leftJoin(foundersTable, eq(investmentsTable.founderId, foundersTable.id))
      .where(eq(investmentsTable.status, "active"))
      .orderBy(desc(investmentsTable.investmentDate));

    const summary = {
      totalCompanies: portfolio.length,
      totalDeployedCad: portfolio.reduce((s, i) => s + Number(i.amountCad || 0), 0),
    };

    res.json({ portfolio, summary });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

router.get("/lp/founders", requireLP, async (req, res) => {
  try {
    const founders = await db.select({
      id: foundersTable.id,
      companyName: foundersTable.companyName,
      sector: foundersTable.sector,
      stage: foundersTable.stage,
      country: foundersTable.country,
      bio: foundersTable.bio,
      investmentStatus: foundersTable.investmentStatus,
      name: usersTable.name,
      linkedinUrl: foundersTable.linkedinUrl,
    })
      .from(foundersTable)
      .leftJoin(usersTable, eq(foundersTable.userId, usersTable.id))
      .where(eq(foundersTable.investmentStatus, "portfolio"));

    res.json({ founders });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch founders" });
  }
});

router.get("/lp/data-room/:founderId", requireLP, async (req, res) => {
  try {
    const founderId = Number(String(req.params.founderId));
    const [founder] = await db.select({
      id: foundersTable.id,
      companyName: foundersTable.companyName,
      investmentStatus: foundersTable.investmentStatus,
      name: usersTable.name,
    })
      .from(foundersTable)
      .leftJoin(usersTable, eq(foundersTable.userId, usersTable.id))
      .where(and(
        eq(foundersTable.id, founderId),
        eq(foundersTable.investmentStatus, "portfolio"),
      ))
      .limit(1);

    if (!founder) return res.status(404).json({ error: "Founder not found or not in portfolio" });

    const files = await db.select().from(dataRoomFilesTable)
      .where(and(
        eq(dataRoomFilesTable.founderId, founderId),
        eq(dataRoomFilesTable.isPublic, true),
      ))
      .orderBy(desc(dataRoomFilesTable.uploadedAt));

    res.json({ founder, files });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch data room" });
  }
});

router.get("/lp/profile", requireLP, async (req, res) => {
  try {
    const [profile] = await db.select().from(lpProfilesTable)
      .where(eq(lpProfilesTable.userId, req.user!.userId)).limit(1);
    const [user] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    res.json({ profile: profile || null, user });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch LP profile" });
  }
});

export default router;
