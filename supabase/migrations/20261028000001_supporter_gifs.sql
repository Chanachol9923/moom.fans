-- GIFs the supporter can pick on the tip page to show with their alert,
-- and brand font files in public media.
--
-- overlay_settings.alert_gifs: up to 20 of { "id": "<6-16 a-z0-9>", "path": "<uid>/gifs/x.gif", "label": "..." }
-- overlay_settings.gif_min_amount: smallest tip that may pick one (0 = any tip).
-- transactions.alert_gif: the id the supporter picked, checked against the list when the tip is created.

alter table public.overlay_settings
  add column alert_gifs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(alert_gifs) = 'array' and jsonb_array_length(alert_gifs) <= 20),
  add column gif_min_amount numeric(10, 2) not null default 0 check (gif_min_amount >= 0);

alter table public.transactions
  add column alert_gif text check (alert_gif ~ '^[a-z0-9]{6,16}$');

-- Brand fonts (Page design -> Fonts), used on the tip page and the overlay.
update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif',
                               'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
                               'video/webm', 'video/mp4',
                               'font/woff2', 'font/woff', 'font/ttf', 'font/otf']
where id = 'public-media';
