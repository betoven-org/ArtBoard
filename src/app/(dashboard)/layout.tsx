import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Camada 1: membership + stars em paralelo
  const [membershipsResult, starredResult] = await Promise.all([
    supabase.from('organization_members').select('org_id').eq('user_id', user.id),
    supabase.from('board_stars').select('board_id, boards(id, name, background)').eq('user_id', user.id),
  ])

  const orgIds = (membershipsResult.data || []).map(m => m.org_id)
  if (orgIds.length === 0) {
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

  // Camada 2: org + clients + teams + workspaces em paralelo
  const [orgsResult, clientsResult, teamsResult, workspacesResult] = await Promise.all([
    supabase.from('organizations').select('id, name, slug, plan').in('id', orgIds),
    supabase.from('clients').select('id, org_id, name, slug').eq('org_id', activeOrgId).order('name'),
    supabase.from('teams').select('id, org_id, name').eq('org_id', activeOrgId).order('name'),
    supabase.from('workspaces').select('id, name, org_id, client_id, team_id').eq('org_id', activeOrgId).order('created_at', { ascending: true }),
  ])

  const workspaces = workspacesResult.data || []
  const wsIds = workspaces.map(w => w.id)

  // Camada 3: boards (1 query)
  const { data: allBoards } = wsIds.length > 0
    ? await supabase.from('boards').select('id, workspace_id, name, background').in('workspace_id', wsIds).eq('closed', false).order('created_at', { ascending: true })
    : { data: [] }

  const workspacesWithBoards = workspaces.map(ws => ({
    ...ws,
    boards: (allBoards || []).filter(b => b.workspace_id === ws.id),
  }))

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
          organizations={(orgsResult.data || []) as any}
          clients={(clientsResult.data || []) as any}
          teams={(teamsResult.data || []) as any}
        />
        <main className="flex-1 overflow-auto" style={{ borderRadius: 12 }}>{children}</main>
      </div>
    </div>
  )
}
