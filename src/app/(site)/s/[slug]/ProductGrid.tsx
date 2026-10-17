"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PixelSprite } from "@moom/shared/ui/PixelSprite";
import { Button, Field, Input } from "@moom/shared/ui/kit";
import { fmt, formatBaht } from "@moom/shared/i18n";
import { useT } from "@moom/shared/i18n/react";
import { PRESETS } from "@moom/shared/pets/sprites";
import type { Store, StoreProduct } from "./data";

export function ProductGrid({ store, preview = false }: { store: Store; preview?: boolean }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [buying, setBuying] = useState<StoreProduct | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audio.current?.pause(), []);

  const toggle = (p: StoreProduct) => {
    if (!p.previewUrl) return;
    if (playing === p.id) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    const a = new Audio(p.previewUrl);
    a.onended = () => setPlaying(null);
    a.play().catch(() => setPlaying(null));
    audio.current = a;
    setPlaying(p.id);
  };

  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2">
        {store.products.map((p) => (
          <ProductCard key={p.id} p={p} playing={playing === p.id} onListen={() => toggle(p)} onBuy={() => !preview && setBuying(p)} />
        ))}
      </ul>
      {buying && <BuySheet store={store} product={buying} onClose={() => setBuying(null)} />}
    </>
  );
}

function ProductCard({
  p,
  playing,
  onListen,
  onBuy,
}: {
  p: StoreProduct;
  playing: boolean;
  onListen: () => void;
  onBuy: () => void;
}) {
  const { d, locale } = useT();
  return (
    <li className="px-frame flex flex-col bg-paper">
      <div className="relative aspect-[4/3] overflow-hidden bg-paper-2">
        {p.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user upload on storage CDN
          <img src={p.coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center">
            <PixelSprite sprite={PRESETS.cat} size={64} />
          </div>
        )}
        {p.previewUrl && (
          <button
            type="button"
            onClick={onListen}
            className="px-btn px-btn-sm px-btn-beak absolute bottom-2 left-2"
            aria-pressed={playing}
          >
            {playing ? `■ ${d.store.stop}` : `▶ ${d.store.listen}`}
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-lg leading-tight">{p.title}</h3>
        {p.description && <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-ink-soft">{p.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="font-num text-xl">{formatBaht(p.price, locale)}</span>
          <Button size="sm" variant="primary" onClick={onBuy}>
            {d.store.buy}
          </Button>
        </div>
      </div>
    </li>
  );
}

function BuySheet({ store, product, onClose }: { store: Store; product: StoreProduct; onClose: () => void }) {
  const { d, locale } = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  async function submit(form: FormData) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/public/${store.slug}/tx`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "purchase",
        productId: product.id,
        name: form.get("name"),
        email: form.get("email"),
        message: form.get("message") ?? "",
        website: form.get("website"),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.token) {
      setBusy(false);
      const key = json.error as keyof typeof d.store.errors;
      return setError(d.store.errors[key] ?? d.common.error);
    }
    router.push(`${store.basePath}/pay/${json.token}`);
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      className="m-auto mb-0 w-full max-w-md bg-transparent p-0 backdrop:bg-ink/50 sm:mb-auto"
    >
      <form action={submit} className="px-frame bg-paper p-5" style={{ ["--accent" as string]: store.accent }}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-xl leading-tight">{fmt(d.store.buyTitle, { title: product.title })}</h2>
          <button type="button" onClick={() => dialog.current?.close()} className="font-display" aria-label={d.common.close}>
            ✕
          </button>
        </div>
        <p className="font-num mb-4 text-2xl">{formatBaht(product.price, locale)}</p>
        <Field label={d.store.yourName} htmlFor="buy-name">
          <Input id="buy-name" name="name" required maxLength={40} autoComplete="nickname" />
        </Field>
        <Field label={d.store.email} htmlFor="buy-email" hint={d.store.emailHint}>
          <Input id="buy-email" name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label={`${d.store.buyMessage} (${d.common.optional})`} htmlFor="buy-msg">
          <Input id="buy-msg" name="message" maxLength={300} />
        </Field>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        {error && <p className="mb-3 text-tomato">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? d.common.loading : d.store.send}
        </Button>
      </form>
    </dialog>
  );
}
