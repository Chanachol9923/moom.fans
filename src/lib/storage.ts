// File storage behind one small interface. Today it is Supabase Storage; moving
// product files to Cloudflare R2 later means reimplementing these functions only.

export const BUCKETS = {
  publicMedia: "public-media",
  productFiles: "product-files",
  slips: "slips",
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Public URL for something in the public-media bucket. Safe on client and server. */
export function publicMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${BUCKETS.publicMedia}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

/** Object keys are "<owner uid>/<random>-<clean name>". */
export function objectKey(ownerId: string, fileName: string, prefix = ""): string {
  const clean =
    fileName
      .normalize("NFKD")
      .replace(/[^\w.\-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(-80) || "file";
  const rand = Math.random().toString(36).slice(2, 10);
  return `${ownerId}/${prefix ? `${prefix}/` : ""}${rand}-${clean}`;
}
