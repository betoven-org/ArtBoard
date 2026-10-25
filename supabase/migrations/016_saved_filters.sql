create table saved_filters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  filter_config jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table saved_filters enable row level security;

create policy "filter_owner" on saved_filters
  for all using (user_id = auth.uid());
