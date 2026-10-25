-- Fix definitivo: eliminar TODA referência circular

-- workspace_members: apenas ver os próprios registros
drop policy if exists "wm_select" on workspace_members;
drop policy if exists "wm_insert" on workspace_members;
drop policy if exists "wm_delete" on workspace_members;

create policy "wm_select" on workspace_members
  for select using (user_id = auth.uid());

create policy "wm_insert" on workspace_members
  for insert with check (
    exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );

create policy "wm_delete" on workspace_members
  for delete using (
    exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );

-- workspaces: owner vê + security definer pra membros
drop policy if exists "workspace_select" on workspaces;
drop policy if exists "workspace_insert" on workspaces;
drop policy if exists "workspace_update" on workspaces;
drop policy if exists "workspace_delete" on workspaces;

create policy "workspace_select" on workspaces
  for select using (
    owner_id = auth.uid()
    or is_workspace_member(id, auth.uid())
  );

create policy "workspace_insert" on workspaces
  for insert with check (owner_id = auth.uid());

create policy "workspace_update" on workspaces
  for update using (owner_id = auth.uid());

create policy "workspace_delete" on workspaces
  for delete using (owner_id = auth.uid());
