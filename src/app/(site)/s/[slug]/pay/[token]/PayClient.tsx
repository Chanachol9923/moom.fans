"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PixelSprite } from "@moom/shared/ui/PixelSprite";
import { buttonClass } from "@moom/shared/ui/kit";
import type { PayView } from "@/lib/domain/pay-view";
import { fmt, formatBaht } from "@moom/shared/i18n";
import { useT } from "@moom/shared/i18n/react";
import { PRESETS } from "@moom/shared/pets/sprites";

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

  // Keep the status fresh until it's settled: quickly while the streamer reviews, slowly
  // while waiting for a slip (the streamer may approve without one), and right away when
  // the supporter comes back from their bank app.
  useEffect(() => {
    if (view.status !== "pending_review" && view.status !== "awaiting_payment") return;
    const refresh = async () => {
      const res = await fetch(`/api/tx/${token}`, { cache: "no-store" }).catch(() => null);
      if (res?.ok) setView(await res.json());
    };
    const id = setInterval(refresh, view.status === "pending_review" ? 4000 : 10_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token, view.status]);

  const msLeft = new Date(view.expiresAt).getTime() - now;
  const mm = Math.max(0, Math.floor(msLeft / 60000));
  const ss = Math.max(0, Math.floor((msLeft % 60000) / 1000));

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    const form = new FormData();
    form.append("slip", await fitSlip(file));
    const res = await fetch(`/api/tx/${token}/slip`, { method: "POST", body: form }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : { error: "network" };
    setUploading(false);
    if (!res?.ok) {
      const key = json.error as keyof typeof d.pay.uploadErrors;
      setError(d.pay.uploadErrors[key] ?? d.common.error);
      return;
    }
    const next = await fetch(`/api/tx/${token}`, { cache: "no-store" }).catch(() => null);
    if (next?.ok) setView(await next.json());
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

const SLIP_MAX_BYTES = 4.5 * 1024 * 1024;
const SLIP_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Camera photos can be too big or an odd format; re-encode those as a JPEG the server takes. */
async function fitSlip(file: File): Promise<File> {
  if (SLIP_TYPES.includes(file.type) && file.size <= SLIP_MAX_BYTES) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], "slip.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file; // the server explains what's wrong
  }
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
