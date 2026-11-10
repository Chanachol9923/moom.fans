import Link from "next/link";
import type { AlertPayload } from "@moom/shared/alerts";
import { fmt, type Locale } from "@moom/shared/i18n";
import { AlertBox } from "@moom/shared/ui/AlertBox";
import { PixelSprite } from "@moom/shared/ui/PixelSprite";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { buttonClass } from "@moom/shared/ui/kit";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { PRESETS } from "@moom/shared/pets/sprites";
import { MASCOT_WEB } from "@moom/shared/mascot";

// The mock stream is always a light sky: draw the web pale and the spider dark there.
const WEB_ON_SKY = { ...MASCOT_WEB, palette: { ...MASCOT_WEB.palette, k: "#241e19", s: "rgba(255,255,255,.55)" } };
import { getUser } from "@/lib/supabase/server";

const tip = (locale: Locale, name: string, amount: number, message: string): AlertPayload => ({
  name,
  amount,
  message,
  productTitle: null,
  media: null,
  tts: true,
  locale,
});

export default async function Landing() {
  const { d, locale } = await getT();
  const L = d.landing;
  const signedIn = isSupabaseConfigured() ? Boolean((await getUser()).user) : false;
  const cta = (
    <Link href={signedIn ? "/dashboard" : "/login"} className={buttonClass("primary")}>
      {signedIn ? L.ctaDashboard : L.cta}
    </Link>
  );

  // Everything else, as a plain list: these are real features, not a card grid.
  const more: Array<[string, string]> = [
    [L.f2Title, L.f2Body],
    [L.f6Title, L.f6Body],
    [L.f7Title, L.f7Body],
    [L.f4Title, L.f4Body],
    [L.f5Title, L.f5Body],
    [L.f8Title, L.f8Body],
  ];

  return (
    <>
      <SiteHeader
        right={
          <Link href={signedIn ? "/dashboard" : "/login"} className={buttonClass("default", "sm")}>
            {signedIn ? L.ctaDashboard : d.auth.title}
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16">
        {/* ---- hero: what it is, and the stream it ends up on ---- */}
        <section className="grid items-center gap-10 py-8 md:grid-cols-[1.1fr_1fr] md:py-14">
          <div>
            <p className="font-display text-teal">{L.tagline}</p>
            <h1 className="mt-2 text-4xl leading-[1.1] sm:text-5xl">{L.heroTitle}</h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">{L.heroBody}</p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              {cta}
              <span className="text-sm text-ink-soft">{L.ctaNote}</span>
            </div>
          </div>

          <div className="px-frame px-frame-raised overflow-hidden bg-ink">
            <div className="flex items-center gap-2 bg-ink px-3 py-1.5 font-title text-xs text-paper-3">
              <span className="size-2 bg-tomato" /> LIVE <span className="ml-auto opacity-60">OBS</span>
            </div>
            <div
              className="relative aspect-video overflow-hidden"
              style={{ background: "linear-gradient(#6d8fb3 0 62%, #86ab6f 62% 66%, #5f8a4f 66% 100%)" }}
            >
              <div className="absolute bottom-[34%] left-[10%]">
                <PixelSprite sprite={PRESETS.cat} size={48} />
              </div>
              <div className="absolute bottom-[33%] left-[34%]">
                <PixelSprite sprite={PRESETS.spider} size={40} frame="step" flip />
              </div>
              <div className="absolute top-0 left-0" aria-hidden>
                <PixelSprite sprite={WEB_ON_SKY} size={84} />
              </div>
              <div className="absolute right-[8%] bottom-[34%]">
                <PixelSprite sprite={PRESETS.slime} size={40} frame="step" />
              </div>
              <div className="absolute top-[7%] right-[4%] left-[18%] text-[13px] sm:text-sm">
                <AlertBox className="w-full" kind="tip" progress={0.6} payload={tip(locale, L.sampleName, 50, L.sampleMessage)} />
              </div>
            </div>
          </div>
        </section>

        {/* ---- the money: a PromptPay slip, because that's what the streamer actually sees ---- */}
        <section className="grid items-center gap-10 border-t-[3px] border-dashed border-ink/20 py-12 md:grid-cols-[1fr_1fr]">
          <div className="md:order-2">
            <h2 className="text-3xl">{L.moneyTitle}</h2>
            <p className="mt-3 max-w-xl text-lg text-ink-soft">{L.moneyBody}</p>
            <ul className="mt-5 grid max-w-xl gap-2">
              {[L.money1, L.money2, L.money3].map((m) => (
                <li key={m} className="border-l-[3px] border-teal pl-3">
                  {m}
                </li>
              ))}
            </ul>
          </div>
          <Slip L={L} />
        </section>

        {/* ---- alerts: three real tiers, rendered by the same component OBS uses ---- */}
        <section className="border-t-[3px] border-dashed border-ink/20 py-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl">{L.alertsTitle}</h2>
            <p className="mt-3 text-lg text-ink-soft">{L.alertsBody}</p>
          </div>
          <div className="px-checker mt-8 grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:items-end">
            <Tier label={fmt(L.tierFrom, { amount: "฿20" })}>
              <AlertBox kind="tip" variant="compact" accent="#7d8ba1" className="w-full" payload={tip(locale, "Mochi", 20, L.tierMsg1)} />
            </Tier>
            <Tier label={fmt(L.tierFrom, { amount: "฿100" })}>
              <AlertBox
                kind="tip"
                variant="card"
                accent="#2f7a6a"
                className="w-full"
                title={L.tierTitle2}
                payload={tip(locale, L.sampleName, 100, L.tierMsg2)}
              />
            </Tier>
            <Tier label={fmt(L.tierFrom, { amount: "฿1,000" })} wide>
              {/* A banner is built for a full 1080p width; draw it at 640px and shrink on phones. */}
              <div className="w-[640px] max-w-none [zoom:0.52] sm:[zoom:0.85] lg:w-full lg:[zoom:1]">
                <AlertBox
                  kind="tip"
                  variant="banner"
                  accent="#cc4e37"
                  className="w-full"
                  title={L.tierTitle3}
                  payload={tip(locale, L.tierName3, 1000, L.tierMsg3)}
                />
              </div>
            </Tier>
          </div>
          <p className="mt-4 max-w-2xl text-ink-soft">{L.alertsMore}</p>
        </section>

        {/* ---- everything else ---- */}
        <section className="border-t-[3px] border-dashed border-ink/20 py-12">
          <h2 className="text-3xl">{L.moreTitle}</h2>
          <dl className="mt-6 grid gap-x-12 gap-y-6 sm:grid-cols-2">
            {more.map(([t, b]) => (
              <div key={t}>
                <dt className="font-display text-lg">{t}</dt>
                <dd className="mt-1 text-ink-soft">{b}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 border-t-[3px] border-dashed border-ink/20 pt-10">
          <div>
            <h2 className="text-2xl">{L.endTitle}</h2>
            <p className="mt-1 text-ink-soft">{L.endBody}</p>
          </div>
          {cta}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function Tier({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "min-w-0 lg:col-span-2" : "min-w-0"}>
      <div className="mb-2 inline-block bg-ink px-2 py-0.5 font-display text-sm text-paper">{label}</div>
      {children}
    </div>
  );
}

/** A Thai bank transfer slip, with Moom's "checked" stamp over it. */
function Slip({ L }: { L: Awaited<ReturnType<typeof getT>>["d"]["landing"] }) {
  return (
    <div className="relative mx-auto w-full max-w-sm md:order-1">
      <div className="-rotate-2 bg-white text-[#1b1b1b] shadow-[6px_6px_0_rgba(36,30,25,0.18)]">
        <div className="flex items-center gap-2 bg-[#1a7f4b] px-4 py-3 text-white">
          <svg viewBox="0 0 8 8" className="size-6" shapeRendering="crispEdges" aria-hidden>
            <path d="M2 0h4v1h1v1h1v4h-1v1h-1v1h-4v-1h-1v-1h-1v-4h1v-1h1z" fill="#fff" />
            <path d="M5 2h1v1h-1v1h-1v1h-1v-1h-1v-1h1v1h1v-1h1z" fill="#1a7f4b" />
          </svg>
          <span className="text-lg font-semibold">{L.slipDone}</span>
        </div>
        <dl className="grid gap-3 px-5 py-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[#5a5a5a]">{L.slipAmount}</dt>
            <dd className="font-num text-2xl">50.00</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#5a5a5a]">{L.slipFrom}</dt>
            <dd className="text-right">{L.sampleName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#5a5a5a]">{L.slipTo}</dt>
            <dd className="text-right">
              {L.slipToName}
              <span className="block text-[#5a5a5a]">{L.slipPromptPay} 081-xxx-5678</span>
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-dashed border-[#d0d0d0] pt-3 text-[#5a5a5a]">
            <dt>{L.slipRef}</dt>
            <dd className="font-mono text-xs">0141-2611-0220-41</dd>
          </div>
        </dl>
      </div>
      <div className="absolute -right-2 -bottom-5 rotate-6 border-[3px] border-teal bg-paper px-3 py-1.5 font-title text-teal shadow-[3px_3px_0_rgba(36,30,25,0.15)]">
        {L.slipStamp}
      </div>
    </div>
  );
}
