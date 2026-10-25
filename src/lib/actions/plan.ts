'use server'

import { getOrgContext } from '@/lib/org-context'

export async function getPlans() {
  const { supabase } = await getOrgContext()
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('price_monthly', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getCurrentPlan() {
  const { supabase, orgId } = await getOrgContext()

  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', orgId)
    .single()

  const { data: plan } = await supabase
    .from('plans')
    .select('*')
    .eq('id', org?.plan || 'free')
    .single()

  return plan
}

export async function getOrgUsage() {
  const { supabase, orgId } = await getOrgContext()

  const [members, workspaces, plan] = await Promise.all([
    supabase.from('organization_members').select('user_id', { count: 'exact' }).eq('org_id', orgId),
    supabase.from('workspaces').select('id', { count: 'exact' }).eq('org_id', orgId),
    getCurrentPlan(),
  ])

  return {
    members: { used: members.count || 0, limit: plan?.max_members || 5 },
    workspaces: { used: workspaces.count || 0, limit: plan?.max_workspaces || 3 },
    plan: plan?.id || 'free',
    planName: plan?.name || 'Free',
  }
}
