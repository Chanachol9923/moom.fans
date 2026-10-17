-- One-time codes that hand a signed-in website session to the desktop app.
--
-- Flow: the app opens <site>/app/connect?state=..&challenge=sha256(verifier); the signed-in
-- streamer approves; the site stores sha256(code) here and sends the code back to the app
-- (moom://auth deep link, or copy/paste). The app then POSTs code + verifier to
-- /api/app/exchange, which checks the PKCE challenge, marks the row used and returns a
-- one-time sign-in token. Codes live 5 minutes and work once. Server-only table.

create table public.app_links (
  code_hash    text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- base64url(sha256(verifier)), 43 chars
  challenge    text not null check (challenge ~ '^[A-Za-z0-9_-]{43}$'),
  device_name  text not null default '' check (char_length(device_name) <= 60),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '5 minutes',
  used_at      timestamptz
);

create index app_links_user_idx on public.app_links (user_id, created_at desc);

alter table public.app_links enable row level security;
revoke all on public.app_links from anon, authenticated;
