-- Aggregates computed in the database instead of shipping every verified payment to
-- the app server and summing there. Called by the server with the service role.
-- They run with the caller's rights (security invoker), so through RLS an anonymous
-- caller would only ever see zero; execute is revoked from client roles anyway.

create or replace function public.goal_raised(p_goal uuid)
returns numeric
language sql
stable
as $$
  select g.starting_amount + coalesce((
    select sum(t.amount)
      from public.transactions t
     where t.streamer_id = g.streamer_id
       and t.status = 'verified'
       and t.verified_at >= g.starts_at
       and (g.ends_at is null or t.verified_at <= g.ends_at)
       and (g.include_purchases or t.kind = 'tip')
  ), 0)
  from public.goals g
  where g.id = p_goal;
$$;

-- Leaderboard by name (case and surrounding spaces ignored). Anonymous tips and
-- supporters who opted out of the wall don't rank.
create or replace function public.top_supporters(p_streamer uuid, p_since timestamptz, p_limit integer)
returns table (name text, total numeric)
language sql
stable
as $$
  select min(btrim(supporter_name)) as name, sum(amount) as total
    from public.transactions
   where streamer_id = p_streamer
     and status = 'verified'
     and not is_anonymous
     and show_on_wall
     and (p_since is null or verified_at >= p_since)
     and btrim(supporter_name) not in ('', '-')
   group by lower(btrim(supporter_name))
   order by total desc, name
   limit greatest(0, least(p_limit, 50));
$$;

create or replace function public.poll_totals(p_poll uuid)
returns table (option smallint, total numeric)
language sql
stable
as $$
  select t.poll_option,
         case when p.weight_by = 'count' then count(*)::numeric else sum(t.amount) end
    from public.transactions t
    join public.polls p on p.id = t.poll_id
   where t.poll_id = p_poll
     and t.status = 'verified'
     and t.poll_option is not null
   group by t.poll_option, p.weight_by;
$$;

revoke execute on function public.goal_raised(uuid) from public, anon, authenticated;
revoke execute on function public.top_supporters(uuid, timestamptz, integer) from public, anon, authenticated;
revoke execute on function public.poll_totals(uuid) from public, anon, authenticated;
