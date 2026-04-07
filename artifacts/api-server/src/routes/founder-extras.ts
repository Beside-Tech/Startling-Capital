/**
 * Founder extra routes:
 * - GET  /api/founder/testimonials   — get my testimonials
 * - POST /api/founder/testimonials   — submit a new testimonial
 * - PUT  /api/founder/testimonials/:id — edit my testimonial (if not yet approved)
 * - DELETE /api/founder/testimonials/:id — delete my testimonial
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  testimonialsTable,
  foundersTable,
  usersTable,
  programsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

// Helper: get founderId from userId
async function getFounderId(userId: number): Promise<number | null> {
  const [f] = await db.select({ id: foundersTable.id }).from(foundersTable).where(eq(foundersTable.userId, userId));
  return f?.id ?? null;
}

// GET /api/founder/testimonials
router.get("/founder/testimonials", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const founderId = await getFounderId(userId);
    if (!founderId) return res.status(404).json({ error: "Founder profile not found" });

    const testimonials = await db
      .select()
      .from(testimonialsTable)
      .where(eq(testimonialsTable.founderId, founderId))
      .orderBy(testimonialsTable.submittedAt);

    res.json(testimonials);
  } catch (err) {
    res.status(500).json({ error: "Failed to load testimonials" });
  }
});

// POST /api/founder/testimonials
router.post("/founder/testimonials", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { content, programName, cohortYear } = req.body as {
    content: string;
    programName?: string;
    cohortYear?: string;
  };

  if (!content?.trim()) {
    return res.status(400).json({ error: "content is required" });
  }

  try {
    const founderId = await getFounderId(userId);
    if (!founderId) return res.status(404).json({ error: "Founder profile not found" });

    const [testimonial] = await db
      .insert(testimonialsTable)
      .values({
        founderId,
        content: content.trim(),
        programName: programName ?? null,
        cohortYear: cohortYear ?? null,
        isActive: false,
        displayOrder: 0,
      })
      .returning();

    res.status(201).json(testimonial);
  } catch (err) {
    res.status(500).json({ error: "Failed to submit testimonial" });
  }
});

// PUT /api/founder/testimonials/:id
router.put("/founder/testimonials/:id", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(String(req.params.id));
  const { content, programName, cohortYear } = req.body as {
    content?: string;
    programName?: string;
    cohortYear?: string;
  };

  try {
    const founderId = await getFounderId(userId);
    if (!founderId) return res.status(404).json({ error: "Founder profile not found" });

    // Only allow editing if not yet approved
    const [existing] = await db
      .select()
      .from(testimonialsTable)
      .where(and(eq(testimonialsTable.id, id), eq(testimonialsTable.founderId, founderId)));

    if (!existing) return res.status(404).json({ error: "Testimonial not found" });
    if (existing.isActive) return res.status(400).json({ error: "Cannot edit an approved testimonial" });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (content?.trim()) updates.content = content.trim();
    if (programName !== undefined) updates.programName = programName || null;
    if (cohortYear !== undefined) updates.cohortYear = cohortYear || null;

    await db
      .update(testimonialsTable)
      .set(updates as any)
      .where(eq(testimonialsTable.id, id));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update testimonial" });
  }
});

// DELETE /api/founder/testimonials/:id
router.delete("/founder/testimonials/:id", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(String(req.params.id));

  try {
    const founderId = await getFounderId(userId);
    if (!founderId) return res.status(404).json({ error: "Founder profile not found" });

    await db
      .delete(testimonialsTable)
      .where(and(eq(testimonialsTable.id, id), eq(testimonialsTable.founderId, founderId)));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete testimonial" });
  }
});

// GET /api/founder/profile — get my founder profile
router.get("/founder/profile", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [row] = await db
      .select({
        id: foundersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        companyName: foundersTable.companyName,
        companyWebsite: foundersTable.companyWebsite,
        sector: foundersTable.sector,
        stage: foundersTable.stage,
        country: foundersTable.country,
        region: foundersTable.region,
        city: foundersTable.city,
        bio: foundersTable.bio,
        linkedinUrl: foundersTable.linkedinUrl,
        avatarUrl: foundersTable.avatarUrl,
        onboardingComplete: foundersTable.onboardingComplete,
        createdAt: foundersTable.createdAt,
      })
      .from(foundersTable)
      .innerJoin(usersTable, eq(usersTable.id, foundersTable.userId))
      .where(eq(foundersTable.userId, userId))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Founder profile not found" });
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// PUT /api/founder/profile — update my founder profile
router.put("/founder/profile", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const {
    companyName, companyWebsite, sector, stage,
    country, region, city, bio, linkedinUrl,
  } = req.body as {
    companyName?: string; companyWebsite?: string; sector?: string; stage?: string;
    country?: string; region?: string; city?: string; bio?: string; linkedinUrl?: string;
  };

  try {
    const founderId = await getFounderId(userId);
    if (!founderId) return res.status(404).json({ error: "Founder profile not found" });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (companyName !== undefined) updates.companyName = companyName;
    if (companyWebsite !== undefined) updates.companyWebsite = companyWebsite;
    if (sector !== undefined) updates.sector = sector;
    if (stage !== undefined) updates.stage = stage;
    if (country !== undefined) updates.country = country;
    if (region !== undefined) updates.region = region;
    if (city !== undefined) updates.city = city;
    if (bio !== undefined) updates.bio = bio;
    if (linkedinUrl !== undefined) updates.linkedinUrl = linkedinUrl;

    await db.update(foundersTable).set(updates as any).where(eq(foundersTable.id, founderId));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
