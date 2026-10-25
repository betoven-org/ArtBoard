'use server'

import { createClient } from '@/lib/supabase/server'

export async function getBoardMembers(boardId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('board_members')
    .select('user_id, role')
    .eq('board_id', boardId)

  if (!data || data.length === 0) return []

  // Buscar nomes/emails dos usuarios
  const { data: { users } } = await supabase.auth.admin.listUsers()
  return data.map((m) => {
    const user = users?.find((u) => u.id === m.user_id)
    return {
      ...m,
      name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario',
      email: user?.email || '',
    }
  })
}

export async function inviteMember(boardId: string, email: string) {
  const supabase = await createClient()

  // Buscar user por email via admin (simplificado - em produção usaria invite)
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.find(u => u.email === email)

  if (!user) throw new Error('Usuário não encontrado')

  const { error } = await supabase
    .from('board_members')
    .insert({ board_id: boardId, user_id: user.id, role: 'member' })

  if (error) throw new Error(error.message)
  return { userId: user.id, email: user.email }
}
