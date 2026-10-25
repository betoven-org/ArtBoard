-- Storage policies para bucket uploads
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true)
on conflict (id) do nothing;

create policy "upload_auth" on storage.objects
  for insert with check (bucket_id = 'uploads' and auth.uid() is not null);

create policy "read_public" on storage.objects
  for select using (bucket_id = 'uploads');

create policy "delete_own" on storage.objects
  for delete using (bucket_id = 'uploads' and auth.uid() is not null);
