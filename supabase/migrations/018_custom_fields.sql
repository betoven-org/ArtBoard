-- Custom fields por board
create table custom_fields (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  name text not null,
  field_type text not null check (field_type in ('text', 'number', 'date', 'dropdown', 'checkbox')),
  options jsonb default '[]', -- pra dropdown
  created_at timestamptz not null default now()
);

-- Valores dos custom fields por card
create table custom_field_values (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  field_id uuid not null references custom_fields(id) on delete cascade,
  value text,
  unique(card_id, field_id)
);

create index idx_cf_board on custom_fields(board_id);
create index idx_cfv_card on custom_field_values(card_id);

alter table custom_fields enable row level security;
alter table custom_field_values enable row level security;

create policy "cf_access" on custom_fields
  for all using (is_board_member(board_id, auth.uid()) or is_board_owner(board_id, auth.uid()));

create policy "cfv_access" on custom_field_values
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      where c.id = custom_field_values.card_id
      and (is_board_member(l.board_id, auth.uid()) or is_board_owner(l.board_id, auth.uid()))
    )
  );
