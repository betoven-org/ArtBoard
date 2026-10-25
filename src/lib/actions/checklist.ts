'use server'

import { createClient } from '@/lib/supabase/server'

export async function deleteChecklistItem(itemId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('checklist_items').delete().eq('id', itemId)
  if (error) throw new Error(error.message)
}

export async function deleteChecklist(checklistId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('checklists').delete().eq('id', checklistId)
  if (error) throw new Error(error.message)
}
