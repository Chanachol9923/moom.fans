import { z } from "zod";
import type { AlertPayload } from "@moom/shared/alerts";
import { streamerByOverlayToken } from "@/lib/domain/overlay";
import { admin } from "@/lib/supabase/admin";
import { alertSpeech, ttsProvider } from "@/lib/tts";

// Speech for one alert. Tied to an existing alert of this streamer, so the endpoint
// can't be used as a free general-purpose TTS service.
export async function GET(_req: Request, ctx: RouteContext<"/api/overlay/[token]/tts/[id]">) {
  const { token, id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new Response("bad id", { status: 400 });
  const s = await streamerByOverlayToken(token);
  if (!s) return new Response("not found", { status: 404 });

  const db = admin();
  const [{ data: alert }, { data: settings }] = await Promise.all([
    db.from("alerts").select("kind, payload, created_at").eq("id", id).eq("streamer_id", s.streamer_id).maybeSingle(),
    db.from("overlay_settings").select("tts_enabled, tts_voice, tts_max_chars").eq("streamer_id", s.streamer_id).single(),
  ]);
  if (!alert || !settings?.tts_enabled) return new Response(null, { status: 204 });
  const payload = alert.payload as unknown as AlertPayload;
  if (!payload.tts) return new Response(null, { status: 204 });
  // Old alerts don't need speech; stops replaying the endpoint later.
  if (Date.now() - new Date(alert.created_at).getTime() > 6 * 3600_000) return new Response(null, { status: 204 });

  const text = alertSpeech(alert.kind, payload, settings.tts_max_chars);
  if (!text) return new Response(null, { status: 204 });
  try {
    const mp3 = await ttsProvider().synthesize({ text, voice: settings.tts_voice });
    return new Response(new Uint8Array(mp3), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=600" },
    });
  } catch (e) {
    // 204 = "nothing to say": the overlay carries on with the alert without speech.
    console.warn("tts failed", (e as Error).message);
    return new Response(null, { status: 204 });
  }
}
