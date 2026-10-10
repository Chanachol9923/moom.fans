"use client";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { GoalBar } from "@/components/GoalBar";
import { isOverlayEvent } from "@/lib/alerts/types";
import { formatBaht, getDict } from "@/lib/i18n";
import { formatClock, type WidgetData, type WidgetKind } from "@/lib/widgets";

const POLL_MS = 15_000;

export function WidgetApp({ token, kind, initial, demo = false }: { token: string; kind: WidgetKind; initial: WidgetData; demo?: boolean }) {
  const [data, setData] = useState(initial);

  useEffect(() => {
    if (demo) return;
    const refresh = async () => {
      const r = await fetch(`/api/overlay/${token}/widgets`, { cache: "no-store" });
      if (r.ok) setData(await r.json());
    };
    const id = setInterval(refresh, POLL_MS);
    const rt = initial.realtime;
    const channel = rt
      ? createClient(rt.url, rt.key, { auth: { persistSession: false } })
          .channel(rt.channel, { config: { broadcast: { self: false } } })
          .on("broadcast", { event: "moom" }, ({ payload }) => {
            if (isOverlayEvent(payload) && (payload.type === "alerts" || payload.type === "config")) {
              // Give the server a moment to finish writing.
              setTimeout(refresh, 800);
            }
          })
          .subscribe()
      : null;
    return () => {
      clearInterval(id);
      channel?.unsubscribe();
    };
  }, [demo, token, initial.realtime]);

  const d = getDict(data.locale);
  return (
    <div className="h-dvh w-dvw overflow-hidden p-3 text-[18px]" style={{ ["--accent" as string]: data.accent }}>
      {kind === "goal" && data.goal && (
        <div className="px-frame px-frame-raised bg-paper p-3">
          <GoalBar {...data.goal} accent={data.accent} d={d} locale={data.locale} />
        </div>
      )}
      {kind === "recent" && <Ticker data={data} />}
      {kind === "top" && <Top data={data} />}
      {kind === "qr" && <Qr data={data} />}
      {kind === "poll" && data.poll && <Poll data={data} />}
      {kind === "subathon" && <Subathon data={data} />}
    </div>
  );
}

function Ticker({ data }: { data: WidgetData }) {
  const items = data.recent.length ? data.recent : [];
  const d = getDict(data.locale);
  if (!items.length) return null;
  const row = items.map((r, i) => (
    <span key={i} className="mx-6 inline-flex items-center gap-2">
      <span className="size-3" style={{ background: data.accent }} />
      <b className="font-display">{r.name}</b>
      {data.showAmounts && <span className="font-num">{formatBaht(r.amount, data.locale)}</span>}
    </span>
  ));
  return (
    <div className="px-frame flex items-center overflow-hidden bg-paper py-2 whitespace-nowrap">
      <span className="shrink-0 bg-ink px-2 py-0.5 font-display text-sm text-paper">{d.store.recent}</span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="inline-block animate-[px-marquee_30s_linear_infinite]">
          {row}
          {row}
        </div>
      </div>
    </div>
  );
}

function Top({ data }: { data: WidgetData }) {
  const d = getDict(data.locale);
  return (
    <div className="px-frame px-frame-raised bg-paper p-3">
      <div className="mb-2 font-display">{data.topPeriod === "30d" ? d.store.top30 : d.store.topAll}</div>
      <ol className="grid gap-1.5">
        {data.top.map((t, i) => (
          <li key={t.name} className="flex items-center gap-2">
            <span className="font-num grid size-7 place-items-center text-sm" style={{ background: i === 0 ? "var(--beak)" : "var(--paper-2)" }}>
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-display">{t.name}</span>
            {data.showAmounts && <span className="font-num text-ink-soft">{formatBaht(t.total, data.locale)}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Qr({ data }: { data: WidgetData }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    QRCode.toString(data.pageUrl, { type: "svg", margin: 1, color: { dark: "#241e19", light: "#ffffff" } }).then(setSvg);
  }, [data.pageUrl]);
  return (
    <div className="px-frame px-frame-raised inline-block bg-paper p-3 text-center">
      <div className="size-56 bg-white p-1 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="mt-2 font-display text-sm">{data.pageUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</div>
    </div>
  );
}

function Poll({ data }: { data: WidgetData }) {
  const p = data.poll!;
  const max = Math.max(1, ...p.totals);
  const sum = p.totals.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="px-frame px-frame-raised bg-paper p-3">
      <div className="mb-2 font-display text-lg">{p.title}</div>
      <ul className="grid gap-2">
        {p.options.map((o, i) => (
          <li key={i}>
            <div className="flex justify-between gap-2 text-sm">
              <span className="font-display">{o}</span>
              <span className="font-num">{Math.round((p.totals[i] / sum) * 100)}%</span>
            </div>
            <div className="mt-0.5 h-4 bg-ink p-[2px]">
              <div className="h-full" style={{ width: `${(p.totals[i] / max) * 100}%`, background: i === p.totals.indexOf(max) ? data.accent : "var(--pigeon)" }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Subathon({ data }: { data: WidgetData }) {
  const d = getDict(data.locale);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const s = data.subathon;
  const left = s.pausedLeft ?? (s.endsAt ? (new Date(s.endsAt).getTime() - now) / 1000 : 0);
  const running = !s.pausedLeft && Boolean(s.endsAt) && left > 0;
  return (
    <div className="px-frame px-frame-raised inline-block bg-paper px-5 py-3 text-center">
      <div className="font-display text-sm text-ink-soft">
        {d.fun.subathon}
        {s.pausedLeft !== null && <span className="ml-2 bg-ink px-1 text-paper">{d.fun.subathonPause}</span>}
      </div>
      <div className={`font-num text-5xl ${running && left < 60 ? "text-tomato" : ""}`}>{formatClock(left)}</div>
    </div>
  );
}
