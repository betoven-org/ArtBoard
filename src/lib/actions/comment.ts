'use server'

import { createClient } from '@/lib/supabase/server'

export async function updateComment(commentId: string, text: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('comments')
    .update({ text })
    .eq('id', commentId)
  if (error) throw new Error(error.message)
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
  if (error) throw new Error(error.message)
}
