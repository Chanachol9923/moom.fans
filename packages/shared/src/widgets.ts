import type { GoalLook } from "@moom/shared/goal-look";
import type { Locale } from "@moom/shared/i18n";

// Client-safe types for the OBS widgets (/widget/<token>/<kind>).

export const WIDGET_KINDS = ["goal", "recent", "top", "qr", "poll", "subathon", "wheel"] as const;
export type WidgetKind = (typeof WIDGET_KINDS)[number];

export function isWidgetKind(v: string): v is WidgetKind {
  return (WIDGET_KINDS as readonly string[]).includes(v);
}

/** Suggested Browser Source size per widget, shown in the dashboard. */
export const WIDGET_SIZES: Record<WidgetKind, [number, number]> = {
  goal: [800, 140],
  recent: [1200, 70],
  top: [420, 360],
  qr: [300, 360],
  poll: [600, 400],
  subathon: [480, 160],
  wheel: [600, 380],
};

export type WidgetData = {
  accent: string;
  locale: Locale;
  pageUrl: string;
  showAmounts: boolean;
  topPeriod: "30d" | "all";
  goal: { title: string; raised: number; target: number; endsAt: string | null } | null;
  /** Designed in the dashboard; null = the classic pixel bar. */
  goalLook: GoalLook | null;
  goalImageUrl: string | null;
  recent: Array<{ name: string; amount: number; at: string }>;
  top: Array<{ name: string; total: number }>;
  poll: { title: string; options: string[]; totals: number[]; weightBy: "amount" | "count" } | null;
  subathon: { endsAt: string | null; pausedLeft: number | null };
  /** Prize wheel labels (for the preview spin) and where it spins. */
  wheel: { items: string[]; place: "overlay" | "widget"; look: "reel" | "wheel" | "lights" };
  realtime: { url: string; key: string; channel: string } | null;
};

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
