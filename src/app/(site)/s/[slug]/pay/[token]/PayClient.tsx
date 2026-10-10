"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PixelSprite } from "@/components/PixelSprite";
import { buttonClass } from "@/components/ui";
import type { PayView } from "@/lib/domain/pay-view";
import { fmt, formatBaht } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { PRESETS } from "@/lib/pets/sprites";

export function PayClient({
  token,
  initial,
  streamerName,
  thanks,
  basePath = "",
}: {
  token: string;
  initial: PayView;
  streamerName: string;
  /** Streamer's own thank-you text from Page design. */
  thanks?: string;
  /** "" on a subdomain, "/s/<slug>" when subdomains are off. */
  basePath?: string;
}) {
  const { d, locale } = useT();
  const [view, setView] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Countdown tick.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Poll while the streamer still has to act.
  useEffect(() => {
    if (view.status !== "pending_review") return;
    const id = setInterval(async () => {
      const res = await fetch(`/api/tx/${token}`, { cache: "no-store" });
      if (res.ok) setView(await res.json());
    }, 4000);
    return () => clearInterval(id);
  }, [token, view.status]);

  const msLeft = new Date(view.expiresAt).getTime() - now;
  const mm = Math.max(0, Math.floor(msLeft / 60000));
  const ss = Math.max(0, Math.floor((msLeft % 60000) / 1000));

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    const form = new FormData();
    form.append("slip", file);
    const res = await fetch(`/api/tx/${token}/slip`, { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      const key = json.error as keyof typeof d.pay.uploadErrors;
      setError(d.pay.uploadErrors[key] ?? d.common.error);
      return;
    }
    const next = await fetch(`/api/tx/${token}`, { cache: "no-store" });
    if (next.ok) setView(await next.json());
  }

  const amount = formatBaht(view.amount, locale);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <Link href={basePath || "/"} className="font-display text-sm text-ink-soft hover:text-ink">
        ← {fmt(d.pay.backToPage, { name: streamerName })}
      </Link>

      <div className="px-frame px-frame-raised mt-3 bg-paper p-5">
        {view.status === "awaiting_payment" && (
          <>
            <h1 className="text-2xl">{d.pay.title}</h1>
            <p className="text-ink-soft">{fmt(d.pay.to, { name: streamerName })}</p>
            {view.productTitle && <p className="mt-1 font-medium">{view.productTitle}</p>}

            <div className="mt-4 text-center">
              <div className="px-label">{d.pay.amount}</div>
              <div className="font-num text-4xl">{amount}</div>
              <div className="text-sm text-ink-faint">{d.pay.exact}</div>
            </div>

            <p className="mt-4 font-display">{d.pay.step1}</p>
            <div className="mx-auto mt-2 w-full max-w-[280px] bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic SVG from our API */}
              <img src={`/api/tx/${token}/qr`} alt="PromptPay QR" className="pixelated aspect-square w-full" />
            </div>
            <p className="mt-2 text-center text-sm text-ink-soft">
              {msLeft > 0 ? fmt(d.pay.timeLeft, { time: `${mm}:${String(ss).padStart(2, "0")}` }) : d.pay.statusExpired}
            </p>
            <div className="mt-2 text-center">
              <a href={`/api/tx/${token}/qr?format=png`} download className={buttonClass("default", "sm")}>
                ↓ {d.pay.saveQr}
              </a>
              <p className="mt-1 text-xs text-ink-faint">{d.pay.saveQrHint}</p>
            </div>

            <p className="mt-6 font-display">{d.pay.step2}</p>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className={buttonClass("primary", "md", "mt-2 w-full text-lg")}
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? d.pay.uploading : d.pay.upload}
            </button>
            {error && <p className="mt-2 text-tomato">{error}</p>}
          </>
        )}

        {view.status === "pending_review" && (
          <StatusBlock sprite="bird" title={d.pay.statusPending} body={d.pay.statusPendingHint} bob />
        )}

        {view.status === "verified" && (
          <>
            <StatusBlock
              sprite="bird"
              title={d.pay.statusVerified}
              body={thanks || (view.kind === "tip" ? d.pay.statusVerifiedTip : undefined)}
            />
            {view.canDownload && (
              <div className="mt-4 text-center">
                <a href={`/api/tx/${token}/download`} className={buttonClass("primary", "md", "w-full")}>
                  ↓ {fmt(d.pay.download, { file: view.productTitle ?? "" })}
                </a>
                <p className="mt-2 text-sm text-ink-faint">{d.pay.downloadHint}</p>
              </div>
            )}
          </>
        )}

        {view.status === "rejected" && (
          <StatusBlock sprite="cat" title={d.pay.statusRejected} body={d.pay.statusRejectedHint} />
        )}
        {view.status === "expired" && <StatusBlock sprite="slime" title={d.pay.statusExpired} />}
      </div>
    </main>
  );
}

function StatusBlock({
  sprite,
  title,
  body,
  bob,
}: {
  sprite: keyof typeof PRESETS;
  title: string;
  body?: string;
  bob?: boolean;
}) {
  return (
    <div className="py-4 text-center">
      <div className={`inline-block ${bob ? "px-bob" : ""}`}>
        <PixelSprite sprite={PRESETS[sprite]} size={80} frame={sprite === "slime" ? "sleep" : "stand"} />
      </div>
      <h1 className="mt-3 text-2xl">{title}</h1>
      {body && <p className="mt-1 text-ink-soft">{body}</p>}
    </div>
  );
}
