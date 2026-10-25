'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Resolve org_id do usuário autenticado.
 * Toda server action que toca dados deve chamar isso.
 */
export async function getOrgContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) throw new Error('Usuário sem organização')

  return {
    userId: user.id,
    orgId: membership.org_id,
    role: membership.role as 'owner' | 'admin' | 'member' | 'viewer',
    supabase,
  }
}

/**
 * Registra ação no audit log.
 */
export async function audit(
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, unknown>,
) {
  const { supabase, userId, orgId } = await getOrgContext()

  await supabase.from('audit_logs').insert({
    org_id: orgId,
    user_id: userId,
    action,
    target_type: targetType,
    target_id: targetId || null,
    details: details || {},
  })
}

/**
 * Verifica se o plano da org permite a feature.
 */
export async function checkFeature(feature: string): Promise<boolean> {
  const { supabase, orgId } = await getOrgContext()

  const { data } = await supabase
    .rpc('can_use_feature', { p_org_id: orgId, p_feature: feature })

  return data === true
}

/**
 * Lança erro se a feature não está no plano.
 */
export async function requireFeature(feature: string) {
  const allowed = await checkFeature(feature)
  if (!allowed) {
    throw new Error(`Seu plano não inclui "${feature}". Faça upgrade para continuar.`)
  }
}

/**
 * Verifica se user tem role mínima na org.
 */
export async function requireRole(minRole: 'viewer' | 'member' | 'admin' | 'owner') {
  const { role } = await getOrgContext()
  const hierarchy = ['viewer', 'member', 'admin', 'owner']
  const userLevel = hierarchy.indexOf(role)
  const requiredLevel = hierarchy.indexOf(minRole)

  if (userLevel < requiredLevel) {
    throw new Error(`Permissão insuficiente. Requer: ${minRole}`)
  }
}
