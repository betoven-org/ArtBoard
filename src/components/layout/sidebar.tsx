'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { BarChart2, Building2, ChevronDown, ChevronRight, Clock, Plus, Settings, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Workspace, Board, Organization } from '@/types/database'
import { createWorkspace } from '@/lib/actions/workspace'
import { createBoard } from '@/lib/actions/board'

type WorkspaceWithBoards = Workspace & { boards: Board[] }

type SidebarProps = {
  workspaces: WorkspaceWithBoards[]
  organizations: Organization[]
  clients: any[]
  teams: any[]
}

const C = {
  hover: 'rgba(139, 148, 158, 0.08)',
  active: 'rgba(76, 154, 255, 0.14)',
  text: '#c9d1d9',
  heading: '#f0f3f6',
  accent: '#4c9aff',
  border: 'rgba(139, 148, 158, 0.12)',
  muted: '#8b949e',
  inputBg: '#161b22',
  inputBorder: 'rgba(139, 148, 158, 0.2)',
}

function NavLink({ href, icon, label, collapsed }: { href: string; icon: React.ReactNode; label: string; collapsed: boolean }) {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: collapsed ? '8px 0' : '6px 12px 6px 16px',
        margin: collapsed ? 0 : '0 8px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: active ? C.active : 'transparent',
        color: active ? C.accent : C.text,
        fontSize: 13, borderRadius: 6, textDecoration: 'none',
        transition: 'background 150ms',
      }}
      className="hover:bg-[#A1BDD914]"
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}

export function Sidebar({ workspaces: initial, organizations, clients, teams }: SidebarProps) {
  const [workspaces, setWorkspaces] = useState(initial)
  const activeOrg = organizations[0]
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [creatingProject, setCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [creatingBoard, setCreatingBoard] = useState<string | null>(null)
  const [newBoardName, setNewBoardName] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  // Sidebar resize
  const SIDEBAR_MIN = 200
  const SIDEBAR_MAX = 400
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('artboard-sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
    const w = localStorage.getItem('artboard-sidebar-width')
    if (w) { const n = parseInt(w); if (n >= SIDEBAR_MIN && n <= SIDEBAR_MAX) setSidebarWidth(n) }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsResizing(true) }, [])

  useEffect(() => {
    if (!isResizing) return
    const move = (e: MouseEvent) => setSidebarWidth(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, e.clientX)))
    const up = () => { setIsResizing(false); localStorage.setItem('artboard-sidebar-width', String(sidebarRef.current?.offsetWidth || 260)) }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.body.style.cursor = ''; document.body.style.userSelect = '' }
  }, [isResizing])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('artboard-sidebar-collapsed', String(next))
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    if (!newProjectName.trim()) return
    const ws = await createWorkspace(newProjectName.trim(), activeOrg?.id)
    setWorkspaces([...workspaces, { ...ws, boards: [] }])
    setNewProjectName('')
    setCreatingProject(false)
    setExpanded({ ...expanded, [ws.id]: true })
  }

  async function handleCreateBoard(e: React.FormEvent, wsId: string) {
    e.preventDefault()
    if (!newBoardName.trim()) return
    const board = await createBoard(wsId, newBoardName.trim())
    setWorkspaces(workspaces.map(w => w.id === wsId ? { ...w, boards: [...w.boards, board] } : w))
    setNewBoardName('')
    setCreatingBoard(null)
  }

  const isActiveBoard = (id: string) => pathname === `/board/${id}`

  // Agrupar projetos por client
  const orgWorkspaces = workspaces.filter(w => !w.client_id || !clients.find(c => c.id === w.client_id))
  const clientGroups = clients
    .filter(c => c.org_id === activeOrg?.id)
    .map(c => ({ ...c, workspaces: workspaces.filter(w => w.client_id === c.id) as WorkspaceWithBoards[] }))
    .filter(c => c.workspaces.length > 0)

  return (
    <aside
      ref={sidebarRef}
      style={{
        width: collapsed ? 48 : sidebarWidth,
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        height: '100%', position: 'relative',
        background: 'rgba(22, 27, 34, 0.85)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        zIndex: 10, borderRadius: 12,
        transition: 'width 200ms ease', overflow: 'hidden',
      }}
    >
      {/* Toggle */}
      <div style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'space-between', alignItems: 'center', padding: collapsed ? '8px 0' : '8px 12px' }}>
        <button onClick={toggleCollapsed} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: C.muted, display: 'flex' }} className="hover:bg-[#A1BDD914]">
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        {!collapsed && activeOrg && (
          <span style={{ fontSize: 13, fontWeight: 700, color: C.heading, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeOrg.name}
          </span>
        )}
      </div>

      <nav style={{ flex: 1, padding: '0 0 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Nav links */}
        <NavLink href="/dashboard" icon={<BarChart2 size={15} />} label="Dashboard" collapsed={collapsed} />
        <NavLink href="/timesheet" icon={<Clock size={15} />} label="Timesheet" collapsed={collapsed} />
        <NavLink href="/settings" icon={<Settings size={15} />} label="Configurações" collapsed={collapsed} />

        <div style={{ height: 1, background: C.border, margin: collapsed ? '8px 4px' : '8px 12px' }} />

        {collapsed ? (
          /* Collapsed: iniciais dos projetos */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, padding: '4px 0' }}>
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { setCollapsed(false); setExpanded({ ...expanded, [ws.id]: true }) }}
                style={{
                  width: 32, height: 32, borderRadius: 6, background: '#0C66E4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer',
                }}
                className="hover:opacity-80"
                title={ws.name}
              >
                {ws.name.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
        ) : (
          /* Expanded: lista de projetos */
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Projetos agrupados por client */}
            {clientGroups.map(client => (
              <div key={client.id} style={{ marginBottom: 4 }}>
                <div style={{ padding: '6px 16px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {client.name}
                </div>
                {client.workspaces.map((ws: WorkspaceWithBoards) => (
                  <ProjectItem
                    key={ws.id}
                    ws={ws}
                    expanded={!!expanded[ws.id]}
                    onToggle={() => setExpanded({ ...expanded, [ws.id]: !expanded[ws.id] })}
                    isActiveBoard={isActiveBoard}
                    creatingBoard={creatingBoard}
                    newBoardName={newBoardName}
                    onNewBoardChange={setNewBoardName}
                    onStartCreateBoard={() => setCreatingBoard(ws.id)}
                    onCancelCreateBoard={() => setCreatingBoard(null)}
                    onCreateBoard={(e) => handleCreateBoard(e, ws.id)}
                  />
                ))}
              </div>
            ))}

            {/* Projetos sem client */}
            {orgWorkspaces.length > 0 && (
              <>
                {clientGroups.length > 0 && (
                  <div style={{ padding: '6px 16px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Projetos
                  </div>
                )}
                {orgWorkspaces.map(ws => (
                  <ProjectItem
                    key={ws.id}
                    ws={ws}
                    expanded={!!expanded[ws.id]}
                    onToggle={() => setExpanded({ ...expanded, [ws.id]: !expanded[ws.id] })}
                    isActiveBoard={isActiveBoard}
                    creatingBoard={creatingBoard}
                    newBoardName={newBoardName}
                    onNewBoardChange={setNewBoardName}
                    onStartCreateBoard={() => setCreatingBoard(ws.id)}
                    onCancelCreateBoard={() => setCreatingBoard(null)}
                    onCreateBoard={(e) => handleCreateBoard(e, ws.id)}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Novo projeto */}
        {!collapsed && (
          <>
            <div style={{ height: 1, background: C.border, margin: '4px 12px' }} />
            {creatingProject ? (
              <form onSubmit={handleCreateProject} style={{ padding: '4px 12px' }}>
                <input
                  autoFocus
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  onBlur={() => { if (!newProjectName.trim()) setCreatingProject(false) }}
                  placeholder="Nome do projeto"
                  style={{
                    width: '100%', background: C.inputBg, color: C.heading,
                    fontSize: 13, borderRadius: 6, padding: '6px 8px',
                    border: `1px solid ${C.inputBorder}`, outline: 'none',
                  }}
                />
              </form>
            ) : (
              <button
                onClick={() => setCreatingProject(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 16px', margin: '0 8px', border: 'none',
                  background: 'transparent', cursor: 'pointer', color: C.muted,
                  fontSize: 13, borderRadius: 6, textAlign: 'left',
                }}
                className="hover:bg-[#A1BDD914]"
              >
                <Plus size={14} /> Novo projeto
              </button>
            )}
          </>
        )}
      </nav>

      {/* Resize handle */}
      {!collapsed && (
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute', top: 0, bottom: 0, right: -6,
            width: 12, cursor: 'col-resize', zIndex: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            width: 3, height: 32, borderRadius: 3,
            background: isResizing ? C.accent : 'rgba(159, 173, 188, 0.3)',
            transition: 'background 150ms',
          }} />
        </div>
      )}
    </aside>
  )
}

/* Componente de projeto (workspace) com boards */
function ProjectItem({ ws, expanded, onToggle, isActiveBoard, creatingBoard, newBoardName, onNewBoardChange, onStartCreateBoard, onCancelCreateBoard, onCreateBoard }: {
  ws: WorkspaceWithBoards
  expanded: boolean
  onToggle: () => void
  isActiveBoard: (id: string) => boolean
  creatingBoard: string | null
  newBoardName: string
  onNewBoardChange: (v: string) => void
  onStartCreateBoard: () => void
  onCancelCreateBoard: () => void
  onCreateBoard: (e: React.FormEvent) => void
}) {
  return (
    <div style={{ marginBottom: 2 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 12px 5px 16px', border: 'none', background: 'transparent',
          cursor: 'pointer', color: C.heading, fontSize: 13, fontWeight: 600,
          textAlign: 'left', borderRadius: 4,
        }}
        className="hover:bg-[#A1BDD914]"
      >
        <span style={{
          width: 20, height: 20, borderRadius: 4, background: '#0C66E4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {ws.name.charAt(0).toUpperCase()}
        </span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ws.name}
        </span>
        {expanded ? <ChevronDown size={14} color={C.muted} /> : <ChevronRight size={14} color={C.muted} />}
      </button>

      {expanded && (
        <div style={{ paddingLeft: 8 }}>
          {ws.boards.map(board => {
            const active = isActiveBoard(board.id)
            return (
              <Link
                key={board.id}
                href={`/board/${board.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 12px 5px 28px', fontSize: 13,
                  color: active ? C.accent : C.text,
                  background: active ? C.active : 'transparent',
                  textDecoration: 'none', borderRadius: 4, margin: '1px 0',
                  transition: 'background 150ms',
                }}
                className="hover:bg-[#A1BDD914]"
              >
                <span style={{ width: 16, height: 12, borderRadius: 2, background: board.background || '#0079BF', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{board.name}</span>
              </Link>
            )
          })}

          {creatingBoard === ws.id ? (
            <form onSubmit={onCreateBoard} style={{ padding: '2px 12px 2px 28px' }}>
              <input
                autoFocus
                value={newBoardName}
                onChange={e => onNewBoardChange(e.target.value)}
                onBlur={() => { if (!newBoardName.trim()) onCancelCreateBoard() }}
                placeholder="Nome do board"
                style={{
                  width: '100%', background: C.inputBg, color: C.heading,
                  fontSize: 13, borderRadius: 4, padding: '4px 8px',
                  border: `1px solid ${C.inputBorder}`, outline: 'none',
                }}
              />
            </form>
          ) : (
            <button
              onClick={onStartCreateBoard}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 12px 4px 28px', border: 'none',
                background: 'transparent', cursor: 'pointer',
                color: C.muted, fontSize: 12, borderRadius: 4,
              }}
              className="hover:bg-[#A1BDD914]"
            >
              <Plus size={12} /> Novo board
            </button>
          )}
        </div>
      )}
    </div>
  )
}
