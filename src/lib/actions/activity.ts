'use server'

import { createClient } from '@/lib/supabase/server'

export async function logActivity(boardId: string, cardId: string | null, action: string, details?: Record<string, unknown>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('activity_log').insert({
    board_id: boardId, card_id: cardId, user_id: user.id, action, details: details || {}
  })
}

export async function getBoardActivity(boardId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('activity_log').select('*, cards(name)')
    .eq('board_id', boardId).order('created_at', { ascending: false }).limit(20)
  return data || []
}
