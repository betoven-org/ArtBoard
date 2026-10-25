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

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })

  const workspacesWithBoards = await Promise.all(
    (workspaces || []).map(async (ws) => {
      const { data: boards } = await supabase
        .from('boards')
        .select('*')
        .eq('workspace_id', ws.id)
        .eq('closed', false)
        .order('created_at', { ascending: true })
      return { ...ws, boards: boards || [] }
    })
  )

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
    <div className="h-screen flex flex-col" style={{ background: '#1D2125' }}>
      <Header
        userName={userName}
        workspaces={headerWorkspaces}
        starredBoards={starredBoards}
      />
      {/* Wrapper — fundo escuro com gap entre os painéis */}
      <div
        className="flex-1 overflow-hidden flex"
        style={{ background: '#0D1117', gap: 12, padding: 12 }}
      >
        {/* Painel esquerdo */}
        <Sidebar workspaces={workspacesWithBoards} />
        {/* Painel direito (board) */}
        <main className="flex-1 overflow-auto" style={{ borderRadius: 12 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
