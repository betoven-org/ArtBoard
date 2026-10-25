'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autenticado')
  return { supabase, userId: user.id }
}

export async function toggleStar(boardId: string) {
  const { supabase, userId } = await getUserId()

  const { data: existing } = await supabase
    .from('board_stars').select('board_id').eq('board_id', boardId).eq('user_id', userId).maybeSingle()

  if (existing) {
    await supabase.from('board_stars').delete().eq('board_id', boardId).eq('user_id', userId)
  } else {
    await supabase.from('board_stars').insert({ board_id: boardId, user_id: userId })
  }

  revalidatePath('/')
  return !existing
}

export async function isStarred(boardId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { count } = await supabase
    .from('board_stars').select('board_id', { count: 'exact', head: true })
    .eq('board_id', boardId).eq('user_id', user.id)

  return (count || 0) > 0
}
