import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CreateBoardButton } from '@/components/board/create-board-button'
import { RecentBoards } from '@/components/board/recent-boards'
import { WorkspaceActions } from '@/components/workspace/workspace-actions'
import { LayoutGrid } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })

  if (!workspaces || workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <LayoutGrid className="w-12 h-12 text-[#579DFF] mb-4 opacity-50" />
        <h2 className="text-lg font-semibold text-[#DEE4EA] mb-2">
          Bem-vindo ao ArtBoard
        </h2>
        <p className="text-sm text-[#9FADBC] mb-6 max-w-md">
          Crie seu primeiro workspace para comecar a organizar seus projetos, tarefas e equipe.
        </p>
      </div>
    )
  }

  const workspacesWithBoards = await Promise.all(
    workspaces.map(async (ws) => {
      const { data: boards } = await supabase
        .from('boards')
        .select('*')
        .eq('workspace_id', ws.id)
        .eq('closed', false)
        .order('created_at', { ascending: true })
      return { ...ws, boards: boards || [] }
    })
  )

  // Todos os boards para o client component de recentes poder filtrar
  const allBoards = workspacesWithBoards.flatMap((ws) =>
    ws.boards.map((b: any) => ({
      id: b.id,
      name: b.name,
      background: b.background,
    }))
  )

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      {/* Seção: Visualizado recentemente */}
      <RecentBoards allBoards={allBoards} />

      {/* Seção: SUAS ÁREAS DE TRABALHO */}
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#9FADBC] mb-4">
        Suas áreas de trabalho
      </h3>

      {workspacesWithBoards.map((workspace) => (
        <section key={workspace.id} id={`workspace-${workspace.id}`} className="mb-8">
          {/* Header do workspace */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="w-8 h-8 rounded bg-[#0C66E4] flex items-center justify-center text-sm font-bold text-white shrink-0">
              {workspace.name.charAt(0).toUpperCase()}
            </span>
            <span className="text-base font-bold text-[#DEE4EA]">
              {workspace.name}
            </span>

            <WorkspaceActions workspaceId={workspace.id} workspaceName={workspace.name} />
          </div>

          {/* Grid de boards */}
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
            {workspace.boards.map((board: any) => (
              <Link
                key={board.id}
                href={`/board/${board.id}`}
                className="group/card relative h-24 rounded-lg overflow-hidden transition-all duration-200"
              >
                <div
                  className="absolute inset-0 rounded-lg"
                  style={{ backgroundColor: board.background }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/20 transition-colors duration-200 rounded-lg" />
                <span className="relative z-10 block p-2 pb-2 mt-auto text-sm font-bold text-white drop-shadow-sm absolute bottom-0 left-0 right-0">
                  {board.name}
                </span>
              </Link>
            ))}

            <CreateBoardButton workspaceId={workspace.id} />
          </div>
        </section>
      ))}
    </div>
  )
}

