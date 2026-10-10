import type { Store } from "@/app/(site)/s/[slug]/data";
import type { Locale } from "@/lib/i18n";
import { parsePageConfig } from "@/lib/page-config";
import { PRESETS } from "@/lib/pets/sprites";

/** Fake storefront for the dev gallery and design previews. No database needed. */
export function sampleStore(locale: Locale, pageOverrides: Record<string, unknown> = {}): Store {
  const th = locale === "th";
  return {
    slug: "noknoi",
    displayName: th ? "น้องนกน้อย ch." : "Noknoi ch.",
    bio: th
      ? "VTuber นกพิราบ ไลฟ์เกมตอนดึก ร้องเพลงบ้างนานๆ ที\nขอบคุณทุกคนที่แวะมานะ"
      : "Pigeon VTuber. Late-night games, the occasional karaoke.\nThanks for dropping by!",
    accent: "#2f7a6a",
    avatarUrl: null,
    bannerUrl: null,
    backgroundUrl: null,
    links: [
      { label: "YouTube", url: "https://youtube.com/" },
      { label: "Twitch", url: "https://twitch.tv/" },
      { label: "X", url: "https://x.com/" },
    ],
    tipPresets: [20, 50, 100, 300],
    minTip: 10,
    media: { bahtPerSecond: 1, maxSeconds: 120 },
    products: [
      {
        id: "00000000-0000-0000-0000-000000000001",
        title: th ? "Voice pack เสียงปลุกตอนเช้า" : "Morning alarm voice pack",
        description: th ? "12 ไฟล์ mp3 ทั้งแบบอ่อนโยนและแบบโกรธ" : "12 mp3 files, gentle and grumpy",
        price: 149,
        coverUrl: null,
        previewUrl: null,
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        title: th ? "วอลเปเปอร์ฮาโลวีน 4K" : "Halloween wallpaper 4K",
        description: th ? "ภาพวาดใหม่ 3 แบบ สำหรับจอคอมและมือถือ" : "3 new illustrations for desktop and phone",
        price: 89,
        coverUrl: null,
        previewUrl: null,
      },
    ],
    page: parsePageConfig(pageOverrides),
    goal: {
      id: "g",
      title: th ? "ไมค์ตัวใหม่" : "New microphone",
      target: 4500,
      raised: 2730,
      endsAt: new Date(Date.UTC(2026, 11, 31)).toISOString(),
    },
    poll: {
      id: "p",
      title: th ? "เกมคืนพรุ่งนี้" : "Tomorrow's game",
      options: ["Minecraft", "Valorant", "Stardew"],
      totals: [320, 150, 410],
      weightBy: "amount",
    },
    recent: [
      { name: th ? "นกกระจอก" : "sparrow", amount: 50, at: "2026-10-10T12:00:00Z" },
      { name: th ? "ผู้สนับสนุนนิรนาม" : "Anonymous supporter", amount: 100, at: "2026-10-10T11:58:00Z" },
      { name: th ? "แมวส้ม" : "orange cat", amount: 20, at: "2026-10-10T11:40:00Z" },
    ],
    top: [
      { name: th ? "แมวส้ม" : "orange cat", total: 1250 },
      { name: th ? "นกกระจอก" : "sparrow", total: 640 },
      { name: "pixelduck", total: 300 },
    ],
    pet: PRESETS.cat,
  };
}
