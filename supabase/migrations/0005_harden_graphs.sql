-- Hardening for public deployments.
--
-- 1. Counters and provenance on graphs (likes, views, remixes, created_at,
--    display_author, forked_from) can only be changed by the RPCs
--    (toggle_like, increment_views, fork_graph run as the function owner) or by
--    the service role — never directly by a signed-in or anonymous API caller.
-- 2. likes rows are read-only for their owner; they change only through toggle_like,
--    so the counter on graphs can't drift from the rows.
-- 3. A graph can only reference a viz_type its author owns or that is public.
-- 4. At most 5,000 data rows per graph (matches the app's publish limit).

-- 1 ─────────────────────────────────────────────────────────────────────────
create or replace function public.protect_graph_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Direct API calls run as "anon"/"authenticated"; RPCs (security definer) and
  -- the service role run as other roles and are trusted.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.likes := 0;
    new.views := 0;
    new.remixes := 0;
    new.created_at := now();
    new.forked_from := null;
    new.display_author := (select p.display_name from public.profiles p where p.id = auth.uid());
  else
    new.likes := old.likes;
    new.views := old.views;
    new.remixes := old.remixes;
    new.created_at := old.created_at;
    new.forked_from := old.forked_from;
    new.display_author := old.display_author;
    new.author_id := old.author_id;
  end if;
  return new;
end;
$$;

drop trigger if exists graphs_protect_columns on public.graphs;
create trigger graphs_protect_columns
  before insert or update on public.graphs
  for each row execute procedure public.protect_graph_columns();

-- 2 ─────────────────────────────────────────────────────────────────────────
drop policy if exists "likes_rw_own" on public.likes;
drop policy if exists "likes_read_own" on public.likes;
create policy "likes_read_own" on public.likes for select to authenticated
  using (user_id = auth.uid());

-- toggle_like only for published graphs.
create or replace function public.toggle_like(graph_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  existed boolean;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;
  if not exists (select 1 from public.graphs g where g.id = toggle_like.graph_id and g.is_published) then
    raise exception 'graph not found';
  end if;
  delete from public.likes
    where user_id = auth.uid() and likes.graph_id = toggle_like.graph_id
    returning true into existed;
  if existed then
    update public.graphs set likes = greatest(likes - 1, 0) where id = toggle_like.graph_id;
    return false;
  end if;
  insert into public.likes(user_id, graph_id) values (auth.uid(), toggle_like.graph_id);
  update public.graphs set likes = likes + 1 where id = toggle_like.graph_id;
  return true;
end;
$$;

grant execute on function public.toggle_like(uuid) to authenticated;

-- 3 ─────────────────────────────────────────────────────────────────────────
drop policy if exists "graphs_insert_auth" on public.graphs;
create policy "graphs_insert_auth" on public.graphs for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      viz_type_id is null
      or exists (
        select 1 from public.viz_types v
        where v.id = viz_type_id and (v.is_public or v.owner_id = auth.uid())
      )
    )
  );

drop policy if exists "graphs_update_own" on public.graphs;
create policy "graphs_update_own" on public.graphs for update to authenticated
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and (
      viz_type_id is null
      or exists (
        select 1 from public.viz_types v
        where v.id = viz_type_id and (v.is_public or v.owner_id = auth.uid())
      )
    )
  );

-- 4 ─────────────────────────────────────────────────────────────────────────
alter table public.graphs drop constraint if exists graphs_data_rows;
alter table public.graphs add constraint graphs_data_rows
  check (jsonb_typeof(data) = 'array' and jsonb_array_length(data) <= 5000) not valid;
