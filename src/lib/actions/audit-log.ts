'use server'

import { getOrgContext } from '@/lib/org-context'

export async function getAuditLogs(filters?: {
  targetType?: string
  limit?: number
  offset?: number
}) {
  const { supabase, orgId } = await getOrgContext()

  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(filters?.limit || 50)

  if (filters?.targetType) {
    query = query.eq('target_type', filters.targetType)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}
