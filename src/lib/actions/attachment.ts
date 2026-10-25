'use server'

import { getOrgContext } from '@/lib/org-context'

export async function addAttachment(cardId: string, url: string, name: string) {
  const { supabase } = await getOrgContext()
  const { data, error } = await supabase
    .from('attachments')
    .insert({ card_id: cardId, url, name })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getAttachments(cardId: string) {
  const { supabase } = await getOrgContext()
  const { data } = await supabase
    .from('attachments')
    .select('*')
    .eq('card_id', cardId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function deleteAttachment(attachmentId: string) {
  const { supabase } = await getOrgContext()
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId)
  if (error) throw new Error(error.message)
}
