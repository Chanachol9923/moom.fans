"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PixelSprite } from "@moom/shared/ui/PixelSprite";
import { Button, Check, Field, Input, Textarea } from "@moom/shared/ui/kit";
import { fmt, formatBaht } from "@moom/shared/i18n";
import { useT } from "@moom/shared/i18n/react";
import { mediaSecondsFor, parseMediaUrl } from "@/lib/media";
import { iconSprite } from "@moom/shared/pets/icons";
import type { Store } from "./data";

export function TipBox({ store, preview = false }: { store: Store; preview?: boolean }) {
  const { d, locale } = useT();
  const router = useRouter();
  const cfg = store.page;
  const unit = cfg.unit.enabled ? cfg.unit : null;
  const presets = store.tipPresets.filter((p) => p >= store.minTip);

  const [amount, setAmount] = useState<number | "">(presets[1] ?? presets[0] ?? store.minTip);
  const [qty, setQty] = useState<number | "">(unit ? (unit.presets[0] ?? 1) : 1);
  const [custom, setCustom] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [vote, setVote] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const total = unit ? (typeof qty === "number" ? Math.round(qty * unit.price * 100) / 100 : "") : amount;
  const mediaSecs =
    store.media && mediaUrl && typeof total === "number"
      ? mediaSecondsFor(total, store.media.bahtPerSecond, store.media.maxSeconds)
      : null;

  async function submit(form: FormData) {
    if (preview) return;
    setError(null);
    if (typeof total !== "number" || total < store.minTip) return setError(d.store.errors.amount_too_low);
    if (mediaUrl && !parseMediaUrl(mediaUrl)) return setError(d.store.errors.media_invalid);
    setBusy(true);
    const res = await fetch(`/api/public/${store.slug}/tx`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "tip",
        name: String(form.get("name") ?? ""),
        message: form.get("message") ?? "",
        amount: total,
        unitQty: unit && typeof qty === "number" ? qty : undefined,
        mediaUrl: mediaUrl || undefined,
        anonymous,
        showOnWall: form.get("showOnWall") === "on",
        pollOption: vote ?? undefined,
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

  const pick = (selected: boolean) => `px-btn px-btn-sm ${selected ? "px-btn-primary" : ""}`;

  return (
    <form action={submit} className="px-frame px-frame-raised bg-paper p-4 sm:p-5">
      <h2 className="mb-1 text-2xl">{cfg.tipTitle || d.store.tipTitle}</h2>
      {cfg.tipNote && <p className="mb-3 whitespace-pre-line text-sm text-ink-soft">{cfg.tipNote}</p>}

      {unit ? (
        <>
          <div className="mt-3 flex items-center gap-2">
            <PixelSprite sprite={iconSprite(unit.icon)} size={36} />
            <span className="text-sm text-ink-soft">
              {fmt(d.store.unitEach, { price: formatBaht(unit.price, locale), unit: unit.name })}
            </span>
          </div>
          <div className="px-label mt-2">{d.store.unitPick}</div>
          <div className="mb-2 flex flex-wrap gap-1">
            {unit.presets.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setQty(n);
                  setCustom(false);
                }}
                className={pick(!custom && qty === n)}
              >
                <span className="font-num">×{n}</span>
              </button>
            ))}
            <button type="button" onClick={() => (setCustom(true), setQty(""))} className={pick(custom)}>
              {d.store.custom}
            </button>
          </div>
          {custom && (
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              step={1}
              autoFocus
              value={qty}
              onChange={(e) => setQty(e.target.value === "" ? "" : Math.floor(Number(e.target.value)))}
              aria-label={d.store.unitPick}
            />
          )}
        </>
      ) : (
        <>
          <div className="px-label mt-3">{d.store.amount}</div>
          <div className="mb-2 flex flex-wrap gap-1">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setAmount(p);
                  setCustom(false);
                }}
                className={pick(!custom && amount === p)}
              >
                <span className="font-num">฿{p}</span>
              </button>
            ))}
            <button type="button" onClick={() => (setCustom(true), setAmount(""))} className={pick(custom)}>
              {d.store.custom}
            </button>
          </div>
          {custom && (
            <Input
              type="number"
              inputMode="decimal"
              min={store.minTip}
              step="0.01"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              aria-label={d.store.amount}
            />
          )}
        </>
      )}
      <p className="mb-3 text-sm text-ink-faint">{fmt(d.store.minTip, { amount: formatBaht(store.minTip, locale) })}</p>

      <Field label={d.store.yourName} htmlFor="tip-name">
        <Input id="tip-name" name="name" required={!anonymous} maxLength={40} autoComplete="nickname" />
      </Field>
      <Check checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} label={d.store.anonymousLabel} />
      <Field label={d.store.message} htmlFor="tip-msg" hint={d.store.messageHint}>
        <Textarea id="tip-msg" name="message" maxLength={300} rows={3} />
      </Field>

      {store.poll && (
        <fieldset className="mb-3">
          <legend className="px-label">
            {d.store.vote}: {store.poll.title}
          </legend>
          <p className="mb-1 text-xs text-ink-faint">
            {store.poll.weightBy === "amount" ? d.store.weightAmount : d.store.weightCount}
          </p>
          <div className="flex flex-wrap gap-1">
            <button type="button" className={pick(vote === null)} onClick={() => setVote(null)}>
              {d.store.noVote}
            </button>
            {store.poll.options.map((o, i) => (
              <button key={i} type="button" className={pick(vote === i)} onClick={() => setVote(i)}>
                {o}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {store.media && (
        <Field
          label={`${d.store.media} (${d.common.optional})`}
          htmlFor="tip-media"
          hint={
            mediaSecs !== null
              ? fmt(d.store.mediaSeconds, { seconds: mediaSecs })
              : fmt(d.store.mediaHint, { rate: store.media.bahtPerSecond, max: store.media.maxSeconds })
          }
        >
          <Input
            id="tip-media"
            type="url"
            inputMode="url"
            placeholder="https://youtu.be/…"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
          />
        </Field>
      )}

      <Check name="showOnWall" defaultChecked label={d.store.showOnWall} />

      {/* honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      {error && <p className="mb-3 text-tomato">{error}</p>}
      <Button type="submit" variant="primary" className="mt-2 w-full text-lg" disabled={busy}>
        {busy
          ? d.common.loading
          : `${cfg.buttonLabel || d.store.send} · ${typeof total === "number" ? formatBaht(total, locale) : "—"}`}
      </Button>
    </form>
  );
}
