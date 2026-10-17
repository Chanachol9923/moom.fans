"use client";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Button, Field, Input, Panel, Tag, Textarea } from "@moom/shared/ui/kit";
import { fmt } from "@moom/shared/i18n";
import { useT } from "@moom/shared/i18n/react";
import type { ProductRow } from "@/lib/supabase/database.types";
import { uploadPublicMedia, uploadToSigned, type SupabasePublic } from "@/lib/upload-client";
import {
  attachProductMedia,
  createProduct,
  deleteProduct,
  productFileUploadUrl,
  setProductPublished,
  updateProduct,
  type SaveResult,
} from "../actions";

const MAX_FILE = 50 * 1024 * 1024;

export function NewProduct() {
  const { d } = useT();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<SaveResult & { id?: string }, FormData>(
    async (prev, form) => {
      const r = await createProduct(prev, form);
      if (r.ok) setOpen(false);
      return r;
    },
    { ok: false },
  );
  if (!open) {
    return (
      <div>
        <Button variant="primary" onClick={() => setOpen(true)}>
          + {d.products.new}
        </Button>
      </div>
    );
  }
  return (
    <Panel title={d.products.new} raised>
      <form action={action} className="grid gap-x-5 sm:grid-cols-[1fr_160px]">
        <Field label={d.products.name} htmlFor="np-title">
          <Input id="np-title" name="title" required maxLength={120} autoFocus />
        </Field>
        <Field label={d.products.price} htmlFor="np-price">
          <Input id="np-price" name="price" type="number" min={1} step="1" required />
        </Field>
        <div className="sm:col-span-2">
          <Field label={d.products.description} htmlFor="np-desc">
            <Textarea id="np-desc" name="description" maxLength={2000} rows={3} />
          </Field>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? d.common.loading : d.common.add}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {d.common.cancel}
          </Button>
          {state.error && <span className="self-center text-tomato">{d.common.error}</span>}
        </div>
      </form>
    </Panel>
  );
}

export function ProductEditor({
  product: p,
  coverUrl,
  previewUrl,
  sold,
  userId,
  supabase,
}: {
  product: ProductRow;
  coverUrl: string | null;
  previewUrl: string | null;
  sold: number;
  userId: string;
  supabase: SupabasePublic;
  accent: string;
}) {
  const { d } = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<null | "file" | "cover" | "preview">(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  async function upload(kind: "file" | "cover" | "preview", f: File) {
    setError(null);
    if (f.size > MAX_FILE) return setError(d.products.fileHint);
    setBusy(kind);
    try {
      if (kind === "file") {
        const u = await productFileUploadUrl(p.id, f.name);
        await uploadToSigned(supabase, "product-files", u.path, u.token, f);
        await attachProductMedia(p.id, "file", u.path, { name: f.name, size: f.size });
      } else {
        const path = await uploadPublicMedia(supabase, userId, f, `products/${p.id}`);
        await attachProductMedia(p.id, kind, path);
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel
      title={p.title}
      aside={
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-faint">{fmt(d.products.sold, { count: sold })}</span>
          <Tag tone={p.is_published ? "ok" : "muted"}>{p.is_published ? d.products.published : d.products.draft}</Tag>
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-[200px_1fr]">
        <div>
          <div className="px-frame aspect-[4/3] overflow-hidden bg-paper-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- storage CDN */}
            {coverUrl ? <img src={coverUrl} alt="" className="size-full object-cover" /> : null}
          </div>
          <FilePick label={d.products.cover} accept="image/png,image/jpeg,image/webp,image/gif" busy={busy === "cover"} onPick={(f) => upload("cover", f)} />
          <div className="mt-3">
            {previewUrl && <audio src={previewUrl} controls className="h-9 w-full" />}
            <FilePick
              label={d.products.preview}
              accept="audio/mpeg,audio/ogg,audio/wav,audio/webm"
              busy={busy === "preview"}
              onPick={(f) => upload("preview", f)}
            />
          </div>
        </div>

        <form
          action={(form) =>
            startSave(async () => {
              await updateProduct(p.id, {
                title: String(form.get("title")),
                description: String(form.get("description") ?? ""),
                price: Number(form.get("price")),
              });
            })
          }
        >
          <div className="grid gap-x-5 sm:grid-cols-[1fr_140px]">
            <Field label={d.products.name} htmlFor={`t-${p.id}`}>
              <Input id={`t-${p.id}`} name="title" defaultValue={p.title} required maxLength={120} />
            </Field>
            <Field label={d.products.price} htmlFor={`p-${p.id}`}>
              <Input id={`p-${p.id}`} name="price" type="number" min={1} defaultValue={p.price} required />
            </Field>
          </div>
          <Field label={d.products.description} htmlFor={`d-${p.id}`}>
            <Textarea id={`d-${p.id}`} name="description" defaultValue={p.description} rows={3} maxLength={2000} />
          </Field>

          <Field label={d.products.file} hint={d.products.fileHint}>
            <div className="flex flex-wrap items-center gap-2">
              {p.file_name ? (
                <span className="font-mono text-sm">
                  {p.file_name} · {((p.file_size ?? 0) / 1024 / 1024).toFixed(1)} MB
                </span>
              ) : (
                <span className="text-sm text-tomato">{d.products.needFile}</span>
              )}
              <FilePick label={p.file_name ? "↻" : "↑"} busy={busy === "file"} onPick={(f) => upload("file", f)} inline />
            </div>
          </Field>

          {error && <p className="mb-2 text-sm text-tomato">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "…" : d.common.save}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={p.is_published ? "default" : "primary"}
              disabled={!p.file_path && !p.is_published}
              title={!p.file_path ? d.products.needFile : undefined}
              onClick={() => startSave(async () => void (await setProductPublished(p.id, !p.is_published)))}
            >
              {p.is_published ? d.products.unpublish : d.products.publish}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-auto text-tomato"
              onClick={() => {
                if (confirm(d.products.deleteConfirm)) startSave(() => deleteProduct(p.id));
              }}
            >
              {d.common.delete}
            </Button>
          </div>
        </form>
      </div>
    </Panel>
  );
}

function FilePick({
  label,
  accept,
  busy,
  onPick,
  inline,
}: {
  label: string;
  accept?: string;
  busy: boolean;
  onPick: (f: File) => void;
  inline?: boolean;
}) {
  const { d } = useT();
  return (
    <label className={`px-btn px-btn-sm cursor-pointer ${inline ? "" : "mt-2 w-full"}`}>
      {busy ? d.products.uploading : label}
      <input
        type="file"
        accept={accept}
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}
