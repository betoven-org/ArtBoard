-- Garantir que todo owner de org tem membership
insert into organization_members (org_id, user_id, role)
select o.id, o.owner_id, 'owner'
from organizations o
where not exists (
  select 1 from organization_members om
  where om.org_id = o.id and om.user_id = o.owner_id
)
on conflict (org_id, user_id) do nothing;

-- Garantir que todo owner de workspace tem org
-- Se o workspace tem org_id mas o owner não é membro da org, adicionar
insert into organization_members (org_id, user_id, role)
select w.org_id, w.owner_id, 'member'
from workspaces w
where w.org_id is not null
and not exists (
  select 1 from organization_members om
  where om.org_id = w.org_id and om.user_id = w.owner_id
)
on conflict (org_id, user_id) do nothing;

-- Debug: mostrar estado atual
do $$
declare
  org_count integer;
  mem_count integer;
begin
  select count(*) into org_count from organizations;
  select count(*) into mem_count from organization_members;
  raise notice 'Organizations: %, Members: %', org_count, mem_count;
end;
$$;
