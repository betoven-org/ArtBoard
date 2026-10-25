'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createList(boardId: string, name: string) {
  const supabase = await createClient()

  // Pegar a maior posição atual
  const { data: lastList } = await supabase
    .from('lists')
    .select('position')
    .eq('board_id', boardId)
    .eq('closed', false)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = lastList ? lastList.position + 65536 : 65536

  const { data, error } = await supabase
    .from('lists')
    .insert({ board_id: boardId, name, position })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath(`/board/${boardId}`)
  return data
}

export async function updateList(listId: string, updates: { name?: string; position?: number }) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('lists')
    .update(updates)
    .eq('id', listId)

  if (error) throw new Error(error.message)
}

export async function archiveList(listId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('lists')
    .update({ closed: true })
    .eq('id', listId)

  if (error) throw new Error(error.message)
}

export async function getArchivedLists(boardId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('lists').select('id, name').eq('board_id', boardId).eq('closed', true)
  return data || []
}

export async function restoreList(listId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('lists').update({ closed: false }).eq('id', listId)
  if (error) throw new Error(error.message)
}
