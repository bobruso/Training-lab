insert into storage.buckets (id, name, public)
values ('fit-files', 'fit-files', false)
on conflict (id) do nothing;

create policy "fit upload own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'fit-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "fit read own folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'fit-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "fit update own folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'fit-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'fit-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "fit delete own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'fit-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
;

