"use client";
import { objectKey } from "@/lib/storage";
import { browserClient } from "@/lib/supabase/browser";

export type SupabasePublic = { url: string; key: string };

/** Upload into public-media as the signed-in user (RLS keeps it inside their folder). */
export async function uploadPublicMedia(sb: SupabasePublic, userId: string, file: File, folder: string) {
  const path = objectKey(userId, file.name, folder);
  const { error } = await browserClient(sb.url, sb.key)
    .storage.from("public-media")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/** Upload to a signed upload URL minted by the server (used for private product files). */
export async function uploadToSigned(sb: SupabasePublic, bucket: string, path: string, token: string, file: File) {
  const { error } = await browserClient(sb.url, sb.key)
    .storage.from(bucket)
    .uploadToSignedUrl(path, token, file, { contentType: file.type || "application/octet-stream" });
  if (error) throw new Error(error.message);
}
