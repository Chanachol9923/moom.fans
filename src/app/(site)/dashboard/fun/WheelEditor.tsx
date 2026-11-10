"use client";
import { useState, useTransition } from "react";
import { Button, Check, Input } from "@moom/shared/ui/kit";
import { fmt } from "@moom/shared/i18n";
import { useT } from "@moom/shared/i18n/react";
import { WHEEL_LOOKS, type WheelConfig } from "@moom/shared/wheel";
import { WheelSpin } from "@moom/shared/ui/overlay/WheelReel";
import { saveWheel } from "../more-actions";
import { isNextControl } from "@/lib/errors";

export function WheelEditor({ initial, accent }: { initial: WheelConfig; accent: string }) {
  const { d, locale } = useT();
  // Each press of "Try a spin" remounts the preview with a new random result.
  const [trial, setTrial] = useState<{ n: number; result: number } | null>(null);
  const [cfg, setCfg] = useState<WheelConfig>(
    initial.items.length
      ? initial
      : {
          ...initial,
          items: [
            { label: "", weight: 1 },
            { label: "", weight: 1 },
          ],
        },
  );
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const total = cfg.items.reduce((s, i) => s + Math.max(0, i.weight), 0) || 1;
  const upd = (patch: Partial<WheelConfig>) => {
    setSaved(false);
    setCfg((c) => ({ ...c, ...patch }));
  };

  return (
    <div>
      <Check
        checked={cfg.enabled}
        onChange={(e) => upd({ enabled: e.target.checked })}
        label={d.fun.wheelEnabled}
      />
      <div className={cfg.enabled ? "" : "opacity-60"}>
        <label className="my-3 flex flex-wrap items-center gap-2">
          <span>{d.fun.wheelRuleA}</span>
          <Input
            type="number"
            min={1}
            className="w-28"
            value={cfg.min_amount}
            onChange={(e) =>
              upd({ min_amount: Math.max(1, Number(e.target.value) || 1) })
            }
          />
          <span>{d.fun.wheelRuleB}</span>
        </label>
        <div className="px-label mt-4">{d.fun.wheelSlots}</div>
        <p className="mb-2 text-sm text-ink-faint">{d.fun.wheelWeightHint}</p>
        <div className="grid grid-cols-[1fr_80px_90px_auto] gap-2 px-1 text-xs text-ink-faint">
          <span>{d.fun.wheelItem}</span>
          <span>{d.fun.wheelWeight}</span>
          <span>{d.fun.wheelChanceCol}</span>
          <span className="w-8" />
        </div>
        <ul className="grid gap-1">
          {cfg.items.map((it, i) => (
            <li
              key={i}
              className="grid grid-cols-[1fr_80px_90px_auto] items-center gap-2"
            >
              <Input
                value={it.label}
                maxLength={40}
                placeholder={d.fun.wheelItem}
                onChange={(e) =>
                  upd({
                    items: cfg.items.map((x, j) =>
                      j === i ? { ...x, label: e.target.value } : x,
                    ),
                  })
                }
              />
              <Input
                type="number"
                min={0}
                aria-label={d.fun.wheelWeight}
                value={it.weight}
                onChange={(e) =>
                  upd({
                    items: cfg.items.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            weight: Math.max(0, Number(e.target.value) || 0),
                          }
                        : x,
                    ),
                  })
                }
              />
              <span className="font-num text-sm text-ink-faint">
                {fmt(d.fun.wheelChance, {
                  pct: Math.round((Math.max(0, it.weight) / total) * 100),
                })}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={d.common.delete}
                disabled={cfg.items.length <= 2}
                onClick={() =>
                  upd({ items: cfg.items.filter((_, j) => j !== i) })
                }
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          size="sm"
          className="mt-2"
          disabled={cfg.items.length >= 12}
          onClick={() =>
            upd({ items: [...cfg.items, { label: "", weight: 1 }] })
          }
        >
          + {d.fun.wheelAdd}
        </Button>

        <div className="px-label mt-5">{d.fun.lookTitle}</div>
        <div className="mb-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={d.fun.lookTitle}>
          {WHEEL_LOOKS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={cfg.look === l}
              onClick={() => {
                upd({ look: l });
                setTrial((t) => ({ n: (t?.n ?? 0) + 1, result: t?.result ?? 0 }));
              }}
              className={`px-frame grid gap-0.5 p-2.5 text-left ${cfg.look === l ? "bg-ink text-paper" : "bg-paper hover:bg-paper-2"}`}
            >
              <span className="font-display">{d.fun.looks[l].name}</span>
              <span className={`text-sm ${cfg.look === l ? "text-paper/80" : "text-ink-soft"}`}>{d.fun.looks[l].hint}</span>
            </button>
          ))}
        </div>
        {(() => {
          const labels = cfg.items.map((i) => i.label.trim()).filter(Boolean);
          const items = labels.length > 1 ? labels : [...d.fun.lookSample];
          return (
            <div className="grid justify-items-center gap-2 bg-paper-2 p-3">
              {trial ? (
                <div className="w-full max-w-[520px] [&>.px-frame]:w-full">
                  <WheelSpin
                    key={`${cfg.look}-${trial.n}`}
                    look={cfg.look}
                    items={items}
                    result={trial.result % items.length}
                    accent={accent}
                    locale={locale}
                  />
                </div>
              ) : (
                <p className="text-sm text-ink-soft">{d.fun.lookTryHint}</p>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => setTrial((t) => ({ n: (t?.n ?? 0) + 1, result: Math.floor(Math.random() * items.length) }))}
              >
                {d.fun.lookTry}
              </Button>
            </div>
          );
        })()}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setFailed(false);
              try {
                await saveWheel({
                  ...cfg,
                  items: cfg.items.filter((i) => i.label.trim()),
                });
                setSaved(true);
              } catch (e) {
                if (isNextControl(e)) throw e;
                setFailed(true);
              }
            })
          }
        >
          {pending ? "…" : d.common.save}
        </Button>
        {saved && (
          <span className="font-display text-leaf">✓ {d.common.saved}</span>
        )}
        {failed && <span className="text-tomato">{d.common.errNetwork}</span>}
      </div>
    </div>
  );
}
