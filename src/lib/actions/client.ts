'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getClients(orgId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function createClientAction(orgId: string, name: string, contactEmail?: string) {
  const supabase = await createClient()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const { data, error } = await supabase
    .from('clients')
    .insert({
      org_id: orgId,
      name,
      slug: `${slug}-${Date.now().toString(36)}`,
      contact_email: contactEmail || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/')
  return data
}

export async function updateClient(clientId: string, updates: { name?: string; contact_email?: string; logo_url?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('clients').update(updates).eq('id', clientId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function deleteClient(clientId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('clients').delete().eq('id', clientId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}
