-- Row-level security and trigger tests. Runs after 00_supabase_shim.sql and all migrations.
\set ON_ERROR_STOP on
\set alice '''a1111111-1111-4111-8111-111111111111'''
\set bob   '''b2222222-2222-4222-8222-222222222222'''

insert into auth.users (id, email) values (:alice, 'alice@example.com'), (:bob, 'bob@example.com');
update public.profiles set display_name = 'Alice' where id = :alice;

-- A private viz_type owned by Bob.
insert into public.viz_types (id, slug, name, category, base_renderer_id, columns, owner_id, is_public)
values ('c3333333-3333-4333-8333-333333333333', 'bobs', 'Bob''s type', 'Custom', 'custom:bobs', '[]', :bob, false);

-- ── As Alice ──────────────────────────────────────────────────────────────
set role authenticated;
select set_config('request.jwt.claim.sub', :alice, false);

-- Counters and provenance are ignored on insert.
insert into public.graphs (id, title, chart_type, data, author_id, is_published, likes, views, remixes, display_author, created_at)
values ('d4444444-4444-4444-8444-444444444444', 'Alice chart', 'bar', '[{"a":1}]', :alice, true, 999, 999, 999, 'Somebody famous', '2000-01-01');

do $$
declare g record;
begin
  select * into g from public.graphs where id = 'd4444444-4444-4444-8444-444444444444';
  assert g.likes = 0 and g.views = 0 and g.remixes = 0, 'counters must start at 0';
  assert g.display_author = 'Alice', 'display_author comes from the profile, got ' || coalesce(g.display_author, 'null');
  assert g.created_at > now() - interval '1 minute', 'created_at is server-set';
end $$;

-- Counters can't be edited directly; normal fields can.
update public.graphs set likes = 1000, views = 1000, display_author = 'X', title = 'Renamed'
 where id = 'd4444444-4444-4444-8444-444444444444';
do $$
declare g record;
begin
  select * into g from public.graphs where id = 'd4444444-4444-4444-8444-444444444444';
  assert g.likes = 0 and g.views = 0 and g.display_author = 'Alice', 'protected columns must not change';
  assert g.title = 'Renamed', 'title is editable';
end $$;

-- Likes only via the RPC, and the counter follows.
do $$
begin
  begin
    insert into public.likes (user_id, graph_id) values (auth.uid(), 'd4444444-4444-4444-8444-444444444444');
    raise exception 'direct like insert should fail';
  exception when insufficient_privilege then null;
  end;
  assert public.toggle_like('d4444444-4444-4444-8444-444444444444') = true, 'first toggle likes';
  assert (select likes from public.graphs where id = 'd4444444-4444-4444-8444-444444444444') = 1, 'likes = 1';
  assert (select count(*) from public.likes) = 1, 'own like is readable';
  assert public.toggle_like('d4444444-4444-4444-8444-444444444444') = false, 'second toggle unlikes';
  assert (select likes from public.graphs where id = 'd4444444-4444-4444-8444-444444444444') = 0, 'likes = 0';
end $$;

-- Can't reference someone else's private viz_type.
do $$
begin
  begin
    insert into public.graphs (title, viz_type_id, data, author_id) values ('Sneaky', 'c3333333-3333-4333-8333-333333333333', '[]', auth.uid());
    raise exception 'referencing a private viz_type should fail';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Can't insert as someone else.
do $$
begin
  begin
    insert into public.graphs (title, data, author_id) values ('Forged', '[]', 'b2222222-2222-4222-8222-222222222222');
    raise exception 'forged author should fail';
  exception when insufficient_privilege then null;
  end;
end $$;

-- More than 5,000 rows is rejected.
do $$
begin
  begin
    insert into public.graphs (title, data, author_id)
    select 'Huge', jsonb_agg(jsonb_build_object('i', i)), auth.uid() from generate_series(1, 5001) i;
    raise exception 'oversized data should fail';
  exception when check_violation then null;
  end;
end $$;

-- ── As Bob ────────────────────────────────────────────────────────────────
select set_config('request.jwt.claim.sub', :bob, false);

do $$
declare n int; new_id uuid;
begin
  -- Bob can't edit Alice's chart.
  update public.graphs set title = 'Hacked' where id = 'd4444444-4444-4444-8444-444444444444';
  get diagnostics n = row_count;
  assert n = 0, 'cannot update others'' graphs';
  -- Forking works through the RPC and bumps the source's remix counter.
  new_id := public.fork_graph('d4444444-4444-4444-8444-444444444444');
  assert (select forked_from from public.graphs where id = new_id) = 'd4444444-4444-4444-8444-444444444444', 'fork keeps provenance';
  assert (select author_id from public.graphs where id = new_id) = auth.uid(), 'fork belongs to Bob';
  assert (select remixes from public.graphs where id = 'd4444444-4444-4444-8444-444444444444') = 1, 'remix counted';
  -- Bob sees no likes rows from Alice.
  assert (select count(*) from public.likes) = 0, 'likes are private';
end $$;

-- ── Anonymous ─────────────────────────────────────────────────────────────
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$
begin
  assert (select count(*) from public.graphs where is_published) >= 1, 'published graphs are public';
  assert (select count(*) from public.graphs where not is_published) = 0, 'drafts are private';
end $$;

-- ── Service role (seed script) may set provenance ─────────────────────────
reset role;
set role service_role;
insert into public.graphs (title, data, author_id, display_author, is_published, created_at)
values ('Seeded', '[]', 'a1111111-1111-4111-8111-111111111111', 'NOAA', true, '2024-01-01');
do $$
begin
  assert (select display_author from public.graphs where title = 'Seeded') = 'NOAA', 'service role keeps display_author';
end $$;
reset role;

\echo 'RLS tests passed'
