"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Check, Input, Panel, Select, Tag } from "@moom/shared/ui/kit";
import { MAX_VTS_ITEMS, type VtsRule } from "@moom/shared/alerts";
import { fmt, formatBaht } from "@moom/shared/i18n";
import { useT } from "@moom/shared/i18n/react";
import { vtsActionsFor } from "@moom/shared/overlay/queue";
import { VtsClient, type VtsHotkey, type VtsItemFile } from "@moom/shared/vts";
import { saveVtsRules } from "../actions";
import { isNextControl } from "@/lib/errors";

const TOKEN_KEY = "moom_vts_token_dashboard";

function hasToken() {
  try {
    return Boolean(localStorage.getItem(TOKEN_KEY));
  } catch {
    return false;
  }
}

export function VtsManager({ enabled: initialEnabled, rules: initialRules }: { enabled: boolean; rules: VtsRule[] }) {
  const { d, locale } = useT();
  const V = d.vts;
  const client = useRef<VtsClient | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle");
  const [hotkeys, setHotkeys] = useState<VtsHotkey[]>([]);
  const [items, setItems] = useState<VtsItemFile[]>([]);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [rules, setRules] = useState<VtsRule[]>(initialRules.map((r) => ({ ...r, count: r.count ?? 1 })));
  const [tryAmount, setTryAmount] = useState(100);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const connected = status === "connected";

  async function connect() {
    setStatus("connecting");
    client.current?.close();
    const c = new VtsClient(TOKEN_KEY);
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

  // Allowed before on this computer: connect straight away, no VTube Studio pop-up.
  useEffect(() => {
    const t = hasToken() ? setTimeout(() => void connect(), 0) : undefined;
    return () => {
      clearTimeout(t);
      client.current?.close();
    };
  }, []);

  const update = (i: number, patch: Partial<VtsRule>) => {
    setSaved(false);
    setError(null);
    setRules((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  };

  const run = (r: VtsRule) => {
    const c = client.current;
    if (!c || !r.ref) return;
    void (r.kind === "hotkey" ? c.triggerHotkeyOrName(r.ref, r.label) : c.throwItems(r.ref, r.count)).catch(() => {});
  };

  const nameOf = (r: VtsRule) =>
    r.kind === "hotkey" ? (hotkeys.find((h) => h.hotkeyID === r.ref)?.name || r.label || r.ref) : r.ref;
  const firing = vtsActionsFor(rules.filter((r) => r.ref), tryAmount);

  const save = () =>
    start(async () => {
      setError(null);
      if (rules.some((r) => !r.ref)) return setError(V.notPickedSave);
      try {
        await saveVtsRules(enabled, rules);
        setRules((r) => [...r].sort((a, b) => a.min_amount - b.min_amount));
        setSaved(true);
      } catch (e) {
        if (isNextControl(e)) throw e;
        setError(d.common.errNetwork);
      }
    });

  return (
    <>
      <Panel
        title={V.connectTitle}
        aside={
          <Tag tone={connected ? "ok" : status === "failed" ? "bad" : "muted"}>
            {connected ? V.connected : status === "connecting" ? d.common.loading : V.disconnected}
          </Tag>
        }
      >
        <ol className="list-decimal space-y-1 pl-5 text-ink-soft">
          <li>{V.step1}</li>
          <li>{V.step2}</li>
          <li>{V.step3}</li>
        </ol>
        <p className="mt-2 text-sm text-ink-faint">{V.obsNote}</p>
        <Button className="mt-3" variant={connected ? undefined : "primary"} onClick={() => void connect()} disabled={status === "connecting"}>
          {status === "connecting" ? d.common.loading : connected ? V.reconnect : V.connect}
        </Button>
        {status === "failed" && <p className="mt-2 text-tomato">{V.failed}</p>}
        {connected && (
          <details className="mt-4">
            <summary className="cursor-pointer font-display">{fmt(V.seeAll, { hotkeys: hotkeys.length, items: items.length })}</summary>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="px-label">{V.hotkeys}</div>
                {hotkeys.length === 0 && <p className="text-sm text-ink-faint">{V.noHotkeys}</p>}
                <ul className="text-sm">
                  {hotkeys.map((h) => (
                    <li key={h.hotkeyID} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="truncate">{h.name || h.hotkeyID}</span>
                      <Button size="sm" variant="ghost" onClick={() => void client.current?.triggerHotkey(h.hotkeyID).catch(() => {})}>
                        {V.test}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="px-label">{V.items}</div>
                {items.length === 0 && <p className="text-sm text-ink-faint">{V.noItems}</p>}
                <ul className="text-sm">
                  {items.map((it) => (
                    <li key={it.fileName} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="truncate">{it.fileName}</span>
                      <Button size="sm" variant="ghost" onClick={() => void client.current?.throwItem(it.fileName).catch(() => {})}>
                        {V.test}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        )}
      </Panel>

      <Panel title={V.rulesTitle}>
        <Check
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            setSaved(false);
          }}
          label={V.enabled}
        />
        <p className="mb-3 text-sm text-ink-soft">{V.rulesHint}</p>
        {!connected && rules.some((r) => !r.ref) && <p className="mb-3 bg-beak/30 p-2 text-sm">{V.needConnect}</p>}
        {rules.length === 0 && <p className="mb-2 text-ink-soft">{V.rulesEmpty}</p>}

        <ul className={`grid gap-2 ${enabled ? "" : "opacity-60"}`}>
          {rules.map((r, i) => {
            const options = r.kind === "hotkey" ? hotkeys.map((h) => ({ value: h.hotkeyID, label: h.name || h.hotkeyID })) : items.map((it) => ({ value: it.fileName, label: it.fileName }));
            const missing = connected && r.ref && !options.some((o) => o.value === r.ref);
            return (
              <li key={i} className="grid gap-2 bg-paper-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{V.when}</span>
                  <Input
                    type="number"
                    min={1}
                    className="font-num w-24"
                    value={r.min_amount || ""}
                    aria-label={V.when}
                    onChange={(e) => update(i, { min_amount: Math.max(0, Number(e.target.value) || 0) })}
                  />
                  <span>{V.bahtThen}</span>
                  <Select
                    className="w-auto"
                    value={r.kind}
                    aria-label={V.action}
                    onChange={(e) => update(i, { kind: e.target.value as VtsRule["kind"], ref: "", label: "" })}
                  >
                    <option value="hotkey">{V.kindHotkey}</option>
                    <option value="item">{V.kindItem}</option>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {connected && options.length > 0 ? (
                    <Select
                      className="w-auto min-w-48"
                      value={missing ? "" : r.ref}
                      aria-label={r.kind === "hotkey" ? V.pickHotkey : V.pickItem}
                      onChange={(e) => {
                        const o = options.find((x) => x.value === e.target.value);
                        update(i, { ref: e.target.value, label: o?.label ?? "" });
                      }}
                    >
                      <option value="">{r.kind === "hotkey" ? V.pickHotkey : V.pickItem}</option>
                      {options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <span className={`font-display ${r.ref ? "" : "text-ink-faint"}`}>{r.ref ? nameOf(r) : V.notPicked}</span>
                  )}
                  {r.kind === "item" && (
                    <label className="flex items-center gap-1.5">
                      <span>{V.count}</span>
                      <Input
                        type="number"
                        min={1}
                        max={MAX_VTS_ITEMS}
                        className="font-num w-16"
                        value={r.count ?? 1}
                        onChange={(e) => update(i, { count: Math.max(1, Math.min(MAX_VTS_ITEMS, Math.round(Number(e.target.value) || 1))) })}
                      />
                      <span>{V.pieces}</span>
                    </label>
                  )}
                  <span className="ml-auto flex gap-1">
                    <Button size="sm" disabled={!connected || !r.ref} onClick={() => run(r)} title={connected ? undefined : V.needConnect}>
                      {V.test}
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={V.remove} title={V.remove} onClick={() => {
                      setSaved(false);
                      setRules((x) => x.filter((_, j) => j !== i));
                    }}>
                      ✕
                    </Button>
                  </span>
                </div>
                {missing && <p className="text-sm text-tomato">{fmt(V.missing, { name: r.label || r.ref })}</p>}
                {!r.ref && connected && <p className="text-sm text-ink-faint">{V.notPicked}</p>}
              </li>
            );
          })}
        </ul>

        <Button
          size="sm"
          className="mt-3"
          onClick={() => {
            setSaved(false);
            const top = Math.max(0, ...rules.map((r) => r.min_amount));
            setRules((r) => [...r, { min_amount: top ? top * 2 : 50, kind: "hotkey", ref: "", label: "", count: 1 }]);
          }}
        >
          + {V.addRule}
        </Button>

        {rules.some((r) => r.ref) && (
          <div className="mt-4 bg-paper-2 p-3">
            <label className="flex flex-wrap items-center gap-2">
              <span className="font-display">{V.tryTitle}</span>
              <Input
                type="number"
                min={1}
                className="font-num w-28"
                value={tryAmount || ""}
                onChange={(e) => setTryAmount(Math.max(0, Number(e.target.value) || 0))}
              />
              <span>{V.baht}</span>
            </label>
            <p className="mt-1 text-sm">
              {firing.length === 0
                ? fmt(V.tryNone, { amount: formatBaht(tryAmount, locale) })
                : fmt(V.tryResult, {
                    amount: formatBaht(tryAmount, locale),
                    actions: firing
                      .map((r) => (r.kind === "hotkey" ? fmt(V.doHotkey, { name: nameOf(r) }) : fmt(V.doItem, { name: nameOf(r), n: r.count ?? 1 })))
                      .join(" + "),
                  })}
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="primary" disabled={pending} onClick={save}>
            {pending ? "…" : d.common.save}
          </Button>
          {saved && <span className="font-display text-leaf">✓ {d.common.saved}</span>}
          {error && <span className="text-tomato">{error}</span>}
        </div>
      </Panel>
    </>
  );
}
