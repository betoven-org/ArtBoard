'use server'

import { getOrgContext } from '@/lib/org-context'

export async function updateComment(commentId: string, text: string) {
  const { supabase } = await getOrgContext()
  const { error } = await supabase
    .from('comments')
    .update({ text })
    .eq('id', commentId)
  if (error) throw new Error(error.message)
}

export async function deleteComment(commentId: string) {
  const { supabase } = await getOrgContext()
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
  if (error) throw new Error(error.message)
}
