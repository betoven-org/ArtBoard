-- Time tracking entries
create table time_entries (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  stopped_at timestamptz,
  duration_seconds integer, -- calculado ao parar
  created_at timestamptz not null default now()
);

create index idx_time_entries_card on time_entries(card_id);
create index idx_time_entries_user on time_entries(user_id, started_at);

alter table time_entries enable row level security;

-- Qualquer membro do board pode ver/criar time entries
create policy "te_select" on time_entries
  for select using (user_id = auth.uid());

create policy "te_insert" on time_entries
  for insert with check (user_id = auth.uid());

create policy "te_update" on time_entries
  for update using (user_id = auth.uid());

create policy "te_delete" on time_entries
  for delete using (user_id = auth.uid());
