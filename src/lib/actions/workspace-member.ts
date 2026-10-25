'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getWorkspaceMembers(workspaceId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workspace_members')
    .select('user_id, role, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  // Buscar nomes/emails dos usuários
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const members = (data || []).map((m) => {
    const user = users?.find((u) => u.id === m.user_id)
    return {
      ...m,
      name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário',
      email: user?.email || '',
    }
  })

  return members
}

export async function inviteWorkspaceMember(workspaceId: string, email: string) {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) throw new Error('Nao autenticado')

  // Verificar se é owner
  const { data: ws } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single()

  if (!ws || ws.owner_id !== currentUser.id) {
    throw new Error('Apenas o dono do workspace pode convidar membros')
  }

  // Buscar user por email
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError) throw new Error('Erro ao buscar usuarios')

  const targetUser = users?.find((u) => u.email === email)
  if (!targetUser) throw new Error('Usuario nao encontrado. Precisa ter conta no ArtBoard.')

  // Verificar se já é membro
  const { data: existing } = await supabase
    .from('workspace_members')
    .select()
    .eq('workspace_id', workspaceId)
    .eq('user_id', targetUser.id)
    .maybeSingle()

  if (existing) throw new Error('Usuario ja e membro deste workspace')

  // Adicionar
  const { error } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: workspaceId, user_id: targetUser.id, role: 'member' })

  if (error) throw new Error(error.message)

  revalidatePath('/')
  return { userId: targetUser.id, email: targetUser.email }
}

export async function removeWorkspaceMember(workspaceId: string, userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/')
}
