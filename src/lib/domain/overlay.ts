import "server-only";
import type { AlertPayload, OverlayAlert, OverlayConfig, OverlayPet, OverlayState, VtsRule } from "@moom/shared/alerts";
import { publicEnv } from "@/lib/env";
import { resolveSprite } from "@moom/shared/pets/sprites";
import { overlayTopic } from "@/lib/realtime";
import { publicMediaUrl } from "@/lib/storage";
import { admin } from "@/lib/supabase/admin";

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

export async function streamerByOverlayToken(token: string) {
  if (!TOKEN_RE.test(token)) return null;
  const { data } = await admin()
    .from("streamer_private")
    .select("streamer_id, overlay_channel, blocked_words")
    .eq("overlay_token", token)
    .maybeSingle();
  return data;
}

export async function streamerByControlToken(token: string) {
  if (!TOKEN_RE.test(token)) return null;
  const { data } = await admin()
    .from("streamer_private")
    .select("streamer_id, overlay_channel")
    .eq("control_token", token)
    .maybeSingle();
  return data;
}

function asRules(v: unknown): VtsRule[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (r): r is VtsRule =>
      !!r &&
      typeof r === "object" &&
      typeof (r as VtsRule).min_amount === "number" &&
      ((r as VtsRule).kind === "hotkey" || (r as VtsRule).kind === "item") &&
      typeof (r as VtsRule).ref === "string",
  );
}

export async function loadOverlayState(token: string): Promise<OverlayState | null> {
  const s = await streamerByOverlayToken(token);
  if (!s) return null;
  const db = admin();
  const [{ data: profile }, { data: settings }, { data: alerts }, { data: pets }] = await Promise.all([
    db.from("profiles").select("slug, display_name, accent_color, locale").eq("id", s.streamer_id).single(),
    db.from("overlay_settings").select("*").eq("streamer_id", s.streamer_id).single(),
    db
      .from("alerts")
      .select("id, kind, payload, created_at")
      .eq("streamer_id", s.streamer_id)
      .eq("status", "queued")
      .order("created_at")
      .limit(25),
    db.from("pets").select("*").eq("streamer_id", s.streamer_id).eq("is_active", true).order("created_at").limit(8),
  ]);
  if (!profile || !settings) return null;

  const config: OverlayConfig = {
    position: settings.position,
    alertStyle: settings.alert_style,
    volume: settings.volume,
    displaySeconds: settings.display_seconds,
    alertSoundUrl: publicMediaUrl(settings.alert_sound_path),
    ttsEnabled: settings.tts_enabled,
    mediaEnabled: settings.media_enabled,
    vtsEnabled: settings.vts_enabled,
    vtsRules: asRules(settings.vts_rules),
    petsEnabled: settings.pets_enabled,
    twitchChannel: settings.twitch_channel,
    accent: profile.accent_color,
    locale: profile.locale,
    blockedWords: s.blocked_words,
  };

  return {
    streamer: { displayName: profile.display_name, slug: profile.slug },
    config,
    alerts: (alerts ?? []).map(
      (a): OverlayAlert => ({
        id: a.id,
        kind: a.kind,
        createdAt: a.created_at,
        payload: a.payload as unknown as AlertPayload,
      }),
    ),
    pets: (pets ?? []).flatMap((p): OverlayPet[] => {
      const sprite = resolveSprite(p.species, p.palette, p.sprite);
      return sprite ? [{ id: p.id, name: p.name, chatter: p.chatter, sprite }] : [];
    }),
    realtime: {
      url: publicEnv.supabaseUrl(),
      key: publicEnv.supabaseKey(),
      channel: overlayTopic(s.overlay_channel),
    },
  };
}
