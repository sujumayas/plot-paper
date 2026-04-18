-- Storage bucket + RLS for AI reference images uploaded by users before AI generation.

insert into storage.buckets (id, name, public)
  values ('ai-refs', 'ai-refs', false)
  on conflict (id) do nothing;

drop policy if exists "ai_refs_insert_own" on storage.objects;
create policy "ai_refs_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ai-refs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "ai_refs_read_own" on storage.objects;
create policy "ai_refs_read_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ai-refs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "ai_refs_delete_own" on storage.objects;
create policy "ai_refs_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ai-refs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
