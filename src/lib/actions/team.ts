'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getTeams(orgId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function createTeam(orgId: string, name: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams')
    .insert({ org_id: orgId, name })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/')
  return data
}

export async function updateTeam(teamId: string, updates: { name?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('teams').update(updates).eq('id', teamId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function deleteTeam(teamId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('teams').delete().eq('id', teamId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function getTeamMembers(teamId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('team_members')
    .select('team_id, user_id, role, created_at')
    .eq('team_id', teamId)

  if (error) throw new Error(error.message)
  return data || []
}

export async function addTeamMember(teamId: string, userId: string, role: string = 'member') {
  const supabase = await createClient()
  const { error } = await supabase
    .from('team_members')
    .insert({ team_id: teamId, user_id: userId, role })

  if (error) {
    if (error.code === '23505') throw new Error('Usuário já é membro deste time')
    throw new Error(error.message)
  }
  revalidatePath('/')
}

export async function removeTeamMember(teamId: string, userId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/')
}
