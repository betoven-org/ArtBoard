'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAutomations(boardId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('automations')
    .select('*')
    .eq('board_id', boardId)
    .order('created_at')
  return data || []
}

export async function createAutomation(boardId: string, automation: {
  name: string
  trigger_type: string
  trigger_config: Record<string, unknown>
  action_type: string
  action_config: Record<string, unknown>
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('automations')
    .insert({ board_id: boardId, ...automation })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath(`/board/${boardId}`)
  return data
}

export async function toggleAutomation(automationId: string, enabled: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('automations')
    .update({ enabled })
    .eq('id', automationId)
  if (error) throw new Error(error.message)
}

export async function deleteAutomation(automationId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('automations')
    .delete()
    .eq('id', automationId)
  if (error) throw new Error(error.message)
}

export async function executeAutomations(boardId: string, cardId: string, event: {
  type: string
  fromListId?: string
  toListId?: string
}) {
  const supabase = await createClient()

  const { data: automations } = await supabase
    .from('automations')
    .select('*')
    .eq('board_id', boardId)
    .eq('enabled', true)
    .eq('trigger_type', event.type)

  for (const auto of automations || []) {
    const config = auto.trigger_config as Record<string, unknown>
    const action = auto.action_config as Record<string, unknown>

    if (auto.trigger_type === 'card_moved_to_list') {
      if (config.list_id && config.list_id !== event.toListId) continue
    }

    if (auto.action_type === 'mark_complete') {
      await supabase.from('cards').update({ due_complete: true }).eq('id', cardId)
    } else if (auto.action_type === 'assign_member' && action.user_id) {
      await supabase.from('card_members').upsert({
        card_id: cardId,
        user_id: action.user_id as string,
      })
    } else if (auto.action_type === 'add_label' && action.label_id) {
      await supabase.from('card_labels').upsert({
        card_id: cardId,
        label_id: action.label_id as string,
      })
    }
  }
}
