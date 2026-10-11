import { Hono } from "hono";
import { imageSize } from "image-size";
import { canEdit, getBug } from "./bugs";
import {
  audit,
  fail,
  id,
  now,
  rateLimit,
  requireUser,
  row,
  stmt,
} from "./core";
import type { AppEnv } from "./types";
const attachments = new Hono<AppEnv>();
const MAX = 5 * 1024 * 1024;
export function imageType(bytes: Uint8Array) {
  try {
    const result = imageSize(bytes);
    if (
      !result.width ||
      !result.height ||
      result.width > 16000 ||
      result.height > 16000 ||
      result.width * result.height > 40000000
    )
      return null;
    const types: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      webp: "image/webp",
    };
    return types[result.type ?? ""] ?? null;
  } catch {
    return null;
  }
}
attachments.post("/:id/attachments", async (c) => {
  const u = requireUser(c);
  const b = await getBug(c, c.req.param("id"));
  if (!canEdit(c, b))
    fail(
      403,
      "FORBIDDEN",
      "Only the reporter or an administrator can attach images.",
    );
  await rateLimit(c, "attachment", 20, 3600, u.id);
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > MAX)
    fail(400, "INVALID_FILE", "Choose an image of at most 5 MiB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = imageType(bytes);
  if (!type)
    fail(
      415,
      "UNSUPPORTED_IMAGE",
      "Only PNG, JPEG and WebP images are accepted.",
    );
  const attachmentId = id(),
    key = `bugs/${b.id}/${attachmentId}`;
  const name =
    file.name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120) || "image";
  // Reserve a row with a transaction-safe per-report quota before writing storage.
  const result = await stmt(
    c.env,
    "INSERT INTO attachments(id,bug_id,uploader_id,object_key,name,size,content_type,created_at) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT count(*) FROM attachments WHERE bug_id=?)<5 RETURNING id",
    attachmentId,
    b.id,
    u.id,
    key,
    name,
    file.size,
    type,
    now(),
    b.id,
  ).all();
  if (!result.results.length)
    fail(
      400,
      "ATTACHMENT_LIMIT",
      "A report can have at most five attachments.",
    );
  try {
    await c.env.ATTACHMENTS.put(key, bytes, {
      httpMetadata: { contentType: type },
    });
  } catch {
    await stmt(c.env, "DELETE FROM attachments WHERE id=?", attachmentId).run();
    fail(503, "UPLOAD_FAILED", "Upload failed. Please try again.");
  }
  await audit(c.env, u.id, "attachment_created", "bug", b.id).run();
  return c.json(
    {
      id: attachmentId,
      name,
      size: file.size,
      contentType: type,
      url: `/api/v1/bugs/${b.id}/attachments/${attachmentId}`,
    },
    201,
  );
});
attachments.get("/:id/attachments/:attachmentId", async (c) => {
  const b = await getBug(c, c.req.param("id"));
  const a = await row<{
    object_key: string;
    content_type: string;
    name: string;
  }>(
    c.env,
    "SELECT object_key,content_type,name FROM attachments WHERE id=? AND bug_id=?",
    c.req.param("attachmentId"),
    b.id,
  );
  if (!a) fail(404, "NOT_FOUND", "Attachment not found.");
  const object = await c.env.ATTACHMENTS.get(a.object_key);
  if (!object) fail(404, "NOT_FOUND", "Attachment not found.");
  return new Response(object.body, {
    headers: {
      "Content-Type": a.content_type,
      "Content-Disposition": `attachment; filename="${a.name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Referrer-Policy": "no-referrer",
    },
  });
});
attachments.delete("/:id/attachments/:attachmentId", async (c) => {
  const u = requireUser(c);
  const b = await getBug(c, c.req.param("id"));
  if (!canEdit(c, b))
    fail(403, "FORBIDDEN", "You cannot delete this attachment.");
  const a = await row<{ object_key: string }>(
    c.env,
    "SELECT object_key FROM attachments WHERE id=? AND bug_id=?",
    c.req.param("attachmentId"),
    b.id,
  );
  if (!a) fail(404, "NOT_FOUND", "Attachment not found.");
  await c.env.ATTACHMENTS.delete(a.object_key);
  await c.env.DB.batch([
    stmt(
      c.env,
      "DELETE FROM attachments WHERE id=?",
      c.req.param("attachmentId"),
    ),
    audit(c.env, u.id, "attachment_deleted", "bug", b.id),
  ]);
  return c.json({ message: "Attachment deleted." });
});
export default attachments;
