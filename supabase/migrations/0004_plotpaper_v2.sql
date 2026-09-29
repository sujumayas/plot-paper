-- Plotpaper v2: charts are self-describing documents.
--   graphs.chart_type  built-in chart id ("bar", "line", …) or "custom:<id>"
--   graphs.config      the chart document minus its data (text, mapping, options, style, and the
--                      PlotSpec for custom types) so the gallery can render it without lookups.
-- viz_types keeps working for saved/AI types and can now store a declarative PlotSpec.

alter table public.graphs add column if not exists chart_type text;
alter table public.graphs add column if not exists config jsonb not null default '{}'::jsonb;
alter table public.graphs alter column viz_type_id drop not null;

-- Backfill chart_type for rows created with the v1 schema.
update public.graphs g
   set chart_type = v.base_renderer_id
  from public.viz_types v
 where g.viz_type_id = v.id and g.chart_type is null;

-- Keep payloads sane (≈ 5k rows of typical data).
alter table public.graphs drop constraint if exists graphs_data_size;
alter table public.graphs add constraint graphs_data_size check (pg_column_size(data) < 2000000);
alter table public.graphs drop constraint if exists graphs_config_size;
alter table public.graphs add constraint graphs_config_size check (pg_column_size(config) < 200000);
alter table public.graphs drop constraint if exists graphs_title_len;
alter table public.graphs add constraint graphs_title_len check (char_length(title) <= 200);

create index if not exists graphs_chart_type_idx on public.graphs(chart_type);

-- Chart types are open-ended now (plugins + PlotSpecs); relax the enum check.
alter table public.viz_types drop constraint if exists viz_types_base_renderer_id_check;
alter table public.viz_types add constraint viz_types_base_renderer_id_check
  check (base_renderer_id ~ '^[a-z0-9:_-]{1,64}$');
alter table public.viz_types add column if not exists spec jsonb;

-- fork_graph copies the new columns too.
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
    title, description, viz_type_id, chart_type, config, data, tags,
    author_id, display_author, forked_from, is_published
  )
  select
    left(title || ' (fork)', 200), description, viz_type_id, chart_type, config, data, tags,
    auth.uid(), null, id, false
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
