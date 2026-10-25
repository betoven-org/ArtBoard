'use server'

import { getOrgContext } from '@/lib/org-context'

export async function deleteChecklistItem(itemId: string) {
  const { supabase } = await getOrgContext()
  const { error } = await supabase
    .from('checklist_items')
    .delete()
    .eq('id', itemId)
  if (error) throw new Error(error.message)
}

export async function deleteChecklist(checklistId: string) {
  const { supabase } = await getOrgContext()
  const { error } = await supabase
    .from('checklists')
    .delete()
    .eq('id', checklistId)
  if (error) throw new Error(error.message)
}
