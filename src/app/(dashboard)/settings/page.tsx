import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsView } from '@/components/settings/settings-view'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) redirect('/')

  const [orgResult, membersResult, plansResult, rolesResult, keysResult, logsResult] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', membership.org_id).single(),
    supabase.from('organization_members').select('*').eq('org_id', membership.org_id),
    supabase.from('plans').select('*').order('price_monthly'),
    supabase.from('org_roles').select('*').eq('org_id', membership.org_id).order('is_default', { ascending: false }),
    supabase.from('api_keys').select('id, name, key_prefix, scopes, is_active, last_used_at, created_at').eq('org_id', membership.org_id).order('created_at', { ascending: false }),
    supabase.from('audit_logs').select('*').eq('org_id', membership.org_id).order('created_at', { ascending: false }).limit(50),
  ])

  // Count usage
  const { count: wsCount } = await supabase.from('workspaces').select('id', { count: 'exact' }).eq('org_id', membership.org_id)

  return (
    <SettingsView
      org={orgResult.data}
      members={membersResult.data || []}
      plans={plansResult.data || []}
      roles={rolesResult.data || []}
      apiKeys={keysResult.data || []}
      auditLogs={logsResult.data || []}
      userRole={membership.role}
      usage={{ members: membersResult.data?.length || 0, workspaces: wsCount || 0 }}
    />
  )
}
