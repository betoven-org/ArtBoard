-- =============================================
-- 1. ROLES: Expandir roles no workspace e board
-- =============================================

-- Adicionar role 'guest' ao board_members
alter table board_members drop constraint if exists board_members_role_check;
alter table board_members add constraint board_members_role_check
  check (role in ('admin', 'member', 'observer', 'guest'));

-- Adicionar role 'guest' ao workspace_members
alter table workspace_members drop constraint if exists workspace_members_role_check;
alter table workspace_members add constraint workspace_members_role_check
  check (role in ('admin', 'member', 'guest'));

-- =============================================
-- 2. ESTIMATIVAS: Campo de horas estimadas
-- =============================================

alter table cards add column estimated_hours real;

-- =============================================
-- 3. AUTOMAÇÕES: Regras por board
-- =============================================

create table automations (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  name text not null,
  trigger_type text not null check (trigger_type in (
    'card_moved_to_list',
    'card_created',
    'due_date_approaching',
    'card_inactive'
  )),
  trigger_config jsonb not null default '{}',
  action_type text not null check (action_type in (
    'mark_complete',
    'assign_member',
    'add_label',
    'send_notification',
    'move_card'
  )),
  action_config jsonb not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_automations_board on automations(board_id);

alter table automations enable row level security;

create policy "automation_access" on automations
  for all using (
    is_board_member(board_id, auth.uid())
    or is_board_owner(board_id, auth.uid())
  );

-- =============================================
-- 4. ACTIVITY LOG: Histórico de ações
-- =============================================

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards(id) on delete cascade,
  card_id uuid references cards(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  details jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_activity_board on activity_log(board_id, created_at desc);
create index idx_activity_card on activity_log(card_id);

alter table activity_log enable row level security;

create policy "activity_select" on activity_log
  for select using (user_id = auth.uid() or is_board_member(board_id, auth.uid()));

create policy "activity_insert" on activity_log
  for insert with check (user_id = auth.uid());
