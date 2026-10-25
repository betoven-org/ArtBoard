'use server'

import { createClient } from '@/lib/supabase/server'

type OrgContext = {
  userId: string
  orgId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  supabase: Awaited<ReturnType<typeof createClient>>
}

/**
 * Resolve org_id do usuário autenticado.
 * Usar apenas em operações que precisam de org_id (create, delete, admin).
 * Para operações simples (update card, toggle), usar createClient() direto — RLS protege.
 */
export async function getOrgContext(): Promise<OrgContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) throw new Error('Usuário sem organização')

  return {
    userId: user.id,
    orgId: membership.org_id,
    role: membership.role as OrgContext['role'],
    supabase,
  }
}

/**
 * Registra ação no audit log.
 * Aceita contexto já resolvido para evitar roundtrip duplicado.
 */
export async function audit(
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, unknown>,
  ctx?: OrgContext,
) {
  const resolved = ctx || await getOrgContext()
  // Fire-and-forget — não bloqueia a resposta
  resolved.supabase.from('audit_logs').insert({
    org_id: resolved.orgId,
    user_id: resolved.userId,
    action,
    target_type: targetType,
    target_id: targetId || null,
    details: details || {},
  }).then(() => {})
}

/**
 * Verifica se o plano da org permite a feature.
 */
export async function checkFeature(feature: string, ctx?: OrgContext): Promise<boolean> {
  const resolved = ctx || await getOrgContext()
  const { data } = await resolved.supabase
    .rpc('can_use_feature', { p_org_id: resolved.orgId, p_feature: feature })
  return data === true
}

/**
 * Lança erro se a feature não está no plano.
 */
export async function requireFeature(feature: string, ctx?: OrgContext) {
  const allowed = await checkFeature(feature, ctx)
  if (!allowed) {
    throw new Error(`Seu plano não inclui "${feature}". Faça upgrade para continuar.`)
  }
}

/**
 * Verifica se user tem role mínima na org.
 */
export async function requireRole(minRole: 'viewer' | 'member' | 'admin' | 'owner', ctx?: OrgContext) {
  const resolved = ctx || await getOrgContext()
  const hierarchy = ['viewer', 'member', 'admin', 'owner']
  if (hierarchy.indexOf(resolved.role) < hierarchy.indexOf(minRole)) {
    throw new Error(`Permissão insuficiente. Requer: ${minRole}`)
  }
}
