'use server'

import { getOrgContext } from '@/lib/org-context'

export async function getSavedFilters() {
  const { supabase } = await getOrgContext()
  const { data } = await supabase.from('saved_filters').select('*').order('created_at')
  return data || []
}

export async function saveFilter(name: string, config: Record<string, unknown>) {
  const { supabase, userId } = await getOrgContext()
  const { data, error } = await supabase.from('saved_filters')
    .insert({ user_id: userId, name, filter_config: config }).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteFilter(filterId: string) {
  const { supabase } = await getOrgContext()
  await supabase.from('saved_filters').delete().eq('id', filterId)
}
