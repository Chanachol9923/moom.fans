import "server-only";
import { admin } from "@/lib/supabase/admin";
import type { Bucket } from "./storage";

export async function signedDownloadUrl(
  bucket: Bucket,
  path: string,
  expiresInSeconds: number,
  downloadName?: string,
): Promise<string> {
  const { data, error } = await admin()
    .storage.from(bucket)
    .createSignedUrl(path, expiresInSeconds, downloadName ? { download: downloadName } : undefined);
  if (error || !data) throw new Error(`storage: could not sign ${bucket}/${path}: ${error?.message}`);
  return data.signedUrl;
}

/** Lets the browser upload straight to storage (skips the ~4.5 MB serverless body limit). */
export async function signedUploadUrl(bucket: Bucket, path: string) {
  const { data, error } = await admin().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`storage: could not create upload url: ${error?.message}`);
  return { path: data.path, token: data.token, signedUrl: data.signedUrl };
}

export async function putObject(bucket: Bucket, path: string, body: ArrayBuffer | Blob, contentType: string) {
  const { error } = await admin().storage.from(bucket).upload(path, body, { contentType, upsert: false });
  if (error) throw new Error(`storage: upload failed: ${error.message}`);
}

export async function objectExists(bucket: Bucket, path: string): Promise<boolean> {
  const { data } = await admin().storage.from(bucket).exists(path);
  return Boolean(data);
}

export async function removeObjects(bucket: Bucket, paths: string[]) {
  const list = paths.filter(Boolean);
  if (list.length) await admin().storage.from(bucket).remove(list);
}
