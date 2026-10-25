-- Fix: om_select causa recursão (is_org_member consulta organization_members)
-- Mesma solução usada em workspace_members: query direta sem function

drop policy if exists "om_select" on organization_members;

-- User vê seus próprios registros (sem recursão)
create policy "om_select" on organization_members
  for select using (user_id = auth.uid());
