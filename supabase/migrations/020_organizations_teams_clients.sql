-- Multi-tenant SaaS: Organizations → Teams → Clients → Workspaces

-- Organizations (empresa/agência)
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'enterprise')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  logo_url text,
  created_at timestamptz not null default now()
);

-- Organization Members
create table organization_members (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Teams (times dentro da org)
create table teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Team Members
create table team_members (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('lead', 'member')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- Clients (clientes da empresa)
create table clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  contact_email text,
  logo_url text,
  created_at timestamptz not null default now(),
  unique (org_id, slug)
);

-- Vincular workspaces à org e client
alter table workspaces add column org_id uuid references organizations(id) on delete cascade;
alter table workspaces add column client_id uuid references clients(id) on delete set null;
alter table workspaces add column team_id uuid references teams(id) on delete set null;

-- Indexes
create index idx_org_members_user on organization_members(user_id);
create index idx_org_members_org on organization_members(org_id);
create index idx_teams_org on teams(org_id);
create index idx_team_members_user on team_members(user_id);
create index idx_clients_org on clients(org_id);
create index idx_workspaces_org on workspaces(org_id);
create index idx_workspaces_client on workspaces(client_id);
create index idx_workspaces_team on workspaces(team_id);

-- Enable RLS
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table clients enable row level security;

-- Helper functions (security definer para evitar recursão RLS)
create or replace function is_org_member(p_org_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from organization_members where org_id = p_org_id and user_id = p_user_id
  );
$$ language sql security definer stable;

create or replace function is_org_admin(p_org_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from organization_members
    where org_id = p_org_id and user_id = p_user_id and role in ('owner', 'admin')
  );
$$ language sql security definer stable;

create or replace function is_org_owner(p_org_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from organization_members
    where org_id = p_org_id and user_id = p_user_id and role = 'owner'
  );
$$ language sql security definer stable;

create or replace function is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from team_members where team_id = p_team_id and user_id = p_user_id
  );
$$ language sql security definer stable;

-- RLS: Organizations
create policy "org_select" on organizations
  for select using (is_org_member(id, auth.uid()));

create policy "org_insert" on organizations
  for insert with check (owner_id = auth.uid());

create policy "org_update" on organizations
  for update using (is_org_admin(id, auth.uid()));

create policy "org_delete" on organizations
  for delete using (is_org_owner(id, auth.uid()));

-- RLS: Organization Members
create policy "om_select" on organization_members
  for select using (is_org_member(org_id, auth.uid()));

create policy "om_insert" on organization_members
  for insert with check (is_org_admin(org_id, auth.uid()));

create policy "om_update" on organization_members
  for update using (is_org_admin(org_id, auth.uid()));

create policy "om_delete" on organization_members
  for delete using (is_org_admin(org_id, auth.uid()));

-- RLS: Teams
create policy "team_select" on teams
  for select using (is_org_member(org_id, auth.uid()));

create policy "team_insert" on teams
  for insert with check (is_org_admin(org_id, auth.uid()));

create policy "team_update" on teams
  for update using (is_org_admin(org_id, auth.uid()));

create policy "team_delete" on teams
  for delete using (is_org_admin(org_id, auth.uid()));

-- RLS: Team Members
create policy "tm_select" on team_members
  for select using (
    exists (select 1 from teams t where t.id = team_members.team_id and is_org_member(t.org_id, auth.uid()))
  );

create policy "tm_insert" on team_members
  for insert with check (
    exists (select 1 from teams t where t.id = team_members.team_id and is_org_admin(t.org_id, auth.uid()))
  );

create policy "tm_delete" on team_members
  for delete using (
    exists (select 1 from teams t where t.id = team_members.team_id and is_org_admin(t.org_id, auth.uid()))
  );

-- RLS: Clients
create policy "client_select" on clients
  for select using (is_org_member(org_id, auth.uid()));

create policy "client_insert" on clients
  for insert with check (is_org_admin(org_id, auth.uid()));

create policy "client_update" on clients
  for update using (is_org_admin(org_id, auth.uid()));

create policy "client_delete" on clients
  for delete using (is_org_admin(org_id, auth.uid()));

-- Update workspaces RLS: org members can see workspaces of their org
drop policy if exists "workspace_select" on workspaces;
drop policy if exists "workspace_insert" on workspaces;
drop policy if exists "workspace_update" on workspaces;
drop policy if exists "workspace_delete" on workspaces;

create policy "workspace_select" on workspaces
  for select using (
    owner_id = auth.uid()
    or is_workspace_member(id, auth.uid())
    or (org_id is not null and is_org_member(org_id, auth.uid()))
  );

create policy "workspace_insert" on workspaces
  for insert with check (
    owner_id = auth.uid()
    or (org_id is not null and is_org_member(org_id, auth.uid()))
  );

create policy "workspace_update" on workspaces
  for update using (
    owner_id = auth.uid()
    or (org_id is not null and is_org_admin(org_id, auth.uid()))
  );

create policy "workspace_delete" on workspaces
  for delete using (
    owner_id = auth.uid()
    or (org_id is not null and is_org_admin(org_id, auth.uid()))
  );

-- Trigger: auto-add owner as org member on org creation
create or replace function add_org_owner_as_member()
returns trigger as $$
begin
  insert into organization_members (org_id, user_id, role)
  values (NEW.id, NEW.owner_id, 'owner');
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_org_created_add_owner
  after insert on organizations
  for each row execute function add_org_owner_as_member();

-- Trigger: auto-create org for new users (onboarding)
create or replace function create_default_org_for_user()
returns trigger as $$
declare
  org_name text;
  org_slug text;
begin
  org_name := coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  org_slug := lower(regexp_replace(org_name, '[^a-z0-9]+', '-', 'gi')) || '-' || substr(NEW.id::text, 1, 8);

  insert into organizations (name, slug, owner_id)
  values (org_name, org_slug, NEW.id);

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_user_created_create_org
  after insert on auth.users
  for each row execute function create_default_org_for_user();

-- Backfill: create orgs for existing users and link their workspaces
do $$
declare
  u record;
  new_org_id uuid;
begin
  for u in (
    select distinct w.owner_id,
      coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as name,
      au.email
    from workspaces w
    join auth.users au on au.id = w.owner_id
    where w.org_id is null
  ) loop
    insert into organizations (name, slug, owner_id)
    values (
      u.name || '''s Org',
      lower(regexp_replace(u.name, '[^a-z0-9]+', '-', 'gi')) || '-' || substr(u.owner_id::text, 1, 8),
      u.owner_id
    )
    returning id into new_org_id;

    update workspaces set org_id = new_org_id where owner_id = u.owner_id and org_id is null;
  end loop;
end;
$$;

-- Realtime
alter publication supabase_realtime add table organizations;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table clients;
