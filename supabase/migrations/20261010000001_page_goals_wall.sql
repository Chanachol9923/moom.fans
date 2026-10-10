-- Page designer, goals, supporter wall, gift units, polls, wheel, subathon, alert styles.

-- Storefront design (theme, texts, section order...). Public: it only describes looks.
-- Validated by src/lib/page-config.ts; unknown keys are ignored on read.
alter table public.profiles
  add column page jsonb not null default '{}'::jsonb check (jsonb_typeof(page) = 'object');

-- Supporter choices made on the tip form.
alter table public.transactions
  add column is_anonymous boolean not null default false,
  add column show_on_wall boolean not null default true,
  -- "3 x bread" style gifts (unit name/price live in profiles.page at the time of the tip).
  add column unit_qty integer check (unit_qty between 1 and 999),
  -- Index into the active poll's options, when the tip is a vote.
  add column poll_id uuid,
  add column poll_option smallint check (poll_option between 0 and 9);

-- Look of the on-stream alert.
alter table public.overlay_settings
  add column alert_style text not null default 'card' check (alert_style in ('card', 'compact', 'banner')),
  -- Prize wheel: { "enabled": bool, "min_amount": n, "items": [{ "label": "...", "weight": n }] }
  add column wheel jsonb not null default '{}'::jsonb check (jsonb_typeof(wheel) = 'object'),
  -- Subathon timer. Running while ends_at is set; paused keeps the remaining seconds.
  add column subathon_seconds_per_baht numeric(8, 2) not null default 6 check (subathon_seconds_per_baht >= 0),
  add column subathon_ends_at timestamptz,
  add column subathon_paused_left integer check (subathon_paused_left >= 0);

-- ---------------------------------------------------------------------------
-- goals: one active fundraising target per streamer, shown on the page and in OBS
-- ---------------------------------------------------------------------------

create table public.goals (
  id                 uuid primary key default gen_random_uuid(),
  streamer_id        uuid not null references public.profiles (id) on delete cascade,
  title              text not null check (char_length(title) between 1 and 80),
  target_amount      numeric(12, 2) not null check (target_amount > 0 and target_amount <= 100000000),
  -- Money raised before the goal was created in Moom (e.g. moved from another platform).
  starting_amount    numeric(12, 2) not null default 0 check (starting_amount >= 0),
  include_purchases  boolean not null default false,
  starts_at          timestamptz not null default now(),
  ends_at            timestamptz,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  constraint goals_end_after_start check (ends_at is null or ends_at > starts_at)
);

-- At most one active goal per streamer.
create unique index goals_one_active on public.goals (streamer_id) where is_active;
create index goals_streamer_idx on public.goals (streamer_id, created_at desc);

alter table public.goals enable row level security;

create policy "goals are public"
  on public.goals for select
  to anon, authenticated
  using (true);

create policy "owner inserts own goals"
  on public.goals for insert
  to authenticated
  with check (streamer_id = (select auth.uid()));

create policy "owner updates own goals"
  on public.goals for update
  to authenticated
  using (streamer_id = (select auth.uid()))
  with check (streamer_id = (select auth.uid()));

create policy "owner deletes own goals"
  on public.goals for delete
  to authenticated
  using (streamer_id = (select auth.uid()));

-- Wall / goal queries scan verified money by time.
create index transactions_streamer_verified_idx
  on public.transactions (streamer_id, verified_at desc)
  where status = 'verified';

-- ---------------------------------------------------------------------------
-- polls: viewers vote by tipping and picking an option
-- ---------------------------------------------------------------------------

create table public.polls (
  id           uuid primary key default gen_random_uuid(),
  streamer_id  uuid not null references public.profiles (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 100),
  -- ["option A", "option B", ...] (2..10 short strings)
  options      jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 10),
  weight_by    text not null default 'amount' check (weight_by in ('amount', 'count')),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  closed_at    timestamptz
);

create unique index polls_one_active on public.polls (streamer_id) where is_active;
create index polls_streamer_idx on public.polls (streamer_id, created_at desc);

alter table public.transactions
  add constraint transactions_poll_fk foreign key (poll_id) references public.polls (id) on delete set null;

alter table public.polls enable row level security;

create policy "polls are public"
  on public.polls for select
  to anon, authenticated
  using (true);

create policy "owner inserts own polls"
  on public.polls for insert
  to authenticated
  with check (streamer_id = (select auth.uid()));

create policy "owner updates own polls"
  on public.polls for update
  to authenticated
  using (streamer_id = (select auth.uid()))
  with check (streamer_id = (select auth.uid()));

create policy "owner deletes own polls"
  on public.polls for delete
  to authenticated
  using (streamer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- subathon: add time atomically when a tip is verified (server/service role only)
-- ---------------------------------------------------------------------------

create or replace function public.subathon_add(p_streamer uuid, p_seconds integer)
returns void
language sql
as $$
  update public.overlay_settings
     set subathon_ends_at = case when subathon_ends_at is not null and subathon_ends_at > now()
                                 then subathon_ends_at + make_interval(secs => p_seconds)
                                 else subathon_ends_at end,
         subathon_paused_left = case when subathon_paused_left is not null
                                     then subathon_paused_left + p_seconds
                                     else subathon_paused_left end
   where streamer_id = p_streamer
     and p_seconds > 0
     and ((subathon_ends_at is not null and subathon_ends_at > now()) or subathon_paused_left is not null);
$$;

revoke execute on function public.subathon_add(uuid, integer) from public, anon, authenticated;
