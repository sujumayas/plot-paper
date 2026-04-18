-- Plotpaper schema: profiles, viz_types, graphs, saved_types, likes + RLS + RPCs.

create extension if not exists "pgcrypto";

-- ============================================================================
-- profiles — mirror of auth.users for display data
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- viz_types — renderer definitions (seeds + user-owned customs)
-- ============================================================================
create table if not exists public.viz_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  category text not null check (category in (
    'Comparison','Trends','Composition','Relationships','Distribution',
    'Headline','Planning','Custom'
  )),
  base_renderer_id text not null check (base_renderer_id in (
    'bar','hbar','line','multiline','area','pie','donut','scatter',
    'heatmap','radar','kpi','timeline'
  )),
  columns jsonb not null,
  sample jsonb not null default '[]'::jsonb,
  owner_id uuid references auth.users(id) on delete cascade,
  is_public boolean not null default false,
  source_prompt text,
  source_ref_url text,
  created_at timestamptz not null default now()
);

-- unique slug per owner (null owner is the seed namespace)
create unique index if not exists viz_types_slug_owner_uq
  on public.viz_types(slug, coalesce(owner_id::text, ''));

-- ============================================================================
-- graphs — published instances
-- ============================================================================
create table if not exists public.graphs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  viz_type_id uuid not null references public.viz_types(id) on delete restrict,
  data jsonb not null,
  tags text[] not null default '{}',
  author_id uuid not null references auth.users(id) on delete cascade,
  display_author text,
  likes integer not null default 0,
  remixes integer not null default 0,
  views integer not null default 0,
  is_published boolean not null default false,
  forked_from uuid references public.graphs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists graphs_published_idx
  on public.graphs(is_published, created_at desc)
  where is_published;

create index if not exists graphs_viz_type_idx on public.graphs(viz_type_id);

-- ============================================================================
-- saved_types — which user has saved which viz type
-- ============================================================================
create table if not exists public.saved_types (
  user_id uuid not null references auth.users(id) on delete cascade,
  viz_type_id uuid not null references public.viz_types(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, viz_type_id)
);

-- ============================================================================
-- likes — which user liked which graph
-- ============================================================================
create table if not exists public.likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  graph_id uuid not null references public.graphs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, graph_id)
);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.viz_types enable row level security;
alter table public.graphs enable row level security;
alter table public.saved_types enable row level security;
alter table public.likes enable row level security;

-- profiles: readable to all, writable to self
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- viz_types: readable if public OR owned OR referenced by a published graph
drop policy if exists "viz_types_read" on public.viz_types;
create policy "viz_types_read" on public.viz_types for select using (
  is_public = true
  or owner_id = auth.uid()
  or exists (
    select 1 from public.graphs g
    where g.viz_type_id = viz_types.id and g.is_published = true
  )
);
drop policy if exists "viz_types_insert_auth" on public.viz_types;
create policy "viz_types_insert_auth" on public.viz_types for insert to authenticated
  with check (owner_id = auth.uid() and is_public = false);
drop policy if exists "viz_types_update_own" on public.viz_types;
create policy "viz_types_update_own" on public.viz_types for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "viz_types_delete_own" on public.viz_types;
create policy "viz_types_delete_own" on public.viz_types for delete to authenticated
  using (owner_id = auth.uid());

-- graphs: published readable by anyone; drafts only by author
drop policy if exists "graphs_read" on public.graphs;
create policy "graphs_read" on public.graphs for select using (
  is_published = true or author_id = auth.uid()
);
drop policy if exists "graphs_insert_auth" on public.graphs;
create policy "graphs_insert_auth" on public.graphs for insert to authenticated
  with check (author_id = auth.uid());
drop policy if exists "graphs_update_own" on public.graphs;
create policy "graphs_update_own" on public.graphs for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "graphs_delete_own" on public.graphs;
create policy "graphs_delete_own" on public.graphs for delete to authenticated
  using (author_id = auth.uid());

-- saved_types: own rows only
drop policy if exists "saved_types_rw_own" on public.saved_types;
create policy "saved_types_rw_own" on public.saved_types for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- likes: own rows only
drop policy if exists "likes_rw_own" on public.likes;
create policy "likes_rw_own" on public.likes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- RPCs
-- ============================================================================
create or replace function public.increment_views(graph_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.graphs
    set views = views + 1
    where id = graph_id and is_published = true;
$$;

grant execute on function public.increment_views(uuid) to anon, authenticated;

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
  delete from public.likes
    where user_id = auth.uid() and graph_id = toggle_like.graph_id
    returning true into existed;
  if existed then
    update public.graphs set likes = likes - 1 where id = toggle_like.graph_id;
    return false;
  end if;
  insert into public.likes(user_id, graph_id) values (auth.uid(), toggle_like.graph_id);
  update public.graphs set likes = likes + 1 where id = toggle_like.graph_id;
  return true;
end;
$$;

grant execute on function public.toggle_like(uuid) to authenticated;

create or replace function public.fork_graph(source_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;
  insert into public.graphs (
    title, description, viz_type_id, data, tags,
    author_id, display_author, forked_from, is_published
  )
  select
    title || ' (fork)',
    description,
    viz_type_id,
    data,
    tags,
    auth.uid(),
    null,
    id,
    false
  from public.graphs
    where id = source_id and is_published = true
  returning id into new_id;

  if new_id is null then
    raise exception 'source graph not found or not public';
  end if;

  update public.graphs set remixes = remixes + 1 where id = source_id;
  return new_id;
end;
$$;

grant execute on function public.fork_graph(uuid) to authenticated;

-- ============================================================================
-- Auth trigger: on new user, insert a profile row
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
    values (new.id, coalesce(split_part(new.email, '@', 1), 'anonymous'))
    on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- Keep updated_at fresh on graphs
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists graphs_touch_updated_at on public.graphs;
create trigger graphs_touch_updated_at
  before update on public.graphs
  for each row execute procedure public.touch_updated_at();
