'use server'

import { revalidatePath } from 'next/cache'
import { getOrgContext } from '@/lib/org-context'

export async function toggleStar(boardId: string) {
  const { supabase, userId } = await getOrgContext()

  const { data: existing } = await supabase
    .from('board_stars')
    .select()
    .eq('board_id', boardId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('board_stars').delete()
      .eq('board_id', boardId).eq('user_id', userId)
    if (error) throw new Error(error.message)
    revalidatePath('/')
    return false
  } else {
    const { error } = await supabase.from('board_stars').insert({ board_id: boardId, user_id: userId })
    if (error) throw new Error(error.message)
    revalidatePath('/')
    return true
  }
}

export async function isStarred(boardId: string) {
  const { supabase, userId } = await getOrgContext()

  const { data } = await supabase
    .from('board_stars')
    .select()
    .eq('board_id', boardId)
    .eq('user_id', userId)
    .single()

  return !!data
}
