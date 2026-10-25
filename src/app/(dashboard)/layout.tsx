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

  // Buscar orgs via membership (evita recursão RLS na tabela organizations)
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)

  const orgIds = (memberships || []).map(m => m.org_id)
  let orgs: any[] = []

  if (orgIds.length > 0) {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds)
      .order('created_at', { ascending: true })
    orgs = data || []
  }

  const activeOrg = orgs[0] || null
  let clients: any[] = []
  let teams: any[] = []

  if (activeOrg) {
    const [clientsResult, teamsResult] = await Promise.all([
      supabase.from('clients').select('*').eq('org_id', activeOrg.id).order('name'),
      supabase.from('teams').select('*').eq('org_id', activeOrg.id).order('name'),
    ])
    clients = clientsResult.data || []
    teams = teamsResult.data || []
  }

  // Filtrar workspaces pela org ativa — só mostra os da org do usuário
  const workspaceQuery = supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })

  if (activeOrg) {
    workspaceQuery.eq('org_id', activeOrg.id)
  } else {
    workspaceQuery.eq('owner_id', user.id)
  }

  const { data: workspaces } = await workspaceQuery
  const wsIds = (workspaces || []).map(w => w.id)

  // Uma única query pra todos os boards (evita N+1)
  const { data: allBoards } = wsIds.length > 0
    ? await supabase.from('boards').select('*').in('workspace_id', wsIds).eq('closed', false).order('created_at', { ascending: true })
    : { data: [] }

  const workspacesWithBoards = (workspaces || []).map(ws => ({
    ...ws,
    boards: (allBoards || []).filter(b => b.workspace_id === ws.id),
  }))

  // Buscar boards com estrela
  const { data: starredRows } = await supabase
    .from('board_stars')
    .select('board_id, boards(id, name, background)')
    .eq('user_id', user.id)

  const starredBoards = (starredRows || [])
    .filter((row: any) => row.boards)
    .map((row: any) => ({
      id: row.boards.id,
      name: row.boards.name,
      background: row.boards.background,
    }))

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0]

  const headerWorkspaces = workspacesWithBoards.map((ws) => ({
    id: ws.id,
    name: ws.name,
    boards: ws.boards.map((b: any) => ({ id: b.id, name: b.name, background: b.background })),
  }))

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--ab-bg, #0f1419)' }}>
      <Header
        userName={userName}
        workspaces={headerWorkspaces}
        starredBoards={starredBoards}
      />
      <div
        className="flex-1 overflow-hidden flex"
        style={{ background: 'var(--ab-bg, #0f1419)', gap: 10, padding: 10 }}
      >
        {/* Painel esquerdo */}
        <Sidebar
          workspaces={workspacesWithBoards}
          organizations={orgs || []}
          clients={clients}
          teams={teams}
        />
        {/* Painel direito (board) */}
        <main className="flex-1 overflow-auto" style={{ borderRadius: 12 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
