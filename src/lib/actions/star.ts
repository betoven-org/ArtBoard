'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleStar(boardId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autenticado')

  const { data: existing } = await supabase
    .from('board_stars').select().eq('board_id', boardId).eq('user_id', user.id).maybeSingle()

  if (existing) {
    await supabase.from('board_stars').delete().eq('board_id', boardId).eq('user_id', user.id)
    revalidatePath('/')
    return false
  } else {
    await supabase.from('board_stars').insert({ board_id: boardId, user_id: user.id })
    revalidatePath('/')
    return true
  }
}

export async function isStarred(boardId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('board_stars').select().eq('board_id', boardId).eq('user_id', user.id).single()
  return !!data
}
