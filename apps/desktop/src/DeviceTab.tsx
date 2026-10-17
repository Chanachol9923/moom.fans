import { useEffect, useState } from "react";
import { useT } from "@moom/shared/i18n/react";
import { Button, Check, Field, Panel, Select } from "@moom/shared/ui/kit";
import { acceleratorFrom, DEFAULT_HOTKEY, prettyHotkey, type DeviceSettings } from "./device";
import { isTauri } from "./platform";

export function DeviceTab({
  device,
  setDevice,
  accountVolume,
  hotkeyOk,
  onTest,
}: {
  device: DeviceSettings;
  setDevice: (p: Partial<DeviceSettings>) => void;
  accountVolume: number;
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
