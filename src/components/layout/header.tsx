'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, Search, Bell, HelpCircle, Plus, ChevronDown, LayoutGrid, Layers, Clock, Star as StarIcon, FileText, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { GlobalSearch } from '@/components/layout/global-search'
import { Notifications } from '@/components/layout/notifications'
import { createBoard } from '@/lib/actions/board'
import { createWorkspace } from '@/lib/actions/workspace'

type HeaderProps = {
  userName?: string
  workspaces?: Array<{ id: string; name: string; boards: Array<{ id: string; name: string; background: string }> }>
  starredBoards?: Array<{ id: string; name: string; background: string }>
}

type RecentBoard = { id: string; name: string; background: string }

const TEMPLATES = [
  { name: 'Gestao de Projetos', desc: 'Gerencie sprints e tarefas' },
  { name: 'Kanban Basico', desc: 'Quadro simples com To Do, Doing, Done' },
  { name: 'Marketing', desc: 'Campanhas, conteudo e calendario' },
  { name: 'Onboarding', desc: 'Processo de integracao de novos membros' },
]

function DropdownWrapper({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className="absolute left-0 top-[calc(100%+4px)] w-[280px] rounded-lg py-1 z-[200] overflow-hidden"
      style={{
        background: '#282E33',
        border: '1px solid rgba(166, 197, 226, 0.16)',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}
    >
      <div className="max-h-[300px] overflow-y-auto">{children}</div>
    </div>
  )
}

export function Header({ userName, workspaces = [], starredBoards = [] }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const [showMenu, setShowMenu] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [recentBoards, setRecentBoards] = useState<RecentBoard[]>([])

  // Create board modal state
  const [showCreateBoard, setShowCreateBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
  const [createBoardLoading, setCreateBoardLoading] = useState(false)

  // Create workspace modal state
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [createWsLoading, setCreateWsLoading] = useState(false)

  const BOARD_COLORS = [
    '#0079bf', '#d29034', '#519839', '#b04632',
    '#89609e', '#cd5a91', '#4bbf6b', '#00aecc', '#838c91',
  ]
  const [selectedBoardColor, setSelectedBoardColor] = useState(BOARD_COLORS[0])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('artboard-recent-boards') || '[]')
      setRecentBoards(stored)
    } catch {}
  }, [openDropdown])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  function toggleDropdown(name: string) {
    setOpenDropdown((prev) => (prev === name ? null : name))
  }

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <header
      className="h-12 flex items-center justify-between px-2 shrink-0 relative"
      style={{
        background: 'rgba(29, 33, 37, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(166, 197, 226, 0.16)',
        zIndex: 200,
      }}
    >
      {/* Lado esquerdo */}
      <div className="flex items-center gap-1">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-white/10 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="1" y="1" width="10" height="20" rx="2" fill="#579DFF" />
            <rect x="13" y="1" width="10" height="12" rx="2" fill="#579DFF" />
          </svg>
          <span className="text-lg font-bold" style={{ color: '#DEE4EA' }}>
            ArtBoard
          </span>
        </Link>

        {/* Nav buttons */}
        <nav className="hidden md:flex items-center gap-0.5 ml-1">
          {/* Workspaces */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('workspaces')}
              className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-normal rounded hover:bg-white/10 transition-colors"
              style={{ color: '#9FADBC' }}
            >
              Workspaces
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            <DropdownWrapper open={openDropdown === 'workspaces'} onClose={() => setOpenDropdown(null)}>
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9FADBC' }}>
                Seus workspaces
              </div>
              {workspaces.length === 0 ? (
                <div className="px-4 py-4 text-sm text-center" style={{ color: '#9FADBC' }}>
                  Nenhum workspace
                </div>
              ) : (
                workspaces.map((ws) => (
                  <Link
                    key={ws.id}
                    href="/"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-3 px-3 py-2 transition-colors"
                    style={{ color: '#DEE4EA' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#A1BDD914')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #579DFF, #6C5CE7)',
                      }}
                    >
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm truncate">{ws.name}</span>
                  </Link>
                ))
              )}
            </DropdownWrapper>
          </div>

          {/* Recentes */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('recentes')}
              className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-normal rounded hover:bg-white/10 transition-colors"
              style={{ color: '#9FADBC' }}
            >
              Recentes
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            <DropdownWrapper open={openDropdown === 'recentes'} onClose={() => setOpenDropdown(null)}>
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9FADBC' }}>
                Boards recentes
              </div>
              {recentBoards.length === 0 ? (
                <div className="px-4 py-4 text-sm text-center" style={{ color: '#9FADBC' }}>
                  Nenhum board recente
                </div>
              ) : (
                recentBoards.map((board) => (
                  <Link
                    key={board.id}
                    href={`/board/${board.id}`}
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-3 px-3 py-2 transition-colors"
                    style={{ color: '#DEE4EA' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#A1BDD914')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div
                      className="w-8 h-6 rounded shrink-0"
                      style={{ backgroundColor: board.background, borderRadius: '4px' }}
                    />
                    <span className="text-sm truncate">{board.name}</span>
                  </Link>
                ))
              )}
            </DropdownWrapper>
          </div>

          {/* Com estrela */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('starred')}
              className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-normal rounded hover:bg-white/10 transition-colors"
              style={{ color: '#9FADBC' }}
            >
              Com estrela
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            <DropdownWrapper open={openDropdown === 'starred'} onClose={() => setOpenDropdown(null)}>
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9FADBC' }}>
                Boards com estrela
              </div>
              {starredBoards.length === 0 ? (
                <div className="px-4 py-4 text-sm text-center" style={{ color: '#9FADBC' }}>
                  Nenhum board com estrela
                </div>
              ) : (
                starredBoards.map((board) => (
                  <Link
                    key={board.id}
                    href={`/board/${board.id}`}
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-3 px-3 py-2 transition-colors"
                    style={{ color: '#DEE4EA' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#A1BDD914')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div
                      className="w-8 h-6 rounded shrink-0"
                      style={{ backgroundColor: board.background, borderRadius: '4px' }}
                    />
                    <span className="text-sm truncate">{board.name}</span>
                  </Link>
                ))
              )}
            </DropdownWrapper>
          </div>

          {/* Templates */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('templates')}
              className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-normal rounded hover:bg-white/10 transition-colors"
              style={{ color: '#9FADBC' }}
            >
              Templates
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            <DropdownWrapper open={openDropdown === 'templates'} onClose={() => setOpenDropdown(null)}>
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9FADBC' }}>
                Templates
              </div>
              {TEMPLATES.map((tpl) => (
                <Link
                  key={tpl.name}
                  href="/"
                  onClick={() => setOpenDropdown(null)}
                  className="flex items-start gap-3 px-3 py-2.5 transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#A1BDD914')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <FileText className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#579DFF' }} />
                  <div className="min-w-0">
                    <p className="text-sm" style={{ color: '#DEE4EA' }}>{tpl.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#9FADBC' }}>{tpl.desc}</p>
                  </div>
                </Link>
              ))}
            </DropdownWrapper>
          </div>

          {/* Botao Criar - azul */}
          <div className="relative ml-1">
            <button
              onClick={() => toggleDropdown('criar')}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded transition-colors"
              style={{
                background: '#579DFF',
                color: '#1D2125',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#85B8FF')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#579DFF')}
            >
              Criar
            </button>
            <DropdownWrapper open={openDropdown === 'criar'} onClose={() => setOpenDropdown(null)}>
              <button
                onClick={() => {
                  setOpenDropdown(null)
                  setSelectedWorkspaceId(workspaces[0]?.id || '')
                  setNewBoardName('')
                  setSelectedBoardColor(BOARD_COLORS[0])
                  setShowCreateBoard(true)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.background = '#A1BDD914')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" style={{ color: '#579DFF' }} />
                <div className="min-w-0">
                  <p className="text-sm" style={{ color: '#DEE4EA' }}>Criar quadro</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9FADBC' }}>Crie um novo board</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setOpenDropdown(null)
                  setNewWorkspaceName('')
                  setShowCreateWorkspace(true)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.background = '#A1BDD914')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Layers className="w-4 h-4 shrink-0" style={{ color: '#579DFF' }} />
                <div className="min-w-0">
                  <p className="text-sm" style={{ color: '#DEE4EA' }}>Criar workspace</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9FADBC' }}>Organize </p>
                </div>
              </button>
            </DropdownWrapper>
          </div>
        </nav>

        {/* Mobile criar */}
        <button
          className="md:hidden flex items-center justify-center w-8 h-8 rounded transition-colors ml-1"
          style={{ background: '#579DFF', color: '#1D2125' }}
          onClick={() => {
            setSelectedWorkspaceId(workspaces[0]?.id || '')
            setNewBoardName('')
            setSelectedBoardColor(BOARD_COLORS[0])
            setShowCreateBoard(true)
          }}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Centro - Search (Cmd+K) */}
      <div className="flex-1 hidden sm:flex justify-center px-4">
        <GlobalSearch />
      </div>

      {/* Lado direito */}
      <div className="flex items-center gap-1">
        <button className="sm:hidden flex items-center justify-center w-8 h-8 rounded hover:bg-white/10 transition-colors">
          <Search className="w-4 h-4" style={{ color: '#B6C2CF' }} />
        </button>

        {/* Notifications */}
        <Notifications />

        {/* Info */}
        <button
          className="hidden sm:flex items-center justify-center w-8 h-8 rounded hover:bg-white/10 transition-colors"
        >
          <HelpCircle className="w-4 h-4" style={{ color: '#B6C2CF' }} />
        </button>

        {/* Avatar */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
            style={{
              background: '#579DFF',
              color: '#1D2125',
            }}
            title={userName || 'Usuario'}
          >
            {initials}
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-[199]" onClick={() => setShowMenu(false)} />
              <div
                className="absolute right-0 top-10 w-56 rounded-lg py-1 z-[200] shadow-2xl"
                style={{
                  background: '#282E33',
                  border: '1px solid rgba(166, 197, 226, 0.16)',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                <div
                  className="px-4 py-3 text-sm font-medium"
                  style={{
                    color: '#DEE4EA',
                    borderBottom: '1px solid rgba(166, 197, 226, 0.16)',
                  }}
                >
                  {userName || 'Usuario'}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[#A1BDD914] transition-colors duration-150"
                  style={{ color: '#B6C2CF' }}
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Create Board Modal */}
      {showCreateBoard && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[300]" onClick={() => setShowCreateBoard(false)} />
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#282E33] rounded-xl border border-[#A6C5E229] shadow-[0_8px_24px_rgba(0,0,0,0.4)]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#A6C5E229]">
                <h3 className="text-base font-semibold text-[#DEE4EA]">Criar quadro</h3>
                <button onClick={() => setShowCreateBoard(false)} className="p-1 hover:bg-[#A1BDD914] rounded">
                  <X className="w-4 h-4 text-[#9FADBC]" />
                </button>
              </div>
              <form
                className="p-5 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!newBoardName.trim() || !selectedWorkspaceId) return
                  setCreateBoardLoading(true)
                  try {
                    const board = await createBoard(selectedWorkspaceId, newBoardName.trim(), selectedBoardColor)
                    setShowCreateBoard(false)
                    router.push(`/board/${board.id}`)
                    router.refresh()
                  } catch {
                    // silently fail
                  } finally {
                    setCreateBoardLoading(false)
                  }
                }}
              >
                {/* Preview */}
                <div className="w-full h-24 rounded-lg flex items-center justify-center" style={{ backgroundColor: selectedBoardColor }}>
                  <span className="text-white font-semibold text-lg">{newBoardName || 'Novo quadro'}</span>
                </div>
                {/* Background color */}
                <div>
                  <label className="text-xs font-semibold text-[#9FADBC] uppercase mb-1.5 block">Cor de fundo</label>
                  <div className="flex gap-2 flex-wrap">
                    {BOARD_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedBoardColor(color)}
                        className="w-8 h-6 rounded transition-all hover:ring-1 hover:ring-white/40"
                        style={{
                          backgroundColor: color,
                          outline: selectedBoardColor === color ? '2px solid #579DFF' : 'none',
                          outlineOffset: 2,
                        }}
                      />
                    ))}
                  </div>
                </div>
                {/* Board name */}
                <div>
                  <label className="text-xs font-semibold text-[#9FADBC] uppercase mb-1.5 block">Nome do quadro</label>
                  <input
                    autoFocus
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    placeholder="Nome do quadro"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[#22272B] text-[#B6C2CF] placeholder-[#8C9BAB] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                  />
                </div>
                {/* Workspace select */}
                <div>
                  <label className="text-xs font-semibold text-[#9FADBC] uppercase mb-1.5 block">Workspace</label>
                  <select
                    value={selectedWorkspaceId}
                    onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[#22272B] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                  >
                    {workspaces.length === 0 && <option value="">Nenhum workspace</option>}
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={createBoardLoading || !newBoardName.trim() || !selectedWorkspaceId}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#579DFF] text-[#1D2125] hover:bg-[#85B8FF] disabled:opacity-50 transition-colors"
                >
                  {createBoardLoading ? 'Criando...' : 'Criar'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Create Workspace Modal */}
      {showCreateWorkspace && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[300]" onClick={() => setShowCreateWorkspace(false)} />
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#282E33] rounded-xl border border-[#A6C5E229] shadow-[0_8px_24px_rgba(0,0,0,0.4)]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#A6C5E229]">
                <h3 className="text-base font-semibold text-[#DEE4EA]">Criar workspace</h3>
                <button onClick={() => setShowCreateWorkspace(false)} className="p-1 hover:bg-[#A1BDD914] rounded">
                  <X className="w-4 h-4 text-[#9FADBC]" />
                </button>
              </div>
              <form
                className="p-5 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!newWorkspaceName.trim()) return
                  setCreateWsLoading(true)
                  try {
                    await createWorkspace(newWorkspaceName.trim())
                    setShowCreateWorkspace(false)
                    router.refresh()
                  } catch {
                    // silently fail
                  } finally {
                    setCreateWsLoading(false)
                  }
                }}
              >
                <div>
                  <label className="text-xs font-semibold text-[#9FADBC] uppercase mb-1.5 block">Nome do workspace</label>
                  <input
                    autoFocus
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="Ex: Minha equipe"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[#22272B] text-[#B6C2CF] placeholder-[#8C9BAB] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={createWsLoading || !newWorkspaceName.trim()}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#579DFF] text-[#1D2125] hover:bg-[#85B8FF] disabled:opacity-50 transition-colors"
                >
                  {createWsLoading ? 'Criando...' : 'Criar workspace'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </header>
  )
}
