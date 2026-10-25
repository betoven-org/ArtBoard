-- Criar org para TODOS os users que não têm org (não só os com workspaces)
do $$
declare
  u record;
  new_org_id uuid;
begin
  for u in (
    select au.id,
      coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as name,
      au.email
    from auth.users au
    where not exists (
      select 1 from organization_members om where om.user_id = au.id
    )
  ) loop
    insert into organizations (name, slug, owner_id)
    values (
      u.name || '''s Org',
      lower(regexp_replace(u.name, '[^a-z0-9]+', '-', 'gi')) || '-' || substr(u.id::text, 1, 8),
      u.id
    )
    returning id into new_org_id;

    -- Vincular workspaces órfãos desse user à nova org
    update workspaces set org_id = new_org_id
    where owner_id = u.id and org_id is null;
  end loop;
end;
$$;
