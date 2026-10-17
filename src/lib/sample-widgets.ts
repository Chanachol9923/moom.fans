import type { Locale } from "@moom/shared/i18n";
import type { WidgetData } from "@moom/shared/widgets";

export function sampleWidgetData(locale: Locale): WidgetData {
  const th = locale === "th";
  return {
    accent: "#2f7a6a",
    locale,
    pageUrl: "https://noknoi.moom.fans/",
    showAmounts: true,
    topPeriod: "30d",
    goal: { title: th ? "ไมค์ตัวใหม่" : "New microphone", raised: 2730, target: 4500, endsAt: null },
    recent: [
      { name: th ? "นกกระจอก" : "sparrow", amount: 50, at: "" },
      { name: th ? "แมวส้ม" : "orange cat", amount: 199, at: "" },
      { name: th ? "ผู้สนับสนุนนิรนาม" : "Anonymous supporter", amount: 100, at: "" },
      { name: "pixelduck", amount: 20, at: "" },
    ],
    top: [
      { name: th ? "แมวส้ม" : "orange cat", total: 1250 },
      { name: th ? "นกกระจอก" : "sparrow", total: 640 },
      { name: "pixelduck", total: 300 },
    ],
    poll: {
      title: th ? "เกมคืนพรุ่งนี้" : "Tomorrow's game",
      options: ["Minecraft", "Valorant", "Stardew"],
      totals: [320, 150, 410],
      weightBy: "amount",
    },
    subathon: { endsAt: new Date(Date.UTC(2030, 0, 1)).toISOString(), pausedLeft: null },
    realtime: null,
  };
}
