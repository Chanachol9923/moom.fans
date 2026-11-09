"use client";
import { useState, useTransition } from "react";
import { useT } from "@moom/shared/i18n/react";
import type { PresetKind, SavedPreset } from "@moom/shared/presets";
import { Button, Input } from "@moom/shared/ui/kit";
import { errorText, isNextControl } from "@/lib/errors";
import { deletePreset, savePreset } from "./more-actions";

type Look<K extends PresetKind> = Extract<SavedPreset, { kind: K }>["look"];

/**
 * Built-in starting points plus the streamer's own saved looks, and "save this look".
 * Saved presets are per account, so they're there on every tier and every PC.
 */
export function PresetBar<K extends PresetKind>({
  kind,
  builtins,
  saved,
  onSaved,
  current,
  onApply,
}: {
  kind: K;
  builtins: Array<{ name: string; look: Look<K> }>;
  saved: SavedPreset[];
  onSaved: (all: SavedPreset[]) => void;
  current: Look<K>;
  onApply: (look: Look<K>) => void;
}) {
  const { d } = useT();
  const P = d.presets;
  const mine = saved.filter((p): p is Extract<SavedPreset, { kind: K }> => p.kind === kind);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: true; presets: SavedPreset[] } | { ok: false; error: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      try {
        const r = await fn();
        if (!r) return; // the action redirected (session expired)
        if (r.ok) {
          onSaved(r.presets);
          after?.();
        } else setError(r.error === "too_many" ? P.tooMany : errorText(r.error, d));
      } catch (e) {
        if (isNextControl(e)) throw e;
        setError(d.common.errNetwork);
      }
    });

  return (
    <div className="grid gap-2">
      <div className="px-label">{P.title}</div>
      <div className="flex flex-wrap gap-1.5">
        {builtins.map((b) => (
          <Button key={b.name} size="sm" variant="ghost" onClick={() => onApply(b.look)}>
            {b.name}
          </Button>
        ))}
        {mine.map((p) => (
          <span key={p.id} className="inline-flex items-stretch">
            <Button size="sm" onClick={() => onApply(p.look as Look<K>)} title={P.apply}>
              {p.name}
            </Button>
            <button
              type="button"
              className="px-1.5 text-ink-faint hover:text-tomato"
              aria-label={`${P.delete} ${p.name}`}
              title={P.delete}
              disabled={pending}
              onClick={() => run(() => deletePreset(p.id))}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      {naming ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            run(
              () => savePreset(kind, name, current),
              () => {
                setNaming(false);
                setName("");
              },
            );
          }}
        >
          <Input
            autoFocus
            value={name}
            maxLength={40}
            placeholder={P.namePlaceholder}
            onChange={(e) => setName(e.target.value)}
            className="max-w-56"
            aria-label={P.name}
          />
          <Button type="submit" size="sm" variant="primary" disabled={pending || !name.trim()}>
            {pending ? "…" : P.save}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setNaming(false)}>
            {d.common.cancel}
          </Button>
        </form>
      ) : (
        <div>
          <Button size="sm" variant="ghost" onClick={() => setNaming(true)}>
            + {P.saveCurrent}
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-tomato">{error}</p>}
    </div>
  );
}
