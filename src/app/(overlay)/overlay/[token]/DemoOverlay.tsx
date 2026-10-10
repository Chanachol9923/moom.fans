"use client";
import { useEffect } from "react";
import { OverlayApp } from "@/components/overlay/OverlayApp";
import type { AlertStyle, OverlayAlert, OverlayState } from "@/lib/alerts/types";
import type { Locale } from "@/lib/i18n";
import { PRESETS } from "@/lib/pets/sprites";

// /overlay/demo: no database, no token. Plays a sample alert every few seconds and
// shows the preset pets, so the overlay can be tried in OBS before signing up.

const SAMPLES: Record<Locale, Array<Omit<OverlayAlert["payload"], "locale">>> = {
  th: [
    { name: "นกกระจอก", amount: 50, message: "ไลฟ์วันนี้สนุกมาก", productTitle: null, media: null, tts: false },
    { name: "แมวส้ม", amount: 199, message: "", productTitle: "Voice pack ปลุกตอนเช้า", media: null, tts: false },
    { name: "สไลม์เขียว", amount: 20, message: "ขอเพลงเดิมอีกรอบ", productTitle: null, media: null, tts: false },
    {
      name: "นกฮูก",
      amount: 60,
      message: "เอาไปกินให้อิ่ม",
      productTitle: null,
      media: null,
      tts: false,
      unit: { name: "ข้าวโพด", qty: 3, icon: "corn" },
      vote: "Minecraft",
    },
    {
      name: "เป็ด",
      amount: 150,
      message: "หมุนเลย!",
      productTitle: null,
      media: null,
      tts: false,
      wheel: { items: ["วิดพื้น 10 ที", "ร้องเพลง", "พูดสำเนียงใต้", "ไม่โดนอะไร"], result: 1 },
    },
  ],
  en: [
    { name: "sparrow", amount: 50, message: "Great stream today", productTitle: null, media: null, tts: false },
    { name: "orange cat", amount: 199, message: "", productTitle: "Morning alarm voice pack", media: null, tts: false },
    { name: "green slime", amount: 20, message: "Play that song again", productTitle: null, media: null, tts: false },
    {
      name: "owl",
      amount: 60,
      message: "Eat well!",
      productTitle: null,
      media: null,
      tts: false,
      unit: { name: "corn", qty: 3, icon: "corn" },
      vote: "Minecraft",
    },
    {
      name: "duck",
      amount: 150,
      message: "Spin it!",
      productTitle: null,
      media: null,
      tts: false,
      wheel: { items: ["10 push-ups", "Sing a song", "Funny accent", "Nothing"], result: 1 },
    },
  ],
};

export function DemoOverlay({ locale, style = "card" }: { locale: Locale; style?: AlertStyle }) {
  const state: OverlayState = {
    streamer: { displayName: "Moom", slug: "demo" },
    config: {
      position: "bottom-right",
      alertStyle: style,
      volume: 60,
      displaySeconds: 6,
      alertSoundUrl: null,
      ttsEnabled: false,
      mediaEnabled: false,
      vtsEnabled: false,
      vtsRules: [],
      petsEnabled: true,
      twitchChannel: null,
      accent: "#2f7a6a",
      locale,
      blockedWords: [],
    },
    alerts: [],
    pets: [
      { id: "p1", name: locale === "th" ? "นกน้อย" : "Coo", chatter: null, sprite: PRESETS.bird },
      { id: "p2", name: locale === "th" ? "ส้มจี๊ด" : "Mikan", chatter: null, sprite: PRESETS.cat },
      { id: "p3", name: locale === "th" ? "หนึบ" : "Blob", chatter: null, sprite: PRESETS.slime },
    ],
    realtime: null,
  };

  useEffect(() => {
    let i = 0;
    const push = () => {
      const s = SAMPLES[locale][i++ % SAMPLES[locale].length];
      const w = window as unknown as { moomDemo?: (a: OverlayAlert) => void };
      w.moomDemo?.({
        id: `demo-${i}`,
        kind: s.productTitle ? "purchase" : "tip",
        createdAt: new Date().toISOString(),
        payload: { ...s, locale },
      });
    };
    const first = setTimeout(push, 800);
    const id = setInterval(push, 14_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [locale]);

  return <OverlayApp token="demo" initial={state} demo />;
}
