-- #1: Helper para pegar org_id do user autenticado
create or replace function get_user_org_id(p_user_id uuid)
returns uuid as $$
  select org_id from organization_members
  where user_id = p_user_id and role in ('owner', 'admin', 'member', 'viewer')
  limit 1;
$$ language sql security definer stable;

-- #2: Audit Logs
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb default '{}',
  ip_address text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_org on audit_logs(org_id);
create index idx_audit_logs_user on audit_logs(user_id);
create index idx_audit_logs_created on audit_logs(org_id, created_at desc);
create index idx_audit_logs_target on audit_logs(target_type, target_id);

alter table audit_logs enable row level security;

create policy "audit_select" on audit_logs
  for select using (is_org_member(org_id, auth.uid()));

create policy "audit_insert" on audit_logs
  for insert with check (is_org_member(org_id, auth.uid()));

-- #3: Plans e Feature Gates
create table plans (
  id text primary key,
  name text not null,
  price_monthly integer not null default 0,
  price_yearly integer not null default 0,
  max_members integer not null default 5,
  max_workspaces integer not null default 3,
  max_boards_per_workspace integer not null default 10,
  max_storage_mb integer not null default 100,
  features jsonb not null default '[]'
);

-- Planos default
insert into plans (id, name, price_monthly, price_yearly, max_members, max_workspaces, max_boards_per_workspace, max_storage_mb, features) values
  ('free', 'Free', 0, 0, 5, 3, 10, 100, '["boards","cards","checklists","comments","labels"]'),
  ('starter', 'Starter', 2900, 24900, 15, 10, 50, 500, '["boards","cards","checklists","comments","labels","custom_fields","automations","timesheets","sprints"]'),
  ('pro', 'Pro', 5900, 49900, 50, 50, 200, 2000, '["boards","cards","checklists","comments","labels","custom_fields","automations","timesheets","sprints","api_keys","audit_logs","ai_builder"]'),
  ('enterprise', 'Enterprise', 0, 0, -1, -1, -1, -1, '["*"]');

-- Billing info na org
alter table organizations add column billing_email text;
alter table organizations add column stripe_customer_id text;
alter table organizations add column stripe_subscription_id text;

-- Function: check feature gate
create or replace function can_use_feature(p_org_id uuid, p_feature text)
returns boolean as $$
declare
  org_plan text;
  plan_features jsonb;
begin
  select plan into org_plan from organizations where id = p_org_id;
  select features into plan_features from plans where id = org_plan;

  if plan_features is null then return false; end if;
  if plan_features ? '*' then return true; end if;

  return plan_features ? p_feature;
end;
$$ language plpgsql security definer stable;

-- #4: Granular Roles (custom roles por org)
create table org_roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  permissions jsonb not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create index idx_org_roles_org on org_roles(org_id);

alter table org_roles enable row level security;

create policy "org_roles_select" on org_roles
  for select using (is_org_member(org_id, auth.uid()));

create policy "org_roles_manage" on org_roles
  for all using (is_org_admin(org_id, auth.uid()));

-- Default roles para cada org existente
create or replace function create_default_org_roles()
returns trigger as $$
begin
  insert into org_roles (org_id, name, permissions, is_default) values
    (NEW.id, 'admin', '{"workspaces":["*"],"boards":["*"],"members":["*"],"settings":["*"],"billing":["read"]}', true),
    (NEW.id, 'member', '{"workspaces":["read","create"],"boards":["*"],"members":["read"],"settings":["read"]}', true),
    (NEW.id, 'viewer', '{"workspaces":["read"],"boards":["read"],"members":["read"]}', true);
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_org_created_default_roles
  after insert on organizations
  for each row execute function create_default_org_roles();

-- Backfill: criar roles default para orgs existentes
insert into org_roles (org_id, name, permissions, is_default)
select id, 'admin', '{"workspaces":["*"],"boards":["*"],"members":["*"],"settings":["*"],"billing":["read"]}', true
from organizations
on conflict (org_id, name) do nothing;

insert into org_roles (org_id, name, permissions, is_default)
select id, 'member', '{"workspaces":["read","create"],"boards":["*"],"members":["read"],"settings":["read"]}', true
from organizations
on conflict (org_id, name) do nothing;

insert into org_roles (org_id, name, permissions, is_default)
select id, 'viewer', '{"workspaces":["read"],"boards":["read"],"members":["read"]}', true
from organizations
on conflict (org_id, name) do nothing;

-- Vincular org_members a custom role (opcional, fallback pro role string)
alter table organization_members add column custom_role_id uuid references org_roles(id) on delete set null;

-- #5: API Keys
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  permissions jsonb not null default '{}',
  scopes text[] not null default '{}',
  expires_at timestamptz,
  last_used_at timestamptz,
  remaining_calls integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_api_keys_org on api_keys(org_id);
create index idx_api_keys_hash on api_keys(key_hash);
create index idx_api_keys_prefix on api_keys(key_prefix);

alter table api_keys enable row level security;

create policy "api_keys_select" on api_keys
  for select using (is_org_member(org_id, auth.uid()));

create policy "api_keys_insert" on api_keys
  for insert with check (is_org_admin(org_id, auth.uid()));

create policy "api_keys_update" on api_keys
  for update using (
    user_id = auth.uid() or is_org_admin(org_id, auth.uid())
  );

create policy "api_keys_delete" on api_keys
  for delete using (
    user_id = auth.uid() or is_org_admin(org_id, auth.uid())
  );

-- Helper: buscar user por email (necessário para convites)
create or replace function get_user_id_by_email(p_email text)
returns uuid as $$
  select id from auth.users where email = p_email limit 1;
$$ language sql security definer stable;

-- Realtime
alter publication supabase_realtime add table audit_logs;
