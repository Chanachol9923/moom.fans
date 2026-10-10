-- Moom core schema.
--
-- Access model:
--   * Tables a streamer edits in the dashboard (profiles, overlay_settings, products, pets)
--     are written through the user's own session, so RLS is the guard.
--   * Anything touching money or other tenants (transactions, alerts, downloads,
--     streamer_private tokens) is written only by the server with the service role,
--     after the server has checked ownership. RLS there only grants owners read access.

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: public storefront identity
-- ---------------------------------------------------------------------------

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  slug          text not null unique
                check (slug ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' and slug !~ '--'),
  display_name  text not null check (char_length(display_name) between 1 and 60),
  bio           text not null default '' check (char_length(bio) <= 500),
  avatar_path   text,
  banner_path   text,
  accent_color  text not null default '#3d7a6c' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  -- [{ "label": "YouTube", "url": "https://..." }]
  links         jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  locale        text not null default 'th' check (locale in ('th', 'en')),
  tip_presets   integer[] not null default '{20,50,100}',
  min_tip       numeric(10, 2) not null default 10 check (min_tip >= 1),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles are public"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "owner updates own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Profiles are created by the onboarding server action (service role) together with
-- streamer_private and overlay_settings, so there is no insert policy.

-- ---------------------------------------------------------------------------
-- streamer_private: payout target + secrets, owner-only
-- ---------------------------------------------------------------------------

create table public.streamer_private (
  streamer_id      uuid primary key references public.profiles (id) on delete cascade,
  promptpay_type   text not null check (promptpay_type in ('phone', 'national_id', 'ewallet')),
  promptpay_id     text not null check (promptpay_id ~ '^[0-9]{10,15}$'),
  verify_mode      text not null default 'manual' check (verify_mode in ('manual', 'slipok')),
  -- Secret in the OBS browser-source URL.
  overlay_token    text not null unique,
  -- Secret for Stream Deck style control URLs (panic / skip).
  control_token    text not null unique,
  -- Realtime broadcast topic. Separate from overlay_token so the topic never leaks it.
  overlay_channel  text not null unique,
  blocked_words    text[] not null default '{}',
  updated_at       timestamptz not null default now()
);

create trigger streamer_private_updated_at before update on public.streamer_private
  for each row execute function public.set_updated_at();

alter table public.streamer_private enable row level security;

create policy "owner reads own private settings"
  on public.streamer_private for select
  to authenticated
  using (streamer_id = (select auth.uid()));

create policy "owner updates own private settings"
  on public.streamer_private for update
  to authenticated
  using (streamer_id = (select auth.uid()))
  with check (streamer_id = (select auth.uid()));

-- Tokens are rotated only by the server; owners may edit the rest.
revoke update on public.streamer_private from anon, authenticated;
grant update (promptpay_type, promptpay_id, verify_mode, blocked_words)
  on public.streamer_private to authenticated;

-- ---------------------------------------------------------------------------
-- overlay_settings
-- ---------------------------------------------------------------------------

create table public.overlay_settings (
  streamer_id             uuid primary key references public.profiles (id) on delete cascade,
  position                text not null default 'bottom-right'
                          check (position in ('top-left', 'top-center', 'top-right', 'center',
                                              'bottom-left', 'bottom-center', 'bottom-right')),
  volume                  integer not null default 70 check (volume between 0 and 100),
  min_alert_amount        numeric(10, 2) not null default 0 check (min_alert_amount >= 0),
  display_seconds         integer not null default 8 check (display_seconds between 3 and 60),
  alert_sound_path        text,
  tts_enabled             boolean not null default true,
  tts_voice               text not null default 'th-TH-PremwadeeNeural',
  tts_min_amount          numeric(10, 2) not null default 20 check (tts_min_amount >= 0),
  tts_max_chars           integer not null default 150 check (tts_max_chars between 10 and 300),
  media_enabled           boolean not null default false,
  media_baht_per_second   numeric(10, 2) not null default 1 check (media_baht_per_second > 0),
  media_max_seconds       integer not null default 120 check (media_max_seconds between 5 and 600),
  media_requires_approval boolean not null default true,
  vts_enabled             boolean not null default false,
  -- [{ "min_amount": 50, "kind": "hotkey" | "item", "ref": "<hotkeyID or item file>", "label": "blush" }]
  vts_rules               jsonb not null default '[]'::jsonb check (jsonb_typeof(vts_rules) = 'array'),
  pets_enabled            boolean not null default false,
  twitch_channel          text check (twitch_channel ~ '^[a-z0-9_]{3,25}$'),
  updated_at              timestamptz not null default now()
);

create trigger overlay_settings_updated_at before update on public.overlay_settings
  for each row execute function public.set_updated_at();

alter table public.overlay_settings enable row level security;

create policy "owner reads own overlay settings"
  on public.overlay_settings for select
  to authenticated
  using (streamer_id = (select auth.uid()));

create policy "owner updates own overlay settings"
  on public.overlay_settings for update
  to authenticated
  using (streamer_id = (select auth.uid()))
  with check (streamer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- products (digital vault)
-- ---------------------------------------------------------------------------

create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  streamer_id         uuid not null references public.profiles (id) on delete cascade,
  title               text not null check (char_length(title) between 1 and 120),
  description         text not null default '' check (char_length(description) <= 2000),
  price               numeric(10, 2) not null check (price >= 1 and price <= 100000),
  cover_path          text,
  preview_audio_path  text,
  -- Object key in the private product-files bucket. Null until the upload finishes.
  file_path           text,
  file_name           text,
  file_size           bigint check (file_size >= 0),
  is_published        boolean not null default false,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint products_publish_needs_file check (not is_published or file_path is not null)
);

create index products_streamer_idx on public.products (streamer_id, sort_order, created_at);

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

create policy "published products are public"
  on public.products for select
  to anon, authenticated
  using (is_published);

create policy "owner reads own products"
  on public.products for select
  to authenticated
  using (streamer_id = (select auth.uid()));

create policy "owner inserts own products"
  on public.products for insert
  to authenticated
  with check (streamer_id = (select auth.uid()));

create policy "owner updates own products"
  on public.products for update
  to authenticated
  using (streamer_id = (select auth.uid()))
  with check (streamer_id = (select auth.uid()));

create policy "owner deletes own products"
  on public.products for delete
  to authenticated
  using (streamer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- transactions: every tip and purchase, one slip-verification pipeline
-- ---------------------------------------------------------------------------

create table public.transactions (
  id               uuid primary key default gen_random_uuid(),
  streamer_id      uuid not null references public.profiles (id) on delete cascade,
  kind             text not null check (kind in ('tip', 'purchase')),
  product_id       uuid references public.products (id) on delete set null,
  -- Snapshot so the ledger survives product edits/deletes.
  product_title    text,
  supporter_name   text not null check (char_length(supporter_name) between 1 and 40),
  supporter_email  text check (supporter_email is null or supporter_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message          text not null default '' check (char_length(message) <= 300),
  media_url        text,
  media_seconds    integer check (media_seconds between 1 and 600),
  amount           numeric(10, 2) not null check (amount > 0 and amount <= 1000000),
  status           text not null default 'awaiting_payment'
                   check (status in ('awaiting_payment', 'pending_review', 'verified', 'rejected', 'expired')),
  verify_method    text check (verify_method in ('manual', 'slipok')),
  slip_path        text,
  -- Bank transaction reference read from the slip. Unique so one slip can't pay twice.
  slip_trans_ref   text unique,
  -- Raw verifier output and our own check results, for the review screen.
  verification     jsonb,
  review_note      text,
  -- Supporter-facing capability token: payment page, status polling, downloads.
  public_token     text not null unique,
  download_count   integer not null default 0,
  expires_at       timestamptz not null,
  created_at       timestamptz not null default now(),
  submitted_at     timestamptz,
  verified_at      timestamptz,
  constraint transactions_purchase_shape check (
    kind = 'tip' or (product_title is not null and supporter_email is not null)
  )
);

create index transactions_streamer_status_idx
  on public.transactions (streamer_id, status, created_at desc);
create index transactions_streamer_created_idx
  on public.transactions (streamer_id, created_at desc);

alter table public.transactions enable row level security;

create policy "owner reads own transactions"
  on public.transactions for select
  to authenticated
  using (streamer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- downloads: delivery log for the ledger
-- ---------------------------------------------------------------------------

create table public.downloads (
  id              bigint generated always as identity primary key,
  transaction_id  uuid not null references public.transactions (id) on delete cascade,
  streamer_id     uuid not null references public.profiles (id) on delete cascade,
  created_at      timestamptz not null default now()
);

create index downloads_streamer_idx on public.downloads (streamer_id, created_at desc);

alter table public.downloads enable row level security;

create policy "owner reads own downloads"
  on public.downloads for select
  to authenticated
  using (streamer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- alerts: what the OBS overlay plays, FIFO per streamer
-- ---------------------------------------------------------------------------

create table public.alerts (
  id              uuid primary key default gen_random_uuid(),
  streamer_id     uuid not null references public.profiles (id) on delete cascade,
  transaction_id  uuid references public.transactions (id) on delete set null,
  kind            text not null check (kind in ('tip', 'purchase', 'test')),
  -- held = waiting for the streamer to approve media share
  status          text not null default 'queued'
                  check (status in ('held', 'queued', 'playing', 'done', 'skipped')),
  -- Snapshot of what to show: name, amount, message, media, tts flag...
  payload         jsonb not null,
  created_at      timestamptz not null default now(),
  started_at      timestamptz,
  finished_at     timestamptz
);

create index alerts_streamer_queue_idx on public.alerts (streamer_id, status, created_at);

alter table public.alerts enable row level security;

create policy "owner reads own alerts"
  on public.alerts for select
  to authenticated
  using (streamer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- pets: pixel companions walking on the overlay
-- ---------------------------------------------------------------------------

create table public.pets (
  id           uuid primary key default gen_random_uuid(),
  streamer_id  uuid not null references public.profiles (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 24),
  -- Preset key ("bird", "cat", ...) or "custom" (then sprite holds the drawing).
  species      text not null check (species ~ '^[a-z]{2,16}$'),
  -- Colour overrides for preset palette slots: { "body": "#...", "accent": "#..." }
  palette      jsonb not null default '{}'::jsonb check (jsonb_typeof(palette) = 'object'),
  sprite       jsonb,
  -- Chat username that "owns" this pet; their messages show in its speech bubble.
  chatter      text check (chatter ~ '^[a-z0-9_]{2,25}$'),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint pets_custom_needs_sprite check (species <> 'custom' or sprite is not null)
);

create index pets_streamer_idx on public.pets (streamer_id, created_at);

alter table public.pets enable row level security;

create policy "owner reads own pets"
  on public.pets for select
  to authenticated
  using (streamer_id = (select auth.uid()));

create policy "owner inserts own pets"
  on public.pets for insert
  to authenticated
  with check (streamer_id = (select auth.uid()));

create policy "owner updates own pets"
  on public.pets for update
  to authenticated
  using (streamer_id = (select auth.uid()))
  with check (streamer_id = (select auth.uid()));

create policy "owner deletes own pets"
  on public.pets for delete
  to authenticated
  using (streamer_id = (select auth.uid()));
