-- Webhooks system
create table if not exists webhooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  url text not null,
  events text[] not null default '{}',
  secret text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Index para busca por org
create index if not exists idx_webhooks_org_id on webhooks(org_id);

-- Index para busca por org + ativo (usado no fire)
create index if not exists idx_webhooks_org_active on webhooks(org_id) where is_active = true;

-- RLS
alter table webhooks enable row level security;

-- Politica: membros da org podem ver webhooks da org
create policy "webhooks_select_org_members" on webhooks
  for select using (
    org_id in (
      select om.org_id from organization_members om where om.user_id = auth.uid()
    )
  );

-- Politica: admin/owner podem inserir
create policy "webhooks_insert_org_admins" on webhooks
  for insert with check (
    org_id in (
      select om.org_id from organization_members om
      where om.user_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

-- Politica: admin/owner podem atualizar
create policy "webhooks_update_org_admins" on webhooks
  for update using (
    org_id in (
      select om.org_id from organization_members om
      where om.user_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

-- Politica: admin/owner podem deletar
create policy "webhooks_delete_org_admins" on webhooks
  for delete using (
    org_id in (
      select om.org_id from organization_members om
      where om.user_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

-- Eventos suportados (referencia):
-- 'card.created', 'card.moved', 'card.completed', 'board.created', 'sprint.completed'
