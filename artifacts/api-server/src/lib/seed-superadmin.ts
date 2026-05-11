/**
 * One-time bootstrap utility for the Super Admin account.
 * 
 * Run this as a one-time command via:
 *   SUPER_ADMIN_PIN=<pin> npx tsx src/lib/seed-superadmin.ts
 * 
 * The PIN is read from the SUPER_ADMIN_PIN environment variable.
 * It is NOT called automatically on server startup to avoid
 * hardcoded credentials in any tracked configuration.
 */
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPin } from "./auth";
import { logger } from "./logger";

const SUPER_ADMIN_EMAIL = "team@startling-capital.com";

export async function seedSuperAdmin(): Promise<void> {
  const pin = process.env.SUPER_ADMIN_PIN;
  if (!pin) {
    logger.warn(
      "SUPER_ADMIN_PIN is not set — skipping Super Admin bootstrap. " +
      "Set this secret via environment management to provision the account."
    );
    return;
  }

  try {
    const existing = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.email, SUPER_ADMIN_EMAIL))
      .limit(1);

    if (existing.length > 0) {
      logger.info(
        "Super Admin account already exists — skipping bootstrap. " +
        "To reset the PIN, update it directly via the user management interface."
      );
      return;
    }

    const pinHash = await hashPin(pin);
    await db.insert(usersTable).values({
      email: SUPER_ADMIN_EMAIL,
      name: "Startling Capital Team",
      role: "SuperAdmin",
      pinHash,
      active: true,
    });

    logger.info("Super Admin account provisioned: team@startling-capital.com");
  } catch (err) {
    logger.error({ err }, "Failed to provision Super Admin account");
    process.exit(1);
  }
}

// Runnable as a script: tsx src/lib/seed-superadmin.ts
if (import.meta.url === new URL(process.argv[1], import.meta.url).href ||
    process.argv[1]?.endsWith("seed-superadmin.ts") ||
    process.argv[1]?.endsWith("seed-superadmin.mjs")) {
  seedSuperAdmin().then(() => {
    process.exit(0);
  }).catch((err) => {
    logger.error({ err }, "Fatal error in seed-superadmin");
    process.exit(1);
  });
}


