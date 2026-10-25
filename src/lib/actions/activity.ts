'use server'

import { getOrgContext } from '@/lib/org-context'

export async function logActivity(boardId: string, cardId: string | null, action: string, details?: Record<string, unknown>) {
  const { supabase, userId } = await getOrgContext()
  await supabase.from('activity_log').insert({
    board_id: boardId, card_id: cardId, user_id: userId, action, details: details || {}
  })
}

export async function getBoardActivity(boardId: string) {
  const { supabase } = await getOrgContext()
  const { data } = await supabase
    .from('activity_log')
    .select('*, cards(name)')
    .eq('board_id', boardId)
    .order('created_at', { ascending: false })
    .limit(20)
  return data || []
}
