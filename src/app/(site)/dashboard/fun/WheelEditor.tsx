"use client";
import { useState, useTransition } from "react";
import { Button, Check, Field, Input } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import type { WheelConfig } from "@/lib/wheel";
import { saveWheel } from "../more-actions";

export function WheelEditor({ initial }: { initial: WheelConfig }) {
  const { d } = useT();
  const [cfg, setCfg] = useState<WheelConfig>(
    initial.items.length ? initial : { ...initial, items: [{ label: "", weight: 1 }, { label: "", weight: 1 }] },
  );
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const total = cfg.items.reduce((s, i) => s + Math.max(0, i.weight), 0) || 1;
  const upd = (patch: Partial<WheelConfig>) => {
    setSaved(false);
    setCfg((c) => ({ ...c, ...patch }));
  };

  return (
    <div>
      <Check checked={cfg.enabled} onChange={(e) => upd({ enabled: e.target.checked })} label={d.fun.wheelEnabled} />
      <Field label={d.fun.wheelMin}>
        <Input type="number" min={1} className="max-w-40" value={cfg.min_amount} onChange={(e) => upd({ min_amount: Math.max(1, Number(e.target.value) || 1) })} />
      </Field>
      <ul className="grid gap-1">
        {cfg.items.map((it, i) => (
          <li key={i} className="grid grid-cols-[1fr_80px_90px_auto] items-center gap-2">
            <Input
              value={it.label}
              maxLength={40}
              placeholder={d.fun.wheelItem}
              onChange={(e) => upd({ items: cfg.items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
            />
            <Input
              type="number"
              min={0}
              aria-label={d.fun.wheelWeight}
              value={it.weight}
              onChange={(e) => upd({ items: cfg.items.map((x, j) => (j === i ? { ...x, weight: Math.max(0, Number(e.target.value) || 0) } : x)) })}
            />
            <span className="font-num text-sm text-ink-faint">{fmt(d.fun.wheelChance, { pct: Math.round((Math.max(0, it.weight) / total) * 100) })}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => upd({ items: cfg.items.filter((_, j) => j !== i) })}>
              ✕
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={cfg.items.length >= 12} onClick={() => upd({ items: [...cfg.items, { label: "", weight: 1 }] })}>
          + {d.fun.wheelAdd}
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await saveWheel({ ...cfg, items: cfg.items.filter((i) => i.label.trim()) });
              setSaved(true);
            })
          }
        >
          {pending ? "…" : d.common.save}
        </Button>
        {saved && <span className="font-display text-leaf">✓ {d.common.saved}</span>}
      </div>
    </div>
  );
}
