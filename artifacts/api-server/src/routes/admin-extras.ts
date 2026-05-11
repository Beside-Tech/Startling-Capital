/**
 * Admin extra routes:
 * - GET  /api/admin/site-settings           — get all site settings
 * - PUT  /api/admin/site-settings/:key      — update a site setting
 * - GET  /api/admin/founders                — list all founders with programs & export
 * - GET  /api/admin/founders/export         — CSV export of all founders
 * - GET  /api/admin/testimonials            — all testimonials (pending + active)
 * - PUT  /api/admin/testimonials/:id        — approve/activate/reorder testimonial
 * - DELETE /api/admin/testimonials/:id      — delete a testimonial
 * - GET  /api/admin/testimonials/:id/download — download testimonial JSON with founder details
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  siteSettingsTable,
  testimonialsTable,
  foundersTable,
  usersTable,
  applicationsTable,
  programsTable,
} from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = Router();

// ─── Site Settings ────────────────────────────────────────────────────────────

router.get("/admin/site-settings", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const settings = await db.select().from(siteSettingsTable).orderBy(siteSettingsTable.key);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Failed to load settings" });
  }
});

router.put("/admin/site-settings/:key", requireAuth, requireAdmin, async (req, res) => {
  const key = String(req.params.key);
  const { value } = req.body as { value: string };

  if (!value && value !== "") {
    return res.status(400).json({ error: "value is required" });
  }

  try {
    await db
      .update(siteSettingsTable)
      .set({ value, updatedAt: new Date() })
      .where(eq(siteSettingsTable.key, key));
    res.json({ key, value });
  } catch (err) {
    res.status(500).json({ error: "Failed to update setting" });
  }
});

// ─── Founder Management ───────────────────────────────────────────────────────

router.get("/admin/founders", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const founders = await db
      .select({
        id: foundersTable.id,
        userId: foundersTable.userId,
        name: usersTable.name,
        email: usersTable.email,
        companyName: foundersTable.companyName,
        companyWebsite: foundersTable.companyWebsite,
        sector: foundersTable.sector,
        stage: foundersTable.stage,
        country: foundersTable.country,
        city: foundersTable.city,
        bio: foundersTable.bio,
        linkedinUrl: foundersTable.linkedinUrl,
        avatarUrl: foundersTable.avatarUrl,
        onboardingComplete: foundersTable.onboardingComplete,
        investmentStatus: foundersTable.investmentStatus,
        createdAt: foundersTable.createdAt,
      })
      .from(foundersTable)
      .innerJoin(usersTable, eq(foundersTable.userId, usersTable.id))
      .orderBy(desc(foundersTable.createdAt));

    // Get application counts per founder
    const appCounts = await db
      .select({
        founderId: applicationsTable.founderId,
        count: count(),
      })
      .from(applicationsTable)
      .groupBy(applicationsTable.founderId);

    const appCountMap: Record<number, number> = {};
    appCounts.forEach(a => {
      if (a.founderId) appCountMap[a.founderId] = Number(a.count);
    });

    const result = founders.map(f => ({
      ...f,
      applicationCount: appCountMap[f.id] ?? 0,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to load founders" });
  }
});

router.get("/admin/founders/export", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const founders = await db
      .select({
        id: foundersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        companyName: foundersTable.companyName,
        companyWebsite: foundersTable.companyWebsite,
        sector: foundersTable.sector,
        stage: foundersTable.stage,
        country: foundersTable.country,
        city: foundersTable.city,
        bio: foundersTable.bio,
        linkedinUrl: foundersTable.linkedinUrl,
        onboardingComplete: foundersTable.onboardingComplete,
        createdAt: foundersTable.createdAt,
      })
      .from(foundersTable)
      .innerJoin(usersTable, eq(foundersTable.userId, usersTable.id))
      .orderBy(desc(foundersTable.createdAt));

    const headers = [
      "ID", "Name", "Email", "Company", "Website", "Sector", "Stage",
      "Country", "City", "Bio", "LinkedIn", "Onboarding Complete", "Joined"
    ];

    const csvRows = [
      headers.join(","),
      ...founders.map(f => [
        f.id,
        `"${(f.name ?? "").replace(/"/g, '""')}"`,
        `"${(f.email ?? "").replace(/"/g, '""')}"`,
        `"${(f.companyName ?? "").replace(/"/g, '""')}"`,
        `"${(f.companyWebsite ?? "").replace(/"/g, '""')}"`,
        `"${(f.sector ?? "").replace(/"/g, '""')}"`,
        `"${(f.stage ?? "").replace(/"/g, '""')}"`,
        `"${(f.country ?? "").replace(/"/g, '""')}"`,
        `"${(f.city ?? "").replace(/"/g, '""')}"`,
        `"${(f.bio ?? "").replace(/"/g, '""')}"`,
        `"${(f.linkedinUrl ?? "").replace(/"/g, '""')}"`,
        f.onboardingComplete ? "Yes" : "No",
        f.createdAt ? new Date(f.createdAt).toISOString().split("T")[0] : "",
      ].join(","))
    ];

    const csv = csvRows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="Startling Capital-founders-${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: "Failed to export founders" });
  }
});

// ─── Testimonials Management ──────────────────────────────────────────────────

router.get("/admin/testimonials", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const testimonials = await db
      .select({
        id: testimonialsTable.id,
        content: testimonialsTable.content,
        programName: testimonialsTable.programName,
        cohortYear: testimonialsTable.cohortYear,
        isActive: testimonialsTable.isActive,
        displayOrder: testimonialsTable.displayOrder,
        submittedAt: testimonialsTable.submittedAt,
        approvedAt: testimonialsTable.approvedAt,
        founderId: testimonialsTable.founderId,
        founderName: usersTable.name,
        founderEmail: usersTable.email,
        founderAvatar: foundersTable.avatarUrl,
        founderCompany: foundersTable.companyName,
        founderCity: foundersTable.city,
        founderCountry: foundersTable.country,
        founderSector: foundersTable.sector,
      })
      .from(testimonialsTable)
      .innerJoin(foundersTable, eq(testimonialsTable.founderId, foundersTable.id))
      .innerJoin(usersTable, eq(foundersTable.userId, usersTable.id))
      .orderBy(desc(testimonialsTable.submittedAt));

    res.json(testimonials);
  } catch (err) {
    res.status(500).json({ error: "Failed to load testimonials" });
  }
});

router.put("/admin/testimonials/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { isActive, displayOrder } = req.body as { isActive?: boolean; displayOrder?: number };

  try {
    const updates: Partial<typeof testimonialsTable.$inferInsert> = { updatedAt: new Date() };
    if (typeof isActive === "boolean") {
      updates.isActive = isActive;
      if (isActive) updates.approvedAt = new Date();
    }
    if (typeof displayOrder === "number") updates.displayOrder = displayOrder;

    await db
      .update(testimonialsTable)
      .set(updates)
      .where(eq(testimonialsTable.id, id));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update testimonial" });
  }
});

router.delete("/admin/testimonials/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  try {
    await db.delete(testimonialsTable).where(eq(testimonialsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete testimonial" });
  }
});

export default router;

