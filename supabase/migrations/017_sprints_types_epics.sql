-- Sprints por board
create table sprints (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  name text not null,
  goal text,
  start_date timestamptz,
  end_date timestamptz,
  status text not null default 'planning' check (status in ('planning', 'active', 'completed')),
  created_at timestamptz not null default now()
);

create index idx_sprints_board on sprints(board_id);
alter table sprints enable row level security;

create policy "sprint_access" on sprints
  for all using (
    is_board_member(board_id, auth.uid())
    or is_board_owner(board_id, auth.uid())
  );

-- Tipo de card (Bug, Feature, Task, Epic, Story)
alter table cards add column card_type text default 'task' check (card_type in ('task', 'bug', 'feature', 'epic', 'story', 'improvement'));

-- Sprint assignment
alter table cards add column sprint_id uuid references sprints(id) on delete set null;
create index idx_cards_sprint on cards(sprint_id);

-- Epics (um epic é um card com card_type='epic', outros cards linkam a ele)
alter table cards add column epic_id uuid references cards(id) on delete set null;
create index idx_cards_epic on cards(epic_id);

-- Story points
alter table cards add column story_points integer;
