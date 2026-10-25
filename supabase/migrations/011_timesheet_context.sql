-- Adicionar board_id e workspace_id diretos na time_entries
alter table time_entries add column board_id uuid references boards(id) on delete cascade;
alter table time_entries add column workspace_id uuid references workspaces(id) on delete cascade;
alter table time_entries add column description text;

create index idx_time_entries_board on time_entries(board_id);
create index idx_time_entries_workspace on time_entries(workspace_id);

-- Backfill: preencher board_id e workspace_id das entries existentes
update time_entries te set
  board_id = l.board_id,
  workspace_id = b.workspace_id
from cards c
join lists l on l.id = c.list_id
join boards b on b.id = l.board_id
where c.id = te.card_id;

-- Permitir admin do workspace ver entries de todos os membros (pra relatório)
drop policy if exists "te_select" on time_entries;

create policy "te_select" on time_entries
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from workspaces w
      where w.id = time_entries.workspace_id and w.owner_id = auth.uid()
    )
  );
