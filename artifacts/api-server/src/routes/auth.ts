import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, foundersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { signToken, checkPin, hashPin, getAssignments, requireAuth } from "../lib/auth";
import { sendWelcomeEmail } from "../lib/email";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      pin,
      companyName,
      companyWebsite,
      sector,
      stage,
      country,
      region,
      city,
      bio,
      linkedinUrl,
    } = req.body as {
      name?: string;
      email?: string;
      pin?: string;
      companyName?: string;
      companyWebsite?: string;
      sector?: string;
      stage?: string;
      country?: string;
      region?: string;
      city?: string;
      bio?: string;
      linkedinUrl?: string;
    };

    if (!name || !email || !pin) {
      res.status(400).json({ error: "BadRequest", message: "Name, email, and PIN are required" });
      return;
    }

    if (pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
      res.status(400).json({ error: "BadRequest", message: "PIN must be 4-8 digits" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Conflict", message: "An account with this email already exists" });
      return;
    }

    const pinHash = await hashPin(pin);

    // Create user with Founder role
    const [newUser] = await db.insert(usersTable).values({
      email: normalizedEmail,
      name: name.trim(),
      role: "Founder",
      pinHash,
      active: true,
    }).returning();

    // Create founder profile
    await db.insert(foundersTable).values({
      userId: newUser.id,
      bio: bio || null,
      country: country || null,
      region: region || null,
      city: city || null,
      linkedinUrl: linkedinUrl || null,
      companyName: companyName || null,
      companyWebsite: companyWebsite || null,
      sector: sector || null,
      stage: stage || null,
    });

    const payload = {
      userId: newUser.id,
      email: newUser.email,
      role: "Founder" as const,
      judgeId: null,
    };

    const token = signToken(payload);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(newUser.email, newUser.name).catch(() => {});

    res.status(201).json({
      token,
      role: "Founder",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: "Founder",
        judgeId: null,
      },
      allowedAssignments: [],
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "InternalError", message: "Registration failed. Please try again." });
  }
});

router.post("/login", async (req, res) => {
  const { email, pin } = req.body as { email?: string; pin?: string };
  if (!email || !pin) {
    res.status(400).json({ error: "BadRequest", message: "Email and PIN are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.email, email.toLowerCase()), eq(usersTable.active, true)))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid email or PIN" });
    return;
  }

  const valid = await checkPin(pin, user.pinHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid email or PIN" });
    return;
  }

  await db
    .update(usersTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(usersTable.id, user.id));

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role as "Admin" | "Judge" | "Founder",
    judgeId: user.judgeId,
  };

  const token = signToken(payload);

  const allowedAssignments =
    user.role === "Judge" && user.judgeId
      ? await getAssignments(user.judgeId)
      : [];

  res.json({
    token,
    role: user.role,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      judgeId: user.judgeId,
    },
    allowedAssignments,
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const allowedAssignments =
    req.user!.role === "Judge" && req.user!.judgeId
      ? await getAssignments(req.user!.judgeId)
      : [];

  res.json({
    user: req.user,
    allowedAssignments,
  });
});

router.post("/logout", (_req, res) => {
  res.json({ success: true });
});

export default router;
