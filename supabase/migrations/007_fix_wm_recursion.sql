-- Fix workspace_members RLS recursion

-- Helper function to check workspace membership without triggering RLS
create or replace function is_workspace_member(p_workspace_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from workspace_members where workspace_id = p_workspace_id and user_id = p_user_id
  );
$$ language sql security definer stable;

-- Drop recursive policies
drop policy if exists "wm_select" on workspace_members;
drop policy if exists "wm_insert" on workspace_members;
drop policy if exists "wm_delete" on workspace_members;

-- Recreate without self-reference
create policy "wm_select" on workspace_members
  for select using (
    user_id = auth.uid()
    or exists (select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = auth.uid())
  );

create policy "wm_insert" on workspace_members
  for insert with check (
    exists (select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = auth.uid())
  );

create policy "wm_delete" on workspace_members
  for delete using (
    exists (select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = auth.uid())
  );

-- Fix workspace select to use helper function
drop policy if exists "workspace_select" on workspaces;

create policy "workspace_select" on workspaces
  for select using (
    owner_id = auth.uid()
    or is_workspace_member(id, auth.uid())
  );
