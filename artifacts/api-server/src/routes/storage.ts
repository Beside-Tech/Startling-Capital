import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAuth } from "../lib/auth";
import { db } from "@workspace/db";
import { dataRoomFilesTable, foundersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type UploadUrlBody = { name: string; size?: number; contentType?: string };

function parseUploadUrlBody(body: any): { success: true; data: UploadUrlBody } | { success: false } {
  if (!body || typeof body.name !== "string") return { success: false };
  return { success: true, data: { name: body.name, size: body.size, contentType: body.contentType } };
}

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload (authenticated users only).
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const parsed = parseUploadUrlBody(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;

    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve private object entities from PRIVATE_OBJECT_DIR.
 * Requires a valid JWT. Enforces ownership/visibility using the data room registry:
 *   - Founders can only access files they own.
 *   - LP can only access files marked isPublic = true.
 *   - IC, ManagingPartner, Admin, SuperAdmin can access any registered file.
 *   - Files not registered in the data room are denied to everyone except Admin/SuperAdmin.
 */
router.get("/storage/objects/*path", requireAuth, async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;

    const user = req.user!;
    const role = user.role;

    const [fileRecord] = await db
      .select({
        id: dataRoomFilesTable.id,
        founderId: dataRoomFilesTable.founderId,
        isPublic: dataRoomFilesTable.isPublic,
        founderUserId: foundersTable.userId,
      })
      .from(dataRoomFilesTable)
      .leftJoin(foundersTable, eq(foundersTable.id, dataRoomFilesTable.founderId))
      .where(eq(dataRoomFilesTable.storageKey, objectPath))
      .limit(1);

    if (!fileRecord) {
      if (role === "Admin" || role === "SuperAdmin") {
        req.log.warn({ objectPath, userId: user.userId }, "Admin accessing unregistered object");
      } else {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    } else {
      let allowed = false;

      if (role === "Admin" || role === "SuperAdmin") {
        allowed = true;
      } else if (role === "IC" || role === "ManagingPartner") {
        allowed = true;
      } else if (role === "LP") {
        allowed = fileRecord.isPublic;
      } else if (role === "Founder") {
        allowed = fileRecord.founderUserId === user.userId;
      }

      if (!allowed) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
