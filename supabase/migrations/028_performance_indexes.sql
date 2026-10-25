-- Indexes para queries mais frequentes

-- Layout: boards por workspace + não fechados
create index if not exists idx_boards_workspace_open on boards(workspace_id) where closed = false;

-- Board page: lists por board + não fechadas
create index if not exists idx_lists_board_open on lists(board_id) where closed = false;

-- Board page: cards por list + não fechados + posição
create index if not exists idx_cards_list_open_pos on cards(list_id, position) where closed = false;

-- Stars: user + board
create index if not exists idx_board_stars_user_board on board_stars(user_id, board_id);

-- Time entries: user + ativo (sem stopped_at)
create index if not exists idx_time_entries_user_active on time_entries(user_id) where stopped_at is null;

-- Time entries: workspace + mês
create index if not exists idx_time_entries_workspace_date on time_entries(workspace_id, started_at) where stopped_at is not null;

-- Org members: user lookup rápido
create index if not exists idx_org_members_user_role on organization_members(user_id, org_id, role);

-- Workspaces por org
create index if not exists idx_workspaces_org_open on workspaces(org_id) where org_id is not null;
