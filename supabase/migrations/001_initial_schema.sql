-- ArtBoard Schema (baseado na engenharia reversa do Trello)

-- Workspaces
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Boards
create table boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  background text not null default '#0079bf',
  closed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Lists
create table lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  name text not null,
  position real not null default 0,
  closed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Cards
create table cards (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  name text not null,
  description text,
  position real not null default 0,
  due_date timestamptz,
  due_complete boolean not null default false,
  closed boolean not null default false,
  cover_color text,
  cover_image text,
  created_at timestamptz not null default now()
);

-- Labels
create table labels (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  name text not null default '',
  color text not null
);

-- Card Labels (junction)
create table card_labels (
  card_id uuid not null references cards(id) on delete cascade,
  label_id uuid not null references labels(id) on delete cascade,
  primary key (card_id, label_id)
);

-- Checklists
create table checklists (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  name text not null,
  position real not null default 0
);

-- Checklist Items
create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references checklists(id) on delete cascade,
  name text not null,
  checked boolean not null default false,
  position real not null default 0
);

-- Board Members
create table board_members (
  board_id uuid not null references boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member', 'observer')),
  primary key (board_id, user_id)
);

-- Card Members
create table card_members (
  card_id uuid not null references cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (card_id, user_id)
);

-- Comments
create table comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- Attachments
create table attachments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  url text not null,
  name text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_boards_workspace on boards(workspace_id);
create index idx_lists_board on lists(board_id);
create index idx_cards_list on cards(list_id);
create index idx_cards_position on cards(list_id, position);
create index idx_labels_board on labels(board_id);
create index idx_comments_card on comments(card_id);
create index idx_board_members_user on board_members(user_id);

-- Enable RLS
alter table workspaces enable row level security;
alter table boards enable row level security;
alter table lists enable row level security;
alter table cards enable row level security;
alter table labels enable row level security;
alter table card_labels enable row level security;
alter table checklists enable row level security;
alter table checklist_items enable row level security;
alter table board_members enable row level security;
alter table card_members enable row level security;
alter table comments enable row level security;
alter table attachments enable row level security;

-- RLS Policies

-- Workspaces: owner pode tudo
create policy "workspace_owner_all" on workspaces
  for all using (owner_id = auth.uid());

-- Boards: membros podem ver, admin pode editar
create policy "board_member_select" on boards
  for select using (
    exists (select 1 from board_members where board_id = id and user_id = auth.uid())
    or exists (select 1 from workspaces where id = workspace_id and owner_id = auth.uid())
  );

create policy "board_member_insert" on boards
  for insert with check (
    exists (select 1 from workspaces where id = workspace_id and owner_id = auth.uid())
  );

create policy "board_member_update" on boards
  for update using (
    exists (select 1 from board_members where board_id = id and user_id = auth.uid() and role = 'admin')
    or exists (select 1 from workspaces where id = workspace_id and owner_id = auth.uid())
  );

create policy "board_member_delete" on boards
  for delete using (
    exists (select 1 from workspaces where id = workspace_id and owner_id = auth.uid())
  );

-- Lists: membros do board podem CRUD
create policy "list_board_member" on lists
  for all using (
    exists (
      select 1 from board_members bm
      where bm.board_id = lists.board_id and bm.user_id = auth.uid()
    )
    or exists (
      select 1 from boards b
      join workspaces w on w.id = b.workspace_id
      where b.id = lists.board_id and w.owner_id = auth.uid()
    )
  );

-- Cards: membros do board podem CRUD
create policy "card_board_member" on cards
  for all using (
    exists (
      select 1 from lists l
      join board_members bm on bm.board_id = l.board_id
      where l.id = cards.list_id and bm.user_id = auth.uid()
    )
    or exists (
      select 1 from lists l
      join boards b on b.id = l.board_id
      join workspaces w on w.id = b.workspace_id
      where l.id = cards.list_id and w.owner_id = auth.uid()
    )
  );

-- Labels: membros do board
create policy "label_board_member" on labels
  for all using (
    exists (
      select 1 from board_members bm
      where bm.board_id = labels.board_id and bm.user_id = auth.uid()
    )
    or exists (
      select 1 from boards b
      join workspaces w on w.id = b.workspace_id
      where b.id = labels.board_id and w.owner_id = auth.uid()
    )
  );

-- Card Labels: via card access
create policy "card_label_access" on card_labels
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      join board_members bm on bm.board_id = l.board_id
      where c.id = card_labels.card_id and bm.user_id = auth.uid()
    )
  );

-- Checklists: via card access
create policy "checklist_access" on checklists
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      join board_members bm on bm.board_id = l.board_id
      where c.id = checklists.card_id and bm.user_id = auth.uid()
    )
  );

-- Checklist Items: via checklist access
create policy "checklist_item_access" on checklist_items
  for all using (
    exists (
      select 1 from checklists cl
      join cards c on c.id = cl.card_id
      join lists l on l.id = c.list_id
      join board_members bm on bm.board_id = l.board_id
      where cl.id = checklist_items.checklist_id and bm.user_id = auth.uid()
    )
  );

-- Board Members: membros veem, admin gerencia
create policy "board_members_select" on board_members
  for select using (
    user_id = auth.uid()
    or exists (select 1 from board_members bm2 where bm2.board_id = board_members.board_id and bm2.user_id = auth.uid())
  );

create policy "board_members_manage" on board_members
  for insert with check (
    exists (select 1 from boards b join workspaces w on w.id = b.workspace_id where b.id = board_members.board_id and w.owner_id = auth.uid())
    or exists (select 1 from board_members bm where bm.board_id = board_members.board_id and bm.user_id = auth.uid() and bm.role = 'admin')
  );

-- Card Members
create policy "card_member_access" on card_members
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      join board_members bm on bm.board_id = l.board_id
      where c.id = card_members.card_id and bm.user_id = auth.uid()
    )
  );

-- Comments
create policy "comment_access" on comments
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      join board_members bm on bm.board_id = l.board_id
      where c.id = comments.card_id and bm.user_id = auth.uid()
    )
  );

-- Attachments
create policy "attachment_access" on attachments
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      join board_members bm on bm.board_id = l.board_id
      where c.id = attachments.card_id and bm.user_id = auth.uid()
    )
  );

-- Enable Realtime
alter publication supabase_realtime add table lists;
alter publication supabase_realtime add table cards;
alter publication supabase_realtime add table labels;
alter publication supabase_realtime add table card_labels;
alter publication supabase_realtime add table comments;

-- Default labels for new boards (function + trigger)
create or replace function create_default_labels()
returns trigger as $$
begin
  insert into labels (board_id, name, color) values
    (NEW.id, '', '#61bd4f'),
    (NEW.id, '', '#f2d600'),
    (NEW.id, '', '#ff9f1a'),
    (NEW.id, '', '#eb5a46'),
    (NEW.id, '', '#c377e0'),
    (NEW.id, '', '#0079bf');
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_board_created
  after insert on boards
  for each row execute function create_default_labels();

-- Auto add owner as board admin
create or replace function add_board_owner_as_admin()
returns trigger as $$
declare
  ws_owner uuid;
begin
  select owner_id into ws_owner from workspaces where id = NEW.workspace_id;
  insert into board_members (board_id, user_id, role) values (NEW.id, ws_owner, 'admin');
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_board_created_add_owner
  after insert on boards
  for each row execute function add_board_owner_as_admin();
