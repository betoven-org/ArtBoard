'use server'

import { createClient } from '@/lib/supabase/server'

export async function getSavedFilters() {
  const supabase = await createClient()
  const { data } = await supabase.from('saved_filters').select('*').order('created_at')
  return data || []
}

export async function saveFilter(name: string, config: Record<string, unknown>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autenticado')
  const { data, error } = await supabase.from('saved_filters')
    .insert({ user_id: user.id, name, filter_config: config }).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteFilter(filterId: string) {
  const supabase = await createClient()
  await supabase.from('saved_filters').delete().eq('id', filterId)
}
