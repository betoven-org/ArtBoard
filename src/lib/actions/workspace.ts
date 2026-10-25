'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createWorkspace(name: string, orgId?: string, clientId?: string, teamId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const slug = `${baseSlug}-${Date.now().toString(36)}`

  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      name,
      slug,
      owner_id: user.id,
      org_id: orgId || null,
      client_id: clientId || null,
      team_id: teamId || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
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
  const supabase = await createClient()
  const { error } = await supabase.from('workspaces').update(updates).eq('id', workspaceId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function deleteWorkspace(workspaceId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('workspaces').delete().eq('id', workspaceId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}
