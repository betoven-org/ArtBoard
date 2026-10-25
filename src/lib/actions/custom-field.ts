'use server'

import { getOrgContext, requireFeature } from '@/lib/org-context'

export async function getCustomFields(boardId: string) {
  const { supabase } = await getOrgContext()
  const { data } = await supabase.from('custom_fields').select('*').eq('board_id', boardId).order('created_at')
  return data || []
}

export async function createCustomField(boardId: string, name: string, fieldType: string, options?: string[]) {
  await requireFeature('custom_fields')
  const { supabase } = await getOrgContext()
  const { data, error } = await supabase.from('custom_fields')
    .insert({ board_id: boardId, name, field_type: fieldType, options: options || [] })
    .select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteCustomField(fieldId: string) {
  const { supabase } = await getOrgContext()
  await supabase.from('custom_fields').delete().eq('id', fieldId)
}

export async function getCardCustomValues(cardId: string) {
  const { supabase } = await getOrgContext()
  const { data } = await supabase.from('custom_field_values')
    .select('*, custom_fields(name, field_type, options)')
    .eq('card_id', cardId)
  return data || []
}

export async function setCustomFieldValue(cardId: string, fieldId: string, value: string | null) {
  const { supabase } = await getOrgContext()
  if (value === null) {
    await supabase.from('custom_field_values').delete().eq('card_id', cardId).eq('field_id', fieldId)
    return
  }
  const { error } = await supabase.from('custom_field_values')
    .upsert({ card_id: cardId, field_id: fieldId, value }, { onConflict: 'card_id,field_id' })
  if (error) throw new Error(error.message)
}
