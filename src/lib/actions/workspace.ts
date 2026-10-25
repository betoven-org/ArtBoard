'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getOrgContext, audit, requireFeature } from '@/lib/org-context'

export async function createWorkspace(name: string, orgId?: string, clientId?: string, teamId?: string) {
  const ctx = await getOrgContext()
  const resolvedOrgId = orgId || ctx.orgId

  // Feature gate: verificar limite de workspaces
  const { data: count } = await ctx.supabase
    .from('workspaces')
    .select('id', { count: 'exact' })
    .eq('org_id', resolvedOrgId)

  const { data: plan } = await ctx.supabase
    .from('plans')
    .select('max_workspaces')
    .eq('id', (await ctx.supabase.from('organizations').select('plan').eq('id', resolvedOrgId).single()).data?.plan || 'free')
    .single()

  if (plan && plan.max_workspaces > 0 && (count?.length || 0) >= plan.max_workspaces) {
    throw new Error(`Limite de workspaces atingido (${plan.max_workspaces}). Faça upgrade do plano.`)
  }

  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const slug = `${baseSlug}-${Date.now().toString(36)}`

  const { data, error } = await ctx.supabase
    .from('workspaces')
    .insert({
      name,
      slug,
      owner_id: ctx.userId,
      org_id: resolvedOrgId,
      client_id: clientId || null,
      team_id: teamId || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await audit('create', 'workspace', data.id, { name, clientId, teamId })
  revalidatePath('/')
  return data
}

export async function getWorkspaces() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function updateWorkspace(workspaceId: string, updates: { name?: string }) {
  const { supabase } = await getOrgContext()
  const { error } = await supabase.from('workspaces').update(updates).eq('id', workspaceId)
  if (error) throw new Error(error.message)

  await audit('update', 'workspace', workspaceId, updates)
  revalidatePath('/')
}

export async function deleteWorkspace(workspaceId: string) {
  const { supabase } = await getOrgContext()
  const { error } = await supabase.from('workspaces').delete().eq('id', workspaceId)
  if (error) throw new Error(error.message)

  await audit('delete', 'workspace', workspaceId)
  revalidatePath('/')
}
