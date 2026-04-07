import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, judgeAssignmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required but not set.");
}
const JWT_SECRET: string = process.env.JWT_SECRET;

export interface JwtPayload {
  userId: number;
  email: string;
  role: "SuperAdmin" | "Admin" | "Judge" | "Founder" | "IC" | "ManagingPartner" | "LP";
  judgeId: number | null;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12);
}

export async function checkPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing token" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const role = req.user?.role;
    if (role !== "Admin" && role !== "SuperAdmin") {
      res.status(403).json({ error: "Forbidden", message: "Admin access required" });
      return;
    }
    next();
  });
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "SuperAdmin") {
    res.status(403).json({ error: "Forbidden", message: "Super Admin access required" });
    return;
  }
  next();
}

export function requireIC(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const role = req.user?.role;
    if (role !== "IC" && role !== "ManagingPartner" && role !== "SuperAdmin") {
      res.status(403).json({ error: "Forbidden", message: "IC access required" });
      return;
    }
    next();
  });
}

export function requireLP(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const role = req.user?.role;
    if (role !== "LP" && role !== "ManagingPartner" && role !== "SuperAdmin") {
      res.status(403).json({ error: "Forbidden", message: "LP access required" });
      return;
    }
    next();
  });
}

export function requireManagingPartner(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const role = req.user?.role;
    if (role !== "ManagingPartner" && role !== "SuperAdmin") {
      res.status(403).json({ error: "Forbidden", message: "Managing Partner access required" });
      return;
    }
    next();
  });
}

export function requireFounder(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== "Founder") {
      res.status(403).json({ error: "Forbidden", message: "Founder access required" });
      return;
    }
    next();
  });
}

export async function getAssignments(judgeId: number) {
  const rows = await db
    .select({
      programId: judgeAssignmentsTable.programId,
      cohortId: judgeAssignmentsTable.cohortId,
    })
    .from(judgeAssignmentsTable)
    .where(
      and(
        eq(judgeAssignmentsTable.judgeId, judgeId),
        eq(judgeAssignmentsTable.active, true),
      ),
    );
  return rows;
}

export async function checkJudgeAccess(
  judgeId: number,
  programId: string,
  cohortId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: judgeAssignmentsTable.id })
    .from(judgeAssignmentsTable)
    .where(
      and(
        eq(judgeAssignmentsTable.judgeId, judgeId),
        eq(judgeAssignmentsTable.programId, programId),
        eq(judgeAssignmentsTable.cohortId, cohortId),
        eq(judgeAssignmentsTable.active, true),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
