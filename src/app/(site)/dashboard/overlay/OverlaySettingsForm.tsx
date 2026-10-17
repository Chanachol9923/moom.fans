"use client";
import { useActionState, useState } from "react";
import { Button, Check, Field, Input, Panel, Select, Textarea } from "@/components/ui";
import { useT } from "@moom/shared/i18n/react";
import type { OverlaySettingsRow } from "@/lib/supabase/database.types";
import { TTS_VOICES } from "@/lib/tts/types";
import { uploadPublicMedia, type SupabasePublic } from "@/lib/upload-client";
import { saveOverlaySettings, type SaveResult } from "../actions";

const POSITIONS = ["top-left", "top-center", "top-right", "center", "bottom-left", "bottom-center", "bottom-right"] as const;

export function OverlaySettingsForm({
  settings: s,
  blockedWords,
  userId,
  soundUrl,
  supabase,
}: {
  settings: OverlaySettingsRow;
  blockedWords: string[];
  userId: string;
  soundUrl: string | null;
  supabase: SupabasePublic;
}) {
  const { d } = useT();
  const [state, action, pending] = useActionState<SaveResult, FormData>(saveOverlaySettings, { ok: false });
  const [soundPath, setSoundPath] = useState(s.alert_sound_path ?? "");
  const [soundBusy, setSoundBusy] = useState(false);
  const [preview, setPreview] = useState(soundUrl);

  return (
    <form action={action} className="grid gap-5">
      <Panel title={d.overlay.appearance}>
        <div className="grid gap-x-5 sm:grid-cols-2">
          <Field label={d.overlay.position} htmlFor="position">
            <Select id="position" name="position" defaultValue={s.position}>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {d.overlay.positions[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={d.overlay.alertStyle} htmlFor="alert_style">
            <Select id="alert_style" name="alert_style" defaultValue={s.alert_style}>
              {(["card", "compact", "banner"] as const).map((v) => (
                <option key={v} value={v}>
                  {d.overlay.alertStyles[v]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`${d.overlay.volume} (${s.volume})`} htmlFor="volume">
            <input
              id="volume"
              name="volume"
              type="range"
              min={0}
              max={100}
              defaultValue={s.volume}
              className="w-full accent-[var(--accent)]"
            />
          </Field>
          <Field label={d.overlay.displaySeconds} htmlFor="display_seconds">
            <Input id="display_seconds" name="display_seconds" type="number" min={3} max={60} defaultValue={s.display_seconds} />
          </Field>
          <Field label={d.overlay.minAlert} htmlFor="min_alert_amount">
            <Input id="min_alert_amount" name="min_alert_amount" type="number" min={0} step="1" defaultValue={s.min_alert_amount} />
          </Field>
        </div>

        <Field label={d.overlay.alertSound} hint={soundPath ? undefined : d.overlay.alertSoundDefault}>
          <input type="hidden" name="alert_sound_path" value={soundPath} />
          <div className="flex flex-wrap items-center gap-2">
            {preview && <audio src={preview} controls className="h-9" />}
            <label className="px-btn px-btn-sm cursor-pointer">
              {soundBusy ? "…" : d.overlay.alertSoundUpload}
              <input
                type="file"
                accept="audio/mpeg,audio/ogg,audio/wav,audio/webm"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setSoundBusy(true);
                  try {
                    const path = await uploadPublicMedia(supabase, userId, f, "sounds");
                    setSoundPath(path);
                    setPreview(URL.createObjectURL(f));
                  } finally {
                    setSoundBusy(false);
                  }
                }}
              />
            </label>
            {soundPath && (
              <Button type="button" size="sm" variant="ghost" onClick={() => (setSoundPath(""), setPreview(null))}>
                {d.overlay.alertSoundDefault}
              </Button>
            )}
          </div>
        </Field>
      </Panel>

      <Panel title={d.overlay.tts}>
        <Check name="tts_enabled" defaultChecked={s.tts_enabled} label={d.overlay.tts} />
        <div className="grid gap-x-5 sm:grid-cols-3">
          <Field label={d.overlay.ttsVoice} htmlFor="tts_voice">
            <Select id="tts_voice" name="tts_voice" defaultValue={s.tts_voice}>
              {TTS_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={d.overlay.ttsMin} htmlFor="tts_min_amount">
            <Input id="tts_min_amount" name="tts_min_amount" type="number" min={0} defaultValue={s.tts_min_amount} />
          </Field>
          <Field label={d.overlay.ttsMaxChars} htmlFor="tts_max_chars">
            <Input id="tts_max_chars" name="tts_max_chars" type="number" min={10} max={300} defaultValue={s.tts_max_chars} />
          </Field>
        </div>
        <Field label={d.overlay.words} hint={d.overlay.wordsHint} htmlFor="blocked_words">
          <Textarea id="blocked_words" name="blocked_words" rows={4} defaultValue={blockedWords.join("\n")} />
        </Field>
      </Panel>

      <Panel title={d.overlay.media}>
        <Check name="media_enabled" defaultChecked={s.media_enabled} label={d.overlay.media} />
        <div className="grid gap-x-5 sm:grid-cols-2">
          <Field label={d.overlay.mediaRate} htmlFor="media_baht_per_second">
            <Input
              id="media_baht_per_second"
              name="media_baht_per_second"
              type="number"
              min={0.1}
              step="0.1"
              defaultValue={s.media_baht_per_second}
            />
          </Field>
          <Field label={d.overlay.mediaMax} htmlFor="media_max_seconds">
            <Input id="media_max_seconds" name="media_max_seconds" type="number" min={5} max={600} defaultValue={s.media_max_seconds} />
          </Field>
        </div>
        <Check name="media_requires_approval" defaultChecked={s.media_requires_approval} label={d.overlay.mediaApproval} />
      </Panel>

      <Panel title={d.overlay.pets}>
        <Check name="pets_enabled" defaultChecked={s.pets_enabled} label={d.overlay.pets} />
        <Field label={d.overlay.twitch} hint={d.overlay.twitchHint} htmlFor="twitch_channel">
          <Input id="twitch_channel" name="twitch_channel" defaultValue={s.twitch_channel ?? ""} maxLength={25} />
        </Field>
      </Panel>

      <div className="sticky bottom-3 flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? d.common.loading : d.common.save}
        </Button>
        {state.ok && !pending && <span className="font-display text-leaf">✓ {d.common.saved}</span>}
        {state.error && <span className="text-tomato">{d.common.error} ({state.error})</span>}
      </div>
    </form>
  );
}
