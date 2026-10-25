'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSprints(boardId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sprints')
    .select('*')
    .eq('board_id', boardId)
    .order('created_at')
  return data || []
}

export async function createSprint(boardId: string, name: string, startDate?: string, endDate?: string, goal?: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sprints')
    .insert({ board_id: boardId, name, start_date: startDate || null, end_date: endDate || null, goal: goal || null })
    .select().single()
  if (error) throw new Error(error.message)
  revalidatePath(`/board/${boardId}`)
  return data
}

export async function updateSprint(sprintId: string, updates: { name?: string; status?: string; start_date?: string; end_date?: string; goal?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('sprints').update(updates).eq('id', sprintId)
  if (error) throw new Error(error.message)
}

export async function deleteSprint(sprintId: string) {
  const supabase = await createClient()
  // Remove sprint_id from cards first
  await supabase.from('cards').update({ sprint_id: null }).eq('sprint_id', sprintId)
  const { error } = await supabase.from('sprints').delete().eq('id', sprintId)
  if (error) throw new Error(error.message)
}

export async function assignCardToSprint(cardId: string, sprintId: string | null) {
  const supabase = await createClient()
  const { error } = await supabase.from('cards').update({ sprint_id: sprintId }).eq('id', cardId)
  if (error) throw new Error(error.message)
}
