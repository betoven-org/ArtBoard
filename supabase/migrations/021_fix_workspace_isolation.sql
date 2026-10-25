-- Fix: workspaces sem org_id devem ser visíveis apenas pelo owner
-- Workspaces COM org_id são filtrados pela membership da org

drop policy if exists "workspace_select" on workspaces;
drop policy if exists "workspace_insert" on workspaces;
drop policy if exists "workspace_update" on workspaces;
drop policy if exists "workspace_delete" on workspaces;

create policy "workspace_select" on workspaces
  for select using (
    case
      when org_id is not null then is_org_member(org_id, auth.uid())
      else owner_id = auth.uid()
    end
  );

create policy "workspace_insert" on workspaces
  for insert with check (
    case
      when org_id is not null then is_org_member(org_id, auth.uid())
      else owner_id = auth.uid()
    end
  );

create policy "workspace_update" on workspaces
  for update using (
    case
      when org_id is not null then is_org_admin(org_id, auth.uid())
      else owner_id = auth.uid()
    end
  );

create policy "workspace_delete" on workspaces
  for delete using (
    case
      when org_id is not null then is_org_admin(org_id, auth.uid())
      else owner_id = auth.uid()
    end
  );
