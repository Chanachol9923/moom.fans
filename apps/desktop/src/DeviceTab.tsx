import { useEffect, useState } from "react";
import { useT } from "@moom/shared/i18n/react";
import { fmt } from "@moom/shared/i18n";
import { Button, Check, Field, Panel, Select, cx } from "@moom/shared/ui/kit";
import { acceleratorFrom, DEFAULT_HOTKEY, prettyHotkey, type DeviceSettings } from "./device";
import { isTauri, openExternal, SPEECH_SETTINGS } from "./platform";
import { hasVoiceFor, pickVoice, speakLocal, useVoices } from "./voice";

export function DeviceTab({
  device,
  setDevice,
  accountVolume,
  ttsOnAccount,
  hotkeyOk,
  onTest,
}: {
  device: DeviceSettings;
  setDevice: (p: Partial<DeviceSettings>) => void;
  accountVolume: number;
  /** Reading aloud is switched on in the account's overlay settings. */
  ttsOnAccount: boolean;
  hotkeyOk: boolean;
  onTest: () => void;
}) {
  const { d } = useT();
  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-faint">{d.desktop.deviceOnlyNote}</p>

      <Panel title={d.desktop.audioDevice}>
        <AudioOutput value={device.sinkId} onChange={(sinkId) => setDevice({ sinkId })} />
        <Check
          label={d.desktop.useAccountVolume}
          checked={device.volume === null}
          onChange={(e) => setDevice({ volume: e.target.checked ? null : accountVolume })}
        />
        <Field label={`${d.desktop.volume}: ${device.volume ?? accountVolume}`}>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            disabled={device.volume === null}
            value={device.volume ?? accountVolume}
            onChange={(e) => setDevice({ volume: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </Field>
        <Button size="sm" onClick={onTest}>
          {d.desktop.testAlert}
        </Button>
      </Panel>

      <VoicePanel device={device} setDevice={setDevice} volume={device.volume ?? accountVolume} on={ttsOnAccount} />

      <Panel title={d.desktop.hotkey}>
        <HotkeyField value={device.hotkey} onChange={(hotkey) => setDevice({ hotkey })} />
        <p className="mt-2 text-sm text-ink-faint">{d.desktop.hotkeyHint}</p>
        {isTauri && !hotkeyOk && <p className="mt-1 text-sm text-tomato">{d.desktop.hotkeyUnavailable}</p>}
        {!isTauri && <p className="mt-1 text-sm text-ink-faint">{d.desktop.browserMode}</p>}
      </Panel>
    </div>
  );
}

function AudioOutput({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { d } = useT();
  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!md?.enumerateDevices) return;
    const load = () =>
      md.enumerateDevices().then((all) => setOutputs(all.filter((x) => x.kind === "audiooutput" && x.deviceId !== "default")));
    void load();
    md.addEventListener("devicechange", load);
    return () => md.removeEventListener("devicechange", load);
  }, [attempt]);

  // Browsers hide device names until the page has had microphone permission once.
  const unnamed = outputs.length > 0 && outputs.every((o) => !o.label);
  return (
    <Field label={d.desktop.audioDevice}>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{d.desktop.audioDefault}</option>
        {outputs.map((o, i) => (
          <option key={o.deviceId} value={o.deviceId}>
            {o.label || `${d.desktop.audioDevice} ${i + 1}`}
          </option>
        ))}
      </Select>
      {unnamed && (
        <button
          type="button"
          className="mt-1 text-sm underline"
          onClick={async () => {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
            s?.getTracks().forEach((t) => t.stop());
            setAttempt((n) => n + 1);
          }}
        >
          {d.desktop.audioReveal}
        </button>
      )}
    </Field>
  );
}

function HotkeyField({ value, onChange }: { value: string; onChange: (acc: string) => void }) {
  const { d } = useT();
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === "Escape") return setRecording(false);
      const acc = acceleratorFrom(e);
      if (!acc) return;
      onChange(acc);
      setRecording(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recording, onChange]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <kbd className="px-input w-auto min-w-40 font-mono">{recording ? d.desktop.hotkeyRecord : prettyHotkey(value)}</kbd>
      <Button size="sm" onClick={() => setRecording((r) => !r)}>
        {recording ? d.common.cancel : d.desktop.hotkeyChange}
      </Button>
      {value !== DEFAULT_HOTKEY && !recording && (
        <Button size="sm" variant="ghost" onClick={() => onChange(DEFAULT_HOTKEY)}>
          {d.desktop.hotkeyReset}
        </Button>
      )}
    </div>
  );
}

function VoicePanel({
  device,
  setDevice,
  volume,
  on,
}: {
  device: DeviceSettings;
  setDevice: (p: Partial<DeviceSettings>) => void;
  volume: number;
  on: boolean;
}) {
  const { d, locale } = useT();
  const V = d.desktop.voice;
  const voices = useVoices();
  const lang = locale === "th" ? "th-TH" : "en-US";
  const missing = voices.length > 0 && !hasVoiceFor(voices, lang);
  const pc = device.tts === "pc";
  // Thai first, then the rest, so the right voice is easy to find.
  const sorted = [...voices].sort(
    (a, b) => Number(b.lang.startsWith(lang.slice(0, 2))) - Number(a.lang.startsWith(lang.slice(0, 2))) || a.name.localeCompare(b.name),
  );

  return (
    <Panel title={V.title}>
      <p className="mb-3 text-sm text-ink-soft">{V.intro}</p>
      {!on && <p className="mb-3 bg-beak/40 p-2 text-sm">{V.offOnWeb}</p>}
      <div className="px-label">{V.source}</div>
      <div className="mb-3 flex flex-wrap gap-1" role="radiogroup">
        {(["pc", "web"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={device.tts === k}
            onClick={() => setDevice({ tts: k })}
            className={cx("px-btn px-btn-sm", device.tts === k ? "px-btn-primary" : "px-btn-ghost")}
          >
            {k === "pc" ? V.sourcePc : V.sourceWeb}
          </button>
        ))}
      </div>

      {pc && (
        <>
          {missing && (
            <div className="mb-3 bg-beak/40 p-2 text-sm">
              <p>{V.noThai}</p>
              {isTauri && (
                <Button size="sm" className="mt-2" onClick={() => openExternal(SPEECH_SETTINGS)}>
                  {V.openSettings}
                </Button>
              )}
            </div>
          )}
          <Field label={V.voice} htmlFor="voice">
            <Select id="voice" value={device.voiceURI} onChange={(e) => setDevice({ voiceURI: e.target.value })}>
              <option value="">{V.auto}</option>
              {sorted.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label={`${V.rate}: ${device.rate.toFixed(1)}x`}>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={device.rate}
                onChange={(e) => setDevice({ rate: Number(e.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
            </Field>
            <Field label={`${V.pitch}: ${device.pitch.toFixed(1)}`}>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.1}
                value={device.pitch}
                onChange={(e) => setDevice({ pitch: Number(e.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
            </Field>
          </div>
          <Button
            size="sm"
            onClick={() =>
              void speakLocal(fmt(V.testText, { name: "Moom" }), {
                voice: pickVoice(voices, device.voiceURI, lang),
                lang,
                rate: device.rate,
                pitch: device.pitch,
                volume,
              })
            }
          >
            {V.test}
          </Button>
          <p className="mt-2 text-xs text-ink-faint">{V.sinkNote}</p>
        </>
      )}
    </Panel>
  );
}
