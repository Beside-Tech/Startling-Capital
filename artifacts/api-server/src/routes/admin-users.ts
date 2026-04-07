/**
 * Super-Admin user management routes (SuperAdmin only):
 *
 * GET  /api/admin/users              — list all users (with join date)
 * POST /api/admin/users              — create a new account for any role
 * PUT  /api/admin/users/:id/role     — change a user's role
 * PUT  /api/admin/users/:id/active   — toggle active/inactive
 * DELETE /api/admin/users/:id        — delete a user (blocked if self)
 */
import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { usersTable, foundersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireSuperAdmin, hashPin } from "../lib/auth";

const router = Router();

const VALID_ROLES = ["SuperAdmin", "Admin", "Judge", "Founder", "IC", "ManagingPartner", "LP"] as const;
type ValidRole = typeof VALID_ROLES[number];

// GET /api/admin/users
router.get("/admin/users", requireAuth, requireSuperAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
        active: usersTable.active,
        lastLoginAt: usersTable.lastLoginAt,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    res.json(users);
  } catch {
    res.status(500).json({ error: "Failed to load users" });
  }
});

// POST /api/admin/users — create a new account
router.post("/admin/users", requireAuth, requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  const { name, email, pin, role } = req.body as {
    name?: string;
    email?: string;
    pin?: string;
    role?: string;
  };

  if (!name || !email || !pin || !role) {
    res.status(400).json({ error: "name, email, pin, and role are required" });
    return;
  }

  if (!VALID_ROLES.includes(role as ValidRole)) {
    res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` });
    return;
  }

  if (pin.length < 4) {
    res.status(400).json({ error: "PIN must be at least 4 characters" });
    return;
  }

  try {
    const pinHash = await hashPin(pin);
    const [user] = await db
      .insert(usersTable)
      .values({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: role as ValidRole,
        pinHash,
        active: true,
      })
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
        active: usersTable.active,
        createdAt: usersTable.createdAt,
      });

    res.status(201).json(user);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PUT /api/admin/users/:id/role — change role
router.put("/admin/users/:id/role", requireAuth, requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const selfId = req.user!.userId;
  if (id === selfId) {
    res.status(400).json({ error: "You cannot change your own role" });
    return;
  }

  const { role } = req.body as { role?: string };
  if (!role || !VALID_ROLES.includes(role as ValidRole)) {
    res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` });
    return;
  }

  try {
    const [updated] = await db
      .update(usersTable)
      .set({ role: role as ValidRole })
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id, role: usersTable.role });

    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update role" });
  }
});

// PUT /api/admin/users/:id/active — toggle active status
router.put("/admin/users/:id/active", requireAuth, requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const selfId = req.user!.userId;
  if (id === selfId) {
    res.status(400).json({ error: "You cannot deactivate yourself" });
    return;
  }

  const { active } = req.body as { active?: boolean };
  if (typeof active !== "boolean") {
    res.status(400).json({ error: "active must be a boolean" });
    return;
  }

  try {
    const [updated] = await db
      .update(usersTable)
      .set({ active })
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id, active: usersTable.active });

    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// DELETE /api/admin/users/:id
router.delete("/admin/users/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const selfId = req.user!.userId;
  if (id === selfId) {
    res.status(400).json({ error: "You cannot delete your own account" });
    return;
  }

  try {
    await db.delete(foundersTable).where(eq(foundersTable.userId, id));
    const [deleted] = await db
      .delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id });

    if (!deleted) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
