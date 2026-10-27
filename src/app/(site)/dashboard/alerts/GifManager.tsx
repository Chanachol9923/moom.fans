"use client";
import { useState, useTransition } from "react";
import { fmt } from "@moom/shared/i18n";
import { useT } from "@moom/shared/i18n/react";
import { MAX_GIF_BYTES, MAX_GIFS, mediaKindOf, newGifId, type StoredGif } from "@moom/shared/overlay/design";
import { Button, Field, Input, Panel } from "@moom/shared/ui/kit";
import { uploadPublicMedia, type SupabasePublic } from "@/lib/upload-client";
import { saveAlertGifs, sendTestGif } from "../actions";

const TYPES = "image/gif,image/webp,image/png,image/jpeg,video/webm,video/mp4";

/** The GIFs supporters can pick on the tip page. */
export function GifManager({
  initialGifs,
  initialMin,
  urls: initialUrls,
  userId,
  supabase,
}: {
  initialGifs: StoredGif[];
  initialMin: number;
  urls: Record<string, string>;
  userId: string;
  supabase: SupabasePublic;
}) {
  const { d } = useT();
  const G = d.design.gifs;
  const [gifs, setGifs] = useState(initialGifs);
  const [min, setMin] = useState(initialMin);
  const [urls, setUrls] = useState(initialUrls);
  const [busy, setBusy] = useState(0);
  const [problems, setProblems] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "ok" | "error" | "not_ready">("idle");
  const [pending, start] = useTransition();
  const [testing, startTest] = useTransition();

  const dirty = () => setStatus("idle");

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    dirty();
    const room = MAX_GIFS - gifs.length;
    const list = [...files];
    const bad: string[] = [];
    if (list.length > room) bad.push(fmt(G.tooMany, { max: MAX_GIFS }));
    setBusy((n) => n + Math.min(room, list.length));
    for (const f of list.slice(0, room)) {
      try {
        if (f.size > MAX_GIF_BYTES) throw new Error("size");
        const path = await uploadPublicMedia(supabase, userId, f, "gifs");
        setUrls((u) => ({ ...u, [path]: URL.createObjectURL(f) }));
        const label = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 40);
        setGifs((g) => (g.length >= MAX_GIFS ? g : [...g, { id: newGifId(), path, label }]));
      } catch (e) {
        bad.push(`${f.name}: ${(e as Error).message === "size" ? G.tooBig : d.design.uploadFailed}`);
      } finally {
        setBusy((n) => n - 1);
      }
    }
    setProblems(bad);
  };

  const save = () =>
    start(async () => {
      const r = await saveAlertGifs(gifs, min).catch(() => ({ ok: false, error: "network" }));
      if (!r) return; // the action redirected (session expired)
      setStatus(r.ok ? "ok" : r.error === "not_ready" ? "not_ready" : "error");
    });

  return (
    <Panel title={G.title} aside={<span className="font-num text-sm text-ink-faint">{gifs.length} / {MAX_GIFS}</span>}>
      <p className="mb-3 text-sm text-ink-soft">{G.intro}</p>

      <div className="mb-3 flex flex-wrap items-end gap-4">
        <label className="px-btn px-btn-sm cursor-pointer">
          {busy > 0 ? `… ${busy}` : `+ ${G.add}`}
          <input
            type="file"
            accept={TYPES}
            multiple
            className="hidden"
            disabled={gifs.length >= MAX_GIFS}
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <div className="w-44">
          <Field label={G.min} htmlFor="gif-min">
            <Input
              id="gif-min"
              type="number"
              min={0}
              step="1"
              value={min}
              onChange={(e) => {
                dirty();
                setMin(Math.max(0, Number(e.target.value) || 0));
              }}
            />
          </Field>
        </div>
      </div>
      <p className="mb-3 text-xs text-ink-faint">{G.hint}</p>
      {problems.map((p) => (
        <p key={p} className="text-sm text-tomato">
          {p}
        </p>
      ))}

      {gifs.length === 0 ? (
        <p className="bg-paper-2 p-3 text-sm text-ink-soft">{G.empty}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {gifs.map((g, i) => {
            const url = urls[g.path];
            return (
              <div key={g.id} className="px-frame bg-paper-2 p-2">
                <div className="px-checker grid aspect-square place-items-center overflow-hidden">
                  {url &&
                    (mediaKindOf(g.path) === "video" ? (
                      <video src={url} className="size-full object-contain" autoPlay muted loop playsInline />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- streamer uploads
                      <img src={url} alt="" className="size-full object-contain" />
                    ))}
                </div>
                <Input
                  value={g.label}
                  maxLength={40}
                  placeholder={G.label}
                  aria-label={G.label}
                  className="mt-2 text-sm"
                  onChange={(e) => {
                    dirty();
                    const label = e.target.value;
                    setGifs((all) => all.map((x, j) => (j === i ? { ...x, label } : x)));
                  }}
                />
                <div className="mt-1.5 flex gap-1">
                  <Button
                    size="sm"
                    variant="beak"
                    className="flex-1"
                    disabled={testing || !initialGifs.some((x) => x.id === g.id)}
                    title={initialGifs.some((x) => x.id === g.id) ? undefined : G.saveFirst}
                    onClick={() => startTest(() => sendTestGif(g.id).catch(() => {}))}
                  >
                    {d.design.test}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={d.design.remove}
                    onClick={() => {
                      dirty();
                      setGifs((all) => all.filter((x) => x.id !== g.id));
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button variant="primary" onClick={save} disabled={pending || busy > 0}>
          {pending ? d.common.loading : d.common.save}
        </Button>
        {status === "ok" && !pending && <span className="font-display text-leaf">✓ {G.saved}</span>}
        {status === "error" && <span className="text-tomato">{d.common.error}</span>}
        {status === "not_ready" && <span className="text-tomato">{d.design.notReady}</span>}
      </div>
    </Panel>
  );
}
