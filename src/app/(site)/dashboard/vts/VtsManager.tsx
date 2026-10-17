"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Check, Input, Panel, Select, Tag } from "@/components/ui";
import type { VtsRule } from "@moom/shared/alerts";
import { useT } from "@moom/shared/i18n/react";
import { VtsClient, type VtsHotkey, type VtsItemFile } from "@moom/shared/vts";
import { saveVtsRules } from "../actions";

export function VtsManager({ enabled: initialEnabled, rules: initialRules }: { enabled: boolean; rules: VtsRule[] }) {
  const { d } = useT();
  const client = useRef<VtsClient | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle");
  const [hotkeys, setHotkeys] = useState<VtsHotkey[]>([]);
  const [items, setItems] = useState<VtsItemFile[]>([]);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [rules, setRules] = useState<VtsRule[]>(initialRules);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => () => client.current?.close(), []);

  async function connect() {
    setStatus("connecting");
    const c = new VtsClient("moom_vts_token_dashboard");
    try {
      await c.connect();
      client.current = c;
      const [hk, it] = await Promise.all([c.hotkeys(), c.itemFiles().catch(() => [])]);
      setHotkeys(hk);
      setItems(it);
      setStatus("connected");
    } catch {
      setStatus("failed");
    }
  }

  const update = (i: number, patch: Partial<VtsRule>) => {
    setSaved(false);
    setRules((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  };

  return (
    <>
      <Panel
        title={d.vts.connect}
        aside={
          <Tag tone={status === "connected" ? "ok" : status === "failed" ? "bad" : "muted"}>
            {status === "connected" ? d.vts.connected : d.vts.disconnected}
          </Tag>
        }
      >
        <p className="text-ink-soft">{d.vts.how}</p>
        <p className="mt-1 text-sm text-ink-faint">{d.vts.obsNote}</p>
        <Button className="mt-3" onClick={connect} disabled={status === "connecting"}>
          {status === "connecting" ? d.common.loading : d.vts.connect}
        </Button>
        {status === "failed" && <p className="mt-2 text-tomato">{d.vts.failed}</p>}
        {status === "connected" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="px-label">{d.vts.hotkeys}</div>
              <ul className="text-sm">
                {hotkeys.map((h) => (
                  <li key={h.hotkeyID} className="flex items-center justify-between gap-2 py-0.5">
                    <span>{h.name || h.hotkeyID}</span>
                    <Button size="sm" variant="ghost" onClick={() => client.current?.triggerHotkey(h.hotkeyID)}>
                      {d.vts.test}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="px-label">{d.vts.items}</div>
              <ul className="text-sm">
                {items.map((it) => (
                  <li key={it.fileName} className="flex items-center justify-between gap-2 py-0.5">
                    <span className="truncate">{it.fileName}</span>
                    <Button size="sm" variant="ghost" onClick={() => client.current?.throwItem(it.fileName)}>
                      {d.vts.test}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Panel>

      <Panel title={d.vts.rules}>
        <Check
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            setSaved(false);
          }}
          label={d.vts.enabled}
        />
        {rules.length === 0 && <p className="text-ink-soft">{d.vts.rulesEmpty}</p>}
        <ul className="grid gap-2">
          {rules.map((r, i) => (
            <li key={i} className="grid items-center gap-2 sm:grid-cols-[140px_150px_1fr_auto]">
              <label className="flex items-center gap-1">
                <span className="text-sm text-ink-faint">≥</span>
                <Input
                  type="number"
                  min={0}
                  value={r.min_amount}
                  aria-label={d.vts.when}
                  onChange={(e) => update(i, { min_amount: Number(e.target.value) })}
                />
              </label>
              <Select value={r.kind} aria-label={d.vts.action} onChange={(e) => update(i, { kind: e.target.value as VtsRule["kind"], ref: "" })}>
                <option value="hotkey">{d.vts.kindHotkey}</option>
                <option value="item">{d.vts.kindItem}</option>
              </Select>
              {(r.kind === "hotkey" ? hotkeys.length : items.length) > 0 ? (
                <Select
                  value={r.ref}
                  onChange={(e) =>
                    update(i, {
                      ref: e.target.value,
                      label:
                        r.kind === "hotkey"
                          ? hotkeys.find((h) => h.hotkeyID === e.target.value)?.name ?? ""
                          : e.target.value,
                    })
                  }
                >
                  <option value="">—</option>
                  {r.kind === "hotkey"
                    ? hotkeys.map((h) => (
                        <option key={h.hotkeyID} value={h.hotkeyID}>
                          {h.name || h.hotkeyID}
                        </option>
                      ))
                    : items.map((it) => (
                        <option key={it.fileName} value={it.fileName}>
                          {it.fileName}
                        </option>
                      ))}
                </Select>
              ) : (
                <Input value={r.label || r.ref} readOnly placeholder={d.vts.disconnected} />
              )}
              <Button size="sm" variant="ghost" onClick={() => setRules((x) => x.filter((_, j) => j !== i))}>
                ✕
              </Button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setSaved(false);
              setRules((r) => [...r, { min_amount: 50, kind: "hotkey", ref: "", label: "" }]);
            }}
          >
            + {d.vts.addRule}
          </Button>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await saveVtsRules(enabled, rules.filter((r) => r.ref));
                setSaved(true);
              })
            }
          >
            {pending ? "…" : d.common.save}
          </Button>
          {saved && <span className="font-display text-leaf">✓ {d.common.saved}</span>}
        </div>
      </Panel>
    </>
  );
}
