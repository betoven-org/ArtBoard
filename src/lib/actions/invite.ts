'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgContext, audit } from '@/lib/org-context'
import { revalidatePath } from 'next/cache'

export async function createInvite(orgId: string, email: string, role: string = 'member') {
  const ctx = await getOrgContext()
  const supabase = ctx.supabase

  // Tentar encontrar usuario pelo email via RPC
  const { data: userId, error: lookupError } = await supabase
    .rpc('get_user_id_by_email', { p_email: email })

  if (lookupError || !userId) {
    throw new Error('Usuario precisa criar conta primeiro')
  }

  const { error } = await supabase
    .from('organization_members')
    .insert({ org_id: orgId, user_id: userId as string, role })

  if (error) {
    if (error.code === '23505') throw new Error('Usuario ja e membro desta organizacao')
    throw new Error(error.message)
  }

  await audit('create', 'invite', undefined, { email, role, orgId })
  revalidatePath('/')
  return { email, userId }
}

export async function getPendingInvites(orgId: string) {
  const ctx = await getOrgContext()
  // Sem tabela de pending_invites, retornamos lista vazia
  // shortcut: sem tabela de convites pendentes, expandir quando houver migration dedicada
  return []
}

export async function cancelInvite(inviteId: string) {
  // shortcut: sem tabela de pending_invites, noop por enquanto
  throw new Error('Funcionalidade de convites pendentes nao disponivel sem tabela dedicada')
}
