'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getOrganizations() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getOrganization(orgId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function createOrganization(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const slug = `${baseSlug}-${Date.now().toString(36)}`

  const { data, error } = await supabase
    .from('organizations')
    .insert({ name, slug, owner_id: user.id })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/')
  return data
}

export async function updateOrganization(orgId: string, updates: { name?: string; logo_url?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('organizations').update(updates).eq('id', orgId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function deleteOrganization(orgId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('organizations').delete().eq('id', orgId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

// Members
export async function getOrgMembers(orgId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organization_members')
    .select('org_id, user_id, role, created_at')
    .eq('org_id', orgId)

  if (error) throw new Error(error.message)

  // Enrich with user info
  const enriched = await Promise.all(
    (data || []).map(async (m) => {
      const { data: profile } = await supabase.auth.admin.getUserById(m.user_id).catch(() => ({ data: null }))
      return {
        ...m,
        name: (profile as any)?.user?.user_metadata?.full_name || null,
        email: (profile as any)?.user?.email || null,
      }
    })
  )

  return enriched
}

export async function inviteOrgMember(orgId: string, email: string, role: string = 'member') {
  const supabase = await createClient()

  // Find user by email via a lookup table or auth - using RPC approach
  const { data: users, error: lookupError } = await supabase
    .rpc('get_user_id_by_email', { p_email: email })

  if (lookupError || !users) throw new Error('Usuário não encontrado. O usuário precisa ter uma conta.')

  const userId = users as string

  const { error } = await supabase
    .from('organization_members')
    .insert({ org_id: orgId, user_id: userId, role })

  if (error) {
    if (error.code === '23505') throw new Error('Usuário já é membro desta organização')
    throw new Error(error.message)
  }

  revalidatePath('/')
  return { email }
}

export async function removeOrgMember(orgId: string, userId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function updateOrgMemberRole(orgId: string, userId: string, role: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('org_id', orgId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/')
}
