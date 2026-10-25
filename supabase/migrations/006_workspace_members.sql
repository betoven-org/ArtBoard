-- Workspace Members (isolamento entre workspaces)
create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index idx_workspace_members_user on workspace_members(user_id);

alter table workspace_members enable row level security;

-- Members can see other members of their workspaces
create policy "wm_select" on workspace_members
  for select using (
    user_id = auth.uid()
    or workspace_id in (
      select wm2.workspace_id from workspace_members wm2 where wm2.user_id = auth.uid()
    )
    or exists (
      select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = auth.uid()
    )
  );

-- Only workspace owner can add members
create policy "wm_insert" on workspace_members
  for insert with check (
    exists (
      select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = auth.uid()
    )
  );

-- Only workspace owner can remove members
create policy "wm_delete" on workspace_members
  for delete using (
    exists (
      select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = auth.uid()
    )
  );

-- Auto add owner as admin member when workspace is created
create or replace function add_workspace_owner_as_member()
returns trigger as $$
begin
  insert into workspace_members (workspace_id, user_id, role)
  values (NEW.id, NEW.owner_id, 'admin');
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_workspace_created_add_owner
  after insert on workspaces
  for each row execute function add_workspace_owner_as_member();

-- Add existing workspace owners as members (backfill)
insert into workspace_members (workspace_id, user_id, role)
select id, owner_id, 'admin' from workspaces
on conflict do nothing;

-- Update workspaces RLS to also allow workspace members to see
drop policy if exists "workspace_owner_all" on workspaces;

create policy "workspace_select" on workspaces
  for select using (
    owner_id = auth.uid()
    or id in (select wm.workspace_id from workspace_members wm where wm.user_id = auth.uid())
  );

create policy "workspace_insert" on workspaces
  for insert with check (owner_id = auth.uid());

create policy "workspace_update" on workspaces
  for update using (owner_id = auth.uid());

create policy "workspace_delete" on workspaces
  for delete using (owner_id = auth.uid());

-- Update boards RLS: workspace members can also see boards
drop policy if exists "board_select" on boards;
drop policy if exists "board_insert" on boards;

create policy "board_select" on boards
  for select using (
    is_workspace_owner(workspace_id, auth.uid())
    or is_board_member(id, auth.uid())
    or workspace_id in (select wm.workspace_id from workspace_members wm where wm.user_id = auth.uid())
  );

create policy "board_insert" on boards
  for insert with check (
    is_workspace_owner(workspace_id, auth.uid())
    or workspace_id in (
      select wm.workspace_id from workspace_members wm
      where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  );
