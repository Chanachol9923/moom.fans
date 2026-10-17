import Link from "next/link";
import { AlertBox } from "@moom/shared/ui/AlertBox";
import { PixelSprite } from "@moom/shared/ui/PixelSprite";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { buttonClass } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { iconSprite } from "@moom/shared/pets/icons";
import { PRESETS } from "@moom/shared/pets/sprites";
import { getUser } from "@/lib/supabase/server";

export default async function Landing() {
  const { d, locale } = await getT();
  const signedIn = isSupabaseConfigured() ? Boolean((await getUser()).user) : false;

  const features = [
    { title: d.landing.f1Title, body: d.landing.f1Body, sprite: PRESETS.bird },
    { title: d.landing.f2Title, body: d.landing.f2Body, sprite: PRESETS.cat },
    { title: d.landing.f3Title, body: d.landing.f3Body, sprite: PRESETS.dog },
    { title: d.landing.f4Title, body: d.landing.f4Body, sprite: PRESETS.slime },
    { title: d.landing.f5Title, body: d.landing.f5Body, sprite: iconSprite("corn") },
    { title: d.landing.f6Title, body: d.landing.f6Body, sprite: iconSprite("heart") },
    { title: d.landing.f7Title, body: d.landing.f7Body, sprite: iconSprite("coffee") },
    { title: d.landing.f8Title, body: d.landing.f8Body, sprite: iconSprite("fish") },
  ];

  return (
    <>
      <SiteHeader
        right={
          <Link href={signedIn ? "/dashboard" : "/login"} className={buttonClass("default", "sm")}>
            {signedIn ? d.landing.ctaDashboard : d.auth.title}
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16">
        <section className="grid items-center gap-10 py-8 md:grid-cols-[1.1fr_1fr] md:py-14">
          <div>
            <p className="font-display text-teal">{d.landing.tagline}</p>
            <h1 className="mt-2 text-4xl leading-[1.1] sm:text-5xl">{d.landing.heroTitle}</h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">{d.landing.heroBody}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={signedIn ? "/dashboard" : "/login"} className={buttonClass("primary")}>
                {signedIn ? d.landing.ctaDashboard : d.landing.cta} →
              </Link>
            </div>
          </div>

          {/* A fake stream window with a live-looking alert. */}
          <div className="px-frame px-frame-raised overflow-hidden bg-ink">
            <div className="flex items-center gap-2 bg-ink px-3 py-1.5 font-display text-xs text-paper-3">
              <span className="size-2 bg-tomato" /> LIVE <span className="ml-auto opacity-60">OBS</span>
            </div>
            <div
              className="relative aspect-video overflow-hidden"
              style={{
                background:
                  "linear-gradient(#6d8fb3 0 62%, #86ab6f 62% 66%, #5f8a4f 66% 100%)",
              }}
            >
              <div className="absolute left-[10%] bottom-[34%]">
                <PixelSprite sprite={PRESETS.cat} size={48} />
              </div>
              <div className="absolute left-[34%] bottom-[33%]">
                <PixelSprite sprite={PRESETS.bird} size={40} frame="step" flip />
              </div>
              <div className="absolute right-[8%] bottom-[34%]">
                <PixelSprite sprite={PRESETS.slime} size={40} frame="step" />
              </div>
              <div className="absolute top-[7%] right-[4%] left-[18%] text-[13px] sm:text-sm">
                <AlertBox
                  className="w-full"
                  kind="tip"
                  progress={0.6}
                  payload={{
                    name: locale === "th" ? "นกกระจอก" : "sparrow",
                    amount: 50,
                    message: locale === "th" ? "ไลฟ์วันนี้สนุกมาก ขอเพลงที่แล้วอีกรอบ" : "Great stream today, play that song again",
                    productTitle: null,
                    media: null,
                    tts: true,
                    locale,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-8">
          <h2 className="mb-6 text-2xl">{d.landing.featuresTitle}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="px-frame bg-paper p-4">
                <PixelSprite sprite={f.sprite} size={48} />
                <h3 className="mt-3 text-lg">{f.title}</h3>
                <p className="mt-1 text-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-8">
          <div className="px-frame bg-paper-2 p-5 sm:p-7">
            <h2 className="text-2xl">{d.landing.howTitle}</h2>
            <p className="mt-2 max-w-3xl text-ink-soft">{d.landing.howBody}</p>
            <ol className="mt-6 grid gap-3 font-display sm:grid-cols-4">
              {(locale === "th"
                ? ["คนดูสแกน QR", "เงินเข้าพร้อมเพย์สตรีมเมอร์", "Moom ตรวจสลิป", "ขึ้นจอ OBS"]
                : ["Viewer scans QR", "Money lands in streamer's PromptPay", "Moom checks the slip", "Alert on OBS"]
              ).map((step, i) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="grid size-8 shrink-0 place-items-center bg-ink text-paper">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
