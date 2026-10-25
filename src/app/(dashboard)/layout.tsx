import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

// Cache sidebar data — revalida a cada 30s ou em revalidatePath('/')
const getSidebarData = unstable_cache(
  async (orgId: string, supabaseUrl: string, supabaseKey: string) => {
    // Precisa criar client novo dentro do cache (não pode serializar o supabase client)
    const { createServerClient } = await import('@supabase/ssr')
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => [], setAll: () => {} },
    })

    const [orgsResult, clientsResult, teamsResult, workspacesResult] = await Promise.all([
      supabase.from('organizations').select('id, name, slug, plan').eq('id', orgId),
      supabase.from('clients').select('id, org_id, name, slug').eq('org_id', orgId).order('name'),
      supabase.from('teams').select('id, org_id, name').eq('org_id', orgId).order('name'),
      supabase.from('workspaces').select('id, name, org_id, client_id, team_id').eq('org_id', orgId).order('created_at', { ascending: true }),
    ])

    const wsIds = (workspacesResult.data || []).map(w => w.id)
    const { data: boards } = wsIds.length > 0
      ? await supabase.from('boards').select('id, workspace_id, name, background').in('workspace_id', wsIds).eq('closed', false).order('created_at', { ascending: true })
      : { data: [] }

    return {
      orgs: orgsResult.data || [],
      clients: clientsResult.data || [],
      teams: teamsResult.data || [],
      workspaces: (workspacesResult.data || []).map(ws => ({
        ...ws,
        boards: (boards || []).filter(b => b.workspace_id === ws.id),
      })),
    }
  },
  ['sidebar-data'],
  { revalidate: 30, tags: ['sidebar'] }
)

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Tudo em paralelo na primeira camada
  const [membershipsResult, starredResult] = await Promise.all([
    supabase.from('organization_members').select('org_id').eq('user_id', user.id),
    supabase.from('board_stars').select('board_id, boards(id, name, background)').eq('user_id', user.id),
  ])

  const orgIds = (membershipsResult.data || []).map(m => m.org_id)
  if (orgIds.length === 0) {
    // Sem org — renderiza mínimo
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0]
    return (
      <div className="h-screen flex flex-col" style={{ background: 'var(--ab-bg, #0f1419)' }}>
        <Header userName={userName} workspaces={[]} starredBoards={[]} />
        <div className="flex-1 overflow-hidden flex" style={{ background: 'var(--ab-bg, #0f1419)', gap: 10, padding: 10 }}>
          <Sidebar workspaces={[]} organizations={[]} clients={[]} teams={[]} />
          <main className="flex-1 overflow-auto" style={{ borderRadius: 12 }}>{children}</main>
        </div>
      </div>
    )
  }

  const activeOrgId = orgIds[0]

  // Sidebar data cacheado (30s) — org, clients, teams, workspaces+boards
  const sidebarUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const sidebarKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const sidebar = await getSidebarData(activeOrgId, sidebarUrl, sidebarKey)

  const workspacesWithBoards = sidebar.workspaces

  const starredBoards = (starredResult.data || [])
    .filter((row: any) => row.boards)
    .map((row: any) => ({ id: row.boards.id, name: row.boards.name, background: row.boards.background }))

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0]
  const headerWorkspaces = workspacesWithBoards.map(ws => ({
    id: ws.id, name: ws.name,
    boards: ws.boards.map((b: any) => ({ id: b.id, name: b.name, background: b.background })),
  }))

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--ab-bg, #0f1419)' }}>
      <Header userName={userName} workspaces={headerWorkspaces} starredBoards={starredBoards} />
      <div className="flex-1 overflow-hidden flex" style={{ background: 'var(--ab-bg, #0f1419)', gap: 10, padding: 10 }}>
        <Sidebar
          workspaces={workspacesWithBoards as any}
          organizations={sidebar.orgs as any}
          clients={sidebar.clients as any}
          teams={sidebar.teams as any}
        />
        <main className="flex-1 overflow-auto" style={{ borderRadius: 12 }}>{children}</main>
      </div>
    </div>
  )
}
