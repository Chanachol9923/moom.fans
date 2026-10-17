import { useEffect, useRef, useState } from "react";
import { fmt } from "@moom/shared/i18n";
import { useT } from "@moom/shared/i18n/react";
import type { useOverlayEngine } from "@moom/shared/overlay/engine";
import { CopyField } from "@moom/shared/ui/CopyField";
import { Button, Panel, Tag } from "@moom/shared/ui/kit";
import { prettyHotkey } from "./device";
import { isTauri, obsUrl, onServerError, openExternal } from "./platform";
import { SITE } from "./session";

type Engine = ReturnType<typeof useOverlayEngine>;

export function HomeTab({
  engine,
  clientCount,
  reviewCount,
  hotkey,
  hotkeyOk,
  onTest,
}: {
  engine: Engine;
  clientCount: number;
  reviewCount: number;
  hotkey: string;
  hotkeyOk: boolean;
  onTest: () => void;
}) {
  const { d } = useT();
  const { connected, view, held, queueLength } = engine;
  const [serverError, setServerError] = useState<string | null>(null);
  useEffect(() => onServerError(setServerError), []);
  const status =
    connected === "live" ? (
      <Tag tone="ok">{d.desktop.statusLive}</Tag>
    ) : connected === "connecting" ? (
      <Tag tone="warn">{d.desktop.statusConnecting}</Tag>
    ) : (
      <Tag tone="bad">{d.desktop.statusOffline}</Tag>
    );

  return (
    <div className="grid gap-4">
      {held.length > 0 && (
        <div className="px-frame flex flex-wrap items-center gap-3 bg-beak/40 p-3">
          <span className="flex-1 font-display">{fmt(d.desktop.missedTitle, { count: held.length })}</span>
          <Button size="sm" variant="primary" onClick={() => engine.releaseHeld(true)}>
            {d.desktop.missedPlay}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => engine.releaseHeld(false)}>
            {d.desktop.missedSkip}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {status}
        <Tag tone={clientCount > 0 ? "ok" : "muted"}>{fmt(d.desktop.overlayClients, { count: clientCount })}</Tag>
        <Tag tone="muted">{fmt(d.desktop.queue, { count: queueLength })}</Tag>
        {reviewCount > 0 && (
          <button type="button" onClick={() => openExternal(`${SITE}/dashboard/review`)} className="px-tag bg-beak">
            {fmt(d.desktop.review, { count: reviewCount })} →
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <StagePreview />
        <div className="grid content-start gap-2 sm:w-52">
          {view.paused ? (
            <Button variant="primary" className="w-full py-4" onClick={engine.resume}>
              ▶ {d.overlay.resume}
            </Button>
          ) : (
            <Button variant="danger" className="w-full py-4" onClick={engine.panic}>
              ■ {d.overlay.panic}
            </Button>
          )}
          <Button className="w-full" disabled={!view.current} onClick={engine.skip}>
            {d.overlay.skip}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onTest}>
            {d.desktop.testAlert}
          </Button>
          {isTauri && (
            <p className={`text-xs ${hotkeyOk ? "text-ink-faint" : "text-tomato"}`}>
              {hotkeyOk ? (
                <>
                  {d.desktop.hotkey}: <kbd className="font-mono">{prettyHotkey(hotkey)}</kbd>
                </>
              ) : (
                d.desktop.hotkeyUnavailable
              )}
            </p>
          )}
        </div>
      </div>

      <Panel title={d.desktop.obsUrl}>
        <CopyField value={obsUrl()} />
        {serverError && (
          <p className="mt-2 bg-tomato p-2 text-sm text-paper">
            {d.desktop.serverError} <span className="font-mono text-xs opacity-80">({serverError})</span>
          </p>
        )}
        <p className="mt-2 text-sm text-ink-faint">{d.desktop.obsHint}</p>
        <p className="mt-1 text-sm text-ink-faint">{d.desktop.obsAudioHint}</p>
      </Panel>

      {engine.soundBlocked && <p className="text-sm text-tomato">{d.alert.clickForSound}</p>}
      {!isTauri && <p className="text-xs text-ink-faint">{d.desktop.browserMode}</p>}
    </div>
  );
}

/** The OBS page itself, scaled down. It draws from the same messages OBS gets. */
function StagePreview() {
  const { d } = useT();
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 1920));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div>
      <div className="px-label">{d.desktop.preview}</div>
      <div ref={box} className="px-frame px-checker relative aspect-video overflow-hidden">
        <iframe
          title={d.desktop.preview}
          src={obsUrl("preview=1")}
          width={1920}
          height={1080}
          className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
          style={{ transform: `scale(${scale})`, colorScheme: "normal" }}
        />
      </div>
    </div>
  );
}
