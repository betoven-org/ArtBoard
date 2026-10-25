'use server'

import { getOrgContext } from '@/lib/org-context'

export async function getOrgActivityFeed(limit = 30) {
  const { supabase, orgId } = await getOrgContext()

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, target_type, target_id, details, created_at, user_id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data
}
