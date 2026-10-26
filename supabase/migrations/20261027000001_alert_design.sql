-- Alert design: per-amount tiers and the streamer's own CSS for the overlay.
--
-- alert_tiers: up to 8 entries, picked by the highest min_amount the tip reaches:
--   { "min_amount": 0, "media_path": "<uid>/alerts/x.gif" | null, "sound_path": "<uid>/sounds/y.mp3" | null,
--     "title": "{name} sent {amount}!" | "", "accent": "#rrggbb" | null,
--     "animation": "pop" | "slide" | "bounce" | "shake" | "fade" | "none", "style": "card" | "compact" | "banner" | null }
-- custom_css: applied to the OBS overlay page only (never the dashboard).

alter table public.overlay_settings
  add column alert_tiers jsonb not null default '[]'::jsonb
    check (jsonb_typeof(alert_tiers) = 'array' and jsonb_array_length(alert_tiers) <= 8),
  add column custom_css text not null default ''
    check (char_length(custom_css) <= 20000);

-- Animated alerts are often short videos (transparent WebM from VTuber artists).
update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif',
                               'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
                               'video/webm', 'video/mp4']
where id = 'public-media';
