'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { BarChart2, Building2, ChevronDown, ChevronRight, Clock, FolderKanban, Plus, Settings, Sparkles, Users, UserPlus, X, MoreHorizontal, Image as ImageIcon, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Workspace, Board, Organization, Client, Team } from '@/types/database'
import { createWorkspace } from '@/lib/actions/workspace'
import { createOrganization } from '@/lib/actions/organization'
import { createClientAction } from '@/lib/actions/client'
import { createTeam as createTeamAction } from '@/lib/actions/team'
import { createBoard } from '@/lib/actions/board'
import { AIBoardBuilder } from '@/components/board/ai-board-builder'
import { inviteWorkspaceMember, removeWorkspaceMember, getWorkspaceMembers } from '@/lib/actions/workspace-member'
import { updateMemberRole } from '@/lib/actions/roles'

type WorkspaceWithBoards = Workspace & { boards: Board[] }

type SidebarProps = {
  workspaces: WorkspaceWithBoards[]
  organizations: Organization[]
  clients: Client[]
  teams: Team[]
}

const COLORS = {
  surface: '#1D2125',
  hover: '#A1BDD914',
  active: '#579DFF26',
  text: '#B6C2CF',
  textHeading: '#DEE4EA',
  accent: '#579DFF',
  border: '#A6C5E229',
  sectionLabel: '#9FADBC',
  inputBg: '#22272B',
  inputBorder: '#A6C5E24D',
}

export function Sidebar({ workspaces: initial, organizations, clients: initialClients, teams: initialTeams }: SidebarProps) {
  const [workspaces, setWorkspaces] = useState(initial)
  const [orgs] = useState(organizations)
  const [clients, setClients] = useState(initialClients)
  const [teams, setTeams] = useState(initialTeams)
  const [activeOrgId, setActiveOrgId] = useState(organizations[0]?.id || null)
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({})
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({})
  const [creatingClient, setCreatingClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [sidebarSection, setSidebarSection] = useState<'workspaces' | 'clients' | 'teams'>('clients')
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(initial.map((w) => [w.id, false]))
  )
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [creatingBoard, setCreatingBoard] = useState<string | null>(null)
  const [newBoardName, setNewBoardName] = useState('')
  const [aiBuilderWorkspace, setAiBuilderWorkspace] = useState<string | null>(null)
  const [membersWorkspace, setMembersWorkspace] = useState<string | null>(null)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberLoading, setMemberLoading] = useState(false)
  const [memberError, setMemberError] = useState('')
  const [memberSuccess, setMemberSuccess] = useState('')
  const [wsMembers, setWsMembers] = useState<Array<{ user_id: string; role: string; name?: string; email?: string }>>([])
  const [colorPickerWs, setColorPickerWs] = useState<string | null>(null)
  const [wsColors, setWsColors] = useState<Record<string, string>>({})
  const pathname = usePathname()

  // Sidebar collapse
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('artboard-sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('artboard-sidebar-collapsed', String(next))
  }

  // Sidebar background customization
  const [showCustomize, setShowCustomize] = useState(false)
  const [sidebarBg, setSidebarBg] = useState<string | null>(null)
  const [uploadingSidebarBg, setUploadingSidebarBg] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('artboard-sidebar-bg')
    if (saved) setSidebarBg(saved)
  }, [])

  function handleSidebarBgChange(value: string | null) {
    if (value) {
      localStorage.setItem('artboard-sidebar-bg', value)
    } else {
      localStorage.removeItem('artboard-sidebar-bg')
    }
    setSidebarBg(value)
  }

  // Sidebar resizable
  const SIDEBAR_MIN = 200
  const SIDEBAR_MAX = 400
  const SIDEBAR_DEFAULT = 260
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('artboard-sidebar-width')
    if (saved) {
      const parsed = parseInt(saved, 10)
      if (!isNaN(parsed) && parsed >= SIDEBAR_MIN && parsed <= SIDEBAR_MAX) {
        setSidebarWidth(parsed)
      }
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    function handleMouseMove(e: MouseEvent) {
      const newWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, e.clientX))
      setSidebarWidth(newWidth)
    }

    function handleMouseUp() {
      setIsResizing(false)
      // Salvar no localStorage ao soltar
      const current = sidebarRef.current
      if (current) {
        localStorage.setItem('artboard-sidebar-width', String(current.offsetWidth))
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    // Mudar cursor globalmente durante drag
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  // Salvar width quando muda (debounce no mouseup já cobre, mas garantir)
  useEffect(() => {
    if (!isResizing) {
      localStorage.setItem('artboard-sidebar-width', String(sidebarWidth))
    }
  }, [sidebarWidth, isResizing])

  const WS_ICON_COLORS = [
    '#0C66E4', '#9F8FEF', '#E56910', '#CF3D28',
    '#1F845A', '#0055CC', '#5243AA', '#943D73',
  ]

  useEffect(() => {
    const colors: Record<string, string> = {}
    for (const ws of initial) {
      const saved = localStorage.getItem(`ws-color-${ws.id}`)
      if (saved) colors[ws.id] = saved
    }
    setWsColors(colors)
  }, [])

  function handleWsColorChange(wsId: string, color: string) {
    localStorage.setItem(`ws-color-${wsId}`, color)
    setWsColors((prev) => ({ ...prev, [wsId]: color }))
    setColorPickerWs(null)
  }

  async function openMembersPanel(workspaceId: string) {
    setMembersWorkspace(workspaceId)
    setMemberError('')
    setMemberSuccess('')
    try {
      const members = await getWorkspaceMembers(workspaceId)
      setWsMembers(members)
    } catch { setWsMembers([]) }
  }

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault()
    if (!memberEmail.trim() || !membersWorkspace) return
    setMemberLoading(true)
    setMemberError('')
    setMemberSuccess('')
    try {
      const result = await inviteWorkspaceMember(membersWorkspace, memberEmail.trim())
      setMemberSuccess(`${result.email} adicionado!`)
      setMemberEmail('')
      const members = await getWorkspaceMembers(membersWorkspace)
      setWsMembers(members)
    } catch (err: any) {
      setMemberError(err.message)
    } finally {
      setMemberLoading(false)
    }
  }

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault()
    if (!newClientName.trim() || !activeOrgId) return
    const client = await createClientAction(activeOrgId, newClientName.trim())
    setClients([...clients, client])
    setNewClientName('')
    setCreatingClient(false)
    setExpandedClients({ ...expandedClients, [client.id]: true })
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!newTeamName.trim() || !activeOrgId) return
    const team = await createTeamAction(activeOrgId, newTeamName.trim())
    setTeams([...teams, team])
    setNewTeamName('')
    setCreatingTeam(false)
  }

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault()
    if (!newWorkspaceName.trim()) return
    const ws = await createWorkspace(newWorkspaceName.trim(), activeOrgId || undefined)
    setWorkspaces([...workspaces, { ...ws, boards: [] }])
    setNewWorkspaceName('')
    setCreatingWorkspace(false)
    setExpanded({ ...expanded, [ws.id]: true })
  }

  async function handleCreateBoard(e: React.FormEvent, workspaceId: string) {
    e.preventDefault()
    if (!newBoardName.trim()) return
    const board = await createBoard(workspaceId, newBoardName.trim())
    setWorkspaces(
      workspaces.map((w) =>
        w.id === workspaceId ? { ...w, boards: [...w.boards, board] } : w
      )
    )
    setNewBoardName('')
    setCreatingBoard(null)
  }

  const isActiveBoard = (boardId: string) => pathname === `/board/${boardId}`

  const activeWorkspace = workspaces[0]

  return (<>
    <aside
      ref={sidebarRef}
      style={{
        width: collapsed ? 48 : sidebarWidth,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
        position: 'relative',
        background: sidebarBg
          ? sidebarBg.startsWith('url(')
            ? `${sidebarBg} center/cover no-repeat`
            : sidebarBg
          : 'rgba(29, 33, 37, 0.88)',
        backdropFilter: sidebarBg ? undefined : 'blur(20px)',
        WebkitBackdropFilter: sidebarBg ? undefined : 'blur(20px)',
        zIndex: 10,
        borderRadius: 12,
        transition: 'width 200ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Header: toggle collapse + menu */}
      <div style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'space-between', alignItems: 'center', padding: collapsed ? '8px 0 0' : '8px 12px 0', position: 'relative' }}>
        <button
          onClick={toggleCollapsed}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: COLORS.sectionLabel, display: 'flex' }}
          className="hover:bg-[#A1BDD914]"
          title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        {!collapsed && (
          <button
            onClick={() => setShowCustomize(!showCustomize)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: COLORS.sectionLabel }}
            className="hover:bg-[#A1BDD914]"
          >
            <MoreHorizontal size={16} />
          </button>
        )}
        {showCustomize && (
          <>
            <div className="fixed inset-0 z-[99]" onClick={() => setShowCustomize(false)} />
            <div
              style={{
                position: 'absolute',
                right: 8,
                top: 32,
                zIndex: 100,
                padding: 12,
                background: '#282E33',
                borderRadius: 8,
                border: '1px solid rgba(166, 197, 226, 0.16)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                width: 200,
              }}
            >
              <p style={{ fontSize: 11, color: COLORS.sectionLabel, marginBottom: 8, fontWeight: 600, fontFamily: 'var(--font-inter)', textTransform: 'uppercase' }}>
                Cor de fundo
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {['#1D2125', '#0D1117', '#1a1e2e', '#1e1a2e', '#0d1711', '#170d11'].map((color) => (
                  <button
                    key={color}
                    onClick={() => { handleSidebarBgChange(color); setShowCustomize(false) }}
                    style={{
                      width: 24, height: 24, borderRadius: 4, backgroundColor: color,
                      border: 'none', cursor: 'pointer',
                      outline: sidebarBg === color ? '1px solid #579DFF' : 'none', outlineOffset: 1,
                    }}
                  />
                ))}
              </div>
              <p style={{ fontSize: 11, color: COLORS.sectionLabel, marginBottom: 6, fontWeight: 600, fontFamily: 'var(--font-inter)', textTransform: 'uppercase' }}>
                Imagem
              </p>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '6px 10px', borderRadius: 6, backgroundColor: '#22272B',
                color: '#B6C2CF', fontSize: 12, cursor: 'pointer', marginBottom: 8,
              }}>
                <ImageIcon size={14} />
                {uploadingSidebarBg ? 'Enviando...' : 'Upload'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploadingSidebarBg(true)
                  const reader = new FileReader()
                  reader.onload = () => { handleSidebarBgChange(reader.result as string); setUploadingSidebarBg(false); setShowCustomize(false) }
                  reader.onerror = () => setUploadingSidebarBg(false)
                  reader.readAsDataURL(file)
                }} />
              </label>
              {sidebarBg && (
                <button
                  onClick={() => { handleSidebarBgChange(null); setShowCustomize(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#F87168', fontSize: 12, borderRadius: 4 }}
                >
                  <RotateCcw size={12} /> Resetar
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <nav style={{ flex: 1, padding: '4px 0 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Seção 1: Navegação global */}
        <Link
          href="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: collapsed ? '8px 0' : '6px 12px 6px 20px',
            margin: collapsed ? '0' : '0 8px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: pathname === '/dashboard' ? COLORS.active : 'transparent',
            color: pathname === '/dashboard' ? COLORS.accent : COLORS.text,
            fontSize: 14,
            borderRadius: collapsed ? 0 : 4,
            transition: 'all 150ms',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => { if (pathname !== '/dashboard') { e.currentTarget.style.backgroundColor = COLORS.hover; e.currentTarget.style.color = COLORS.textHeading } }}
          onMouseLeave={(e) => { if (pathname !== '/dashboard') { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = COLORS.text } }}
          title="Dashboard"
        >
          <BarChart2 size={16} />
          {!collapsed && <span>Dashboard</span>}
        </Link>

        <Link
          href="/timesheet"
          style={{
            width: 'calc(100% - 16px)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px 6px 20px',
            margin: '0 8px',
            border: 'none',
            background: pathname === '/timesheet' ? COLORS.active : 'transparent',
            cursor: 'pointer',
            color: pathname === '/timesheet' ? COLORS.accent : COLORS.text,
            fontSize: 14,
            fontWeight: 400,
            borderRadius: 4,
            transition: 'background-color 150ms, color 150ms',
            textDecoration: 'none',
            lineHeight: '20px',
          }}
          onMouseEnter={(e) => {
            if (pathname !== '/timesheet') {
              e.currentTarget.style.backgroundColor = COLORS.hover
              e.currentTarget.style.color = COLORS.textHeading
            }
          }}
          onMouseLeave={(e) => {
            if (pathname !== '/timesheet') {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = COLORS.text
            }
          }}
        >
          <Clock size={16} />
          {!collapsed && <span>Timesheet</span>}
        </Link>

        <Link
          href="/settings"
          style={{
            width: 'calc(100% - 16px)',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px 6px 20px', margin: '0 8px',
            border: 'none',
            background: pathname === '/settings' ? COLORS.active : 'transparent',
            cursor: 'pointer',
            color: pathname === '/settings' ? COLORS.accent : COLORS.text,
            fontSize: 14, fontWeight: 400, borderRadius: 4,
            transition: 'background-color 150ms, color 150ms',
            textDecoration: 'none', lineHeight: '20px',
          }}
          onMouseEnter={(e) => { if (pathname !== '/settings') { e.currentTarget.style.backgroundColor = COLORS.hover; e.currentTarget.style.color = COLORS.textHeading } }}
          onMouseLeave={(e) => { if (pathname !== '/settings') { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = COLORS.text } }}
        >
          <Settings size={16} />
          {!collapsed && <span>Configurações</span>}
        </Link>

        {/* Separador */}
        <div style={{ height: 1, backgroundColor: COLORS.border, margin: collapsed ? '8px 6px' : '8px 12px' }} />

        {/* Org selector */}
        {!collapsed && activeOrgId && orgs.length > 0 && (
          <div style={{ padding: '4px 12px 0 12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', borderRadius: 6,
              background: 'rgba(87, 157, 255, 0.08)',
            }}>
              <Building2 size={14} color={COLORS.accent} />
              <select
                value={activeOrgId}
                onChange={(e) => setActiveOrgId(e.target.value)}
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  color: COLORS.textHeading, fontSize: 13, fontWeight: 600,
                  outline: 'none', cursor: 'pointer',
                }}
              >
                {orgs.map((org) => (
                  <option key={org.id} value={org.id} style={{ background: '#22272B' }}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Section tabs */}
            <div style={{ display: 'flex', gap: 2, marginTop: 8 }}>
              {(['clients', 'teams', 'workspaces'] as const).map((section) => (
                <button
                  key={section}
                  onClick={() => setSidebarSection(section)}
                  style={{
                    flex: 1, padding: '4px 0', border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.04em', borderRadius: 4,
                    background: sidebarSection === section ? COLORS.active : 'transparent',
                    color: sidebarSection === section ? COLORS.accent : COLORS.sectionLabel,
                  }}
                  className="hover:bg-[#A1BDD914]"
                >
                  {section === 'clients' ? 'Clientes' : section === 'teams' ? 'Times' : 'Projetos'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Separador */}
        {!collapsed && <div style={{ height: 1, backgroundColor: COLORS.border, margin: '8px 12px' }} />}

        {/* Seção: Clients */}
        {!collapsed && sidebarSection === 'clients' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '4px 12px 4px 20px', fontSize: 11, fontWeight: 700, color: COLORS.sectionLabel, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Clientes
            </div>
            {clients.filter(c => c.org_id === activeOrgId).map((client) => {
              const clientWorkspaces = workspaces.filter(w => w.client_id === client.id)
              return (
                <div key={client.id} style={{ marginBottom: 2 }}>
                  <button
                    onClick={() => setExpandedClients({ ...expandedClients, [client.id]: !expandedClients[client.id] })}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px', border: 'none', background: 'transparent',
                      cursor: 'pointer', color: COLORS.textHeading, fontSize: 14,
                      fontWeight: 600, textAlign: 'left', borderRadius: 4,
                    }}
                    className="hover:bg-[#A1BDD914]"
                  >
                    <FolderKanban size={16} color={COLORS.accent} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {client.name}
                    </span>
                    <span style={{ fontSize: 11, color: COLORS.sectionLabel }}>{clientWorkspaces.length}</span>
                    {expandedClients[client.id] ? <ChevronDown size={14} color={COLORS.sectionLabel} /> : <ChevronRight size={14} color={COLORS.sectionLabel} />}
                  </button>
                  {expandedClients[client.id] && (
                    <div>
                      {clientWorkspaces.map((ws) => (
                        <div key={ws.id} style={{ marginLeft: 12 }}>
                          <button
                            onClick={() => setExpanded({ ...expanded, [ws.id]: !expanded[ws.id] })}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                              padding: '4px 8px', border: 'none', background: 'transparent',
                              cursor: 'pointer', color: COLORS.text, fontSize: 13,
                              textAlign: 'left', borderRadius: 4,
                            }}
                            className="hover:bg-[#A1BDD914]"
                          >
                            <span style={{ width: 18, height: 14, borderRadius: 3, background: wsColors[ws.id] || '#0C66E4', flexShrink: 0 }} />
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</span>
                            {expanded[ws.id] ? <ChevronDown size={12} color={COLORS.sectionLabel} /> : <ChevronRight size={12} color={COLORS.sectionLabel} />}
                          </button>
                          {expanded[ws.id] && ws.boards.map((board) => (
                            <Link
                              key={board.id}
                              href={`/board/${board.id}`}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '5px 8px 5px 32px', fontSize: 13,
                                color: isActiveBoard(board.id) ? COLORS.accent : COLORS.text,
                                backgroundColor: isActiveBoard(board.id) ? COLORS.active : 'transparent',
                                textDecoration: 'none', borderRadius: 4, margin: '1px 0',
                              }}
                              className="hover:bg-[#A1BDD914]"
                            >
                              <span style={{ width: 16, height: 12, borderRadius: 2, background: board.background || '#0079BF', flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{board.name}</span>
                            </Link>
                          ))}
                        </div>
                      ))}
                      {/* Novo workspace para este client */}
                      <button
                        onClick={() => { setCreatingBoard(null); setCreatingWorkspace(true) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '4px 8px 4px 24px', border: 'none', background: 'transparent',
                          cursor: 'pointer', color: COLORS.sectionLabel, fontSize: 12, borderRadius: 4,
                        }}
                        className="hover:bg-[#A1BDD914]"
                      >
                        <Plus size={12} /> Novo projeto
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {/* Novo client */}
            {creatingClient ? (
              <form onSubmit={handleCreateClient} style={{ padding: '4px 12px' }}>
                <input
                  autoFocus
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  onBlur={() => { if (!newClientName.trim()) setCreatingClient(false) }}
                  placeholder="Nome do cliente"
                  style={{
                    width: '100%', backgroundColor: COLORS.inputBg, color: COLORS.textHeading,
                    fontSize: 13, borderRadius: 4, padding: '6px 8px',
                    border: `1px solid ${COLORS.inputBorder}`, outline: 'none',
                  }}
                />
              </form>
            ) : (
              <button
                onClick={() => setCreatingClient(true)}
                style={{
                  width: 'calc(100% - 16px)', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 12px', margin: '4px 8px', border: 'none', background: 'transparent',
                  cursor: 'pointer', color: COLORS.text, fontSize: 13, borderRadius: 4,
                }}
                className="hover:bg-[#A1BDD914]"
              >
                <Plus size={14} /> Novo cliente
              </button>
            )}
          </div>
        )}

        {/* Seção: Teams */}
        {!collapsed && sidebarSection === 'teams' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '4px 12px 4px 20px', fontSize: 11, fontWeight: 700, color: COLORS.sectionLabel, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Times
            </div>
            {teams.filter(t => t.org_id === activeOrgId).map((team) => (
              <div key={team.id} style={{ marginBottom: 2 }}>
                <button
                  onClick={() => setExpandedTeams({ ...expandedTeams, [team.id]: !expandedTeams[team.id] })}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px', border: 'none', background: 'transparent',
                    cursor: 'pointer', color: COLORS.textHeading, fontSize: 14,
                    fontWeight: 600, textAlign: 'left', borderRadius: 4,
                  }}
                  className="hover:bg-[#A1BDD914]"
                >
                  <Users size={16} color="#9F8FEF" />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {team.name}
                  </span>
                  {expandedTeams[team.id] ? <ChevronDown size={14} color={COLORS.sectionLabel} /> : <ChevronRight size={14} color={COLORS.sectionLabel} />}
                </button>
                {expandedTeams[team.id] && (
                  <div style={{ padding: '4px 12px 4px 32px' }}>
                    {workspaces.filter(w => w.team_id === team.id).map((ws) => (
                      <div key={ws.id}>
                        {ws.boards.map((board) => (
                          <Link
                            key={board.id}
                            href={`/board/${board.id}`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '5px 8px', fontSize: 13,
                              color: isActiveBoard(board.id) ? COLORS.accent : COLORS.text,
                              backgroundColor: isActiveBoard(board.id) ? COLORS.active : 'transparent',
                              textDecoration: 'none', borderRadius: 4,
                            }}
                            className="hover:bg-[#A1BDD914]"
                          >
                            <span style={{ width: 16, height: 12, borderRadius: 2, background: board.background || '#0079BF', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{board.name}</span>
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {creatingTeam ? (
              <form onSubmit={handleCreateTeam} style={{ padding: '4px 12px' }}>
                <input
                  autoFocus
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onBlur={() => { if (!newTeamName.trim()) setCreatingTeam(false) }}
                  placeholder="Nome do time"
                  style={{
                    width: '100%', backgroundColor: COLORS.inputBg, color: COLORS.textHeading,
                    fontSize: 13, borderRadius: 4, padding: '6px 8px',
                    border: `1px solid ${COLORS.inputBorder}`, outline: 'none',
                  }}
                />
              </form>
            ) : (
              <button
                onClick={() => setCreatingTeam(true)}
                style={{
                  width: 'calc(100% - 16px)', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 12px', margin: '4px 8px', border: 'none', background: 'transparent',
                  cursor: 'pointer', color: COLORS.text, fontSize: 13, borderRadius: 4,
                }}
                className="hover:bg-[#A1BDD914]"
              >
                <Plus size={14} /> Novo time
              </button>
            )}
          </div>
        )}

        {/* Seção: Workspaces (projetos sem client) */}
        {(sidebarSection === 'workspaces' || collapsed) && (<>
        {collapsed ? (
          /* Modo colapsado: iniciais dos workspaces + botão novo */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0', flex: 1 }}>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { setCollapsed(false); setExpanded({ ...expanded, [ws.id]: true }) }}
                style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: wsColors[ws.id] || '#0C66E4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#fff',
                  border: 'none', cursor: 'pointer',
                }}
                className="hover:opacity-80"
                title={ws.name}
              >
                {ws.name.charAt(0).toUpperCase()}
              </button>
            ))}
            {/* + Novo workspace (colapsado) */}
            <button
              onClick={() => { setCollapsed(false); setCreatingWorkspace(true) }}
              style={{
                width: 32, height: 32, borderRadius: 6,
                background: 'transparent', border: `1px dashed ${COLORS.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: COLORS.sectionLabel,
              }}
              className="hover:bg-[#A1BDD914] hover:border-[#579DFF]"
              title="Novo workspace"
            >
              <Plus size={14} />
            </button>
          </div>
        ) : (
        <>
        <div
          style={{
            padding: '4px 12px 4px 20px',
            fontSize: 11,
            fontWeight: 700,
            color: COLORS.sectionLabel,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'var(--font-inter)',
          }}
        >
          Workspaces
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
        {workspaces.map((workspace) => (
          <div key={workspace.id} style={{ marginBottom: 4 }}>
            {/* Workspace header */}
            <button
              onClick={() =>
                setExpanded({ ...expanded, [workspace.id]: !expanded[workspace.id] })
              }
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: COLORS.textHeading,
                fontSize: 14,
                fontWeight: 600,
                lineHeight: '20px',
                textAlign: 'left',
                borderRadius: 4,
                transition: 'background-color 150ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.hover
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  setColorPickerWs(colorPickerWs === workspace.id ? null : workspace.id)
                }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: wsColors[workspace.id] || '#0C66E4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                  cursor: 'pointer',
                  position: 'relative',
                }}
                title="Clique para mudar a cor"
              >
                {workspace.name.charAt(0).toUpperCase()}
              </span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {workspace.name}
              </span>
              {expanded[workspace.id] ? (
                <ChevronDown size={16} color={COLORS.sectionLabel} style={{ flexShrink: 0 }} />
              ) : (
                <ChevronRight size={16} color={COLORS.sectionLabel} style={{ flexShrink: 0 }} />
              )}
            </button>

            {/* Workspace color picker */}
            {colorPickerWs === workspace.id && (
              <div
                style={{
                  margin: '4px 12px',
                  padding: 8,
                  background: 'rgba(40, 46, 51, 0.95)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: 8,
                  border: '1px solid rgba(166, 197, 226, 0.16)',
                }}
              >
                <p style={{ fontSize: 11, color: COLORS.sectionLabel, marginBottom: 6, fontWeight: 600 }}>
                  Cor do workspace
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {WS_ICON_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleWsColorChange(workspace.id, color)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        backgroundColor: color,
                        border: 'none',
                        cursor: 'pointer',
                        outline: wsColors[workspace.id] === color ? '1px solid #579DFF' : 'none',
                        outlineOffset: 1,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Expanded content */}
            {expanded[workspace.id] && (
              <div style={{ marginTop: 2 }}>
                {/* Section label */}
                <div
                  style={{
                    padding: '10px 12px 4px 20px',
                    marginTop: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.sectionLabel,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  Seus boards
                </div>

                {/* Board links */}
                {workspace.boards.map((board) => {
                  const active = isActiveBoard(board.id)
                  return (
                    <Link
                      key={board.id}
                      href={`/board/${board.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '7px 12px 7px 20px',
                        fontSize: 14,
                        fontWeight: 400,
                        color: active ? COLORS.accent : COLORS.text,
                        backgroundColor: active ? COLORS.active : 'transparent',
                        textDecoration: 'none',
                        borderRadius: 6,
                        margin: '1px 8px',
                        transition: 'background-color 150ms, color 150ms',
                        lineHeight: '20px',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = COLORS.hover
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      <span
                        style={{
                          width: 20,
                          height: 16,
                          borderRadius: 3,
                          flexShrink: 0,
                          backgroundColor: board.background || '#0079BF',
                        }}
                      />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {board.name}
                      </span>
                    </Link>
                  )
                })}

                {/* Create board form / button */}
                {creatingBoard === workspace.id ? (
                  <form
                    onSubmit={(e) => handleCreateBoard(e, workspace.id)}
                    style={{ padding: '4px 20px', margin: '0 8px' }}
                  >
                    <input
                      autoFocus
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      onBlur={() => {
                        if (!newBoardName.trim()) setCreatingBoard(null)
                      }}
                      placeholder="Nome do board"
                      style={{
                        width: '100%',
                        backgroundColor: COLORS.inputBg,
                        color: COLORS.textHeading,
                        fontSize: 14,
                        borderRadius: 4,
                        padding: '6px 8px',
                        border: `1px solid ${COLORS.inputBorder}`,
                        outline: 'none',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = COLORS.accent
                      }}
                      onBlurCapture={(e) => {
                        e.currentTarget.style.borderColor = COLORS.inputBorder
                      }}
                    />
                  </form>
                ) : (
                  <button
                    onClick={() => setCreatingBoard(workspace.id)}
                    style={{
                      width: 'calc(100% - 16px)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px 6px 20px',
                      margin: '0 8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: COLORS.text,
                      fontSize: 14,
                      fontWeight: 400,
                      borderRadius: 4,
                      transition: 'background-color 150ms, color 150ms',
                      textAlign: 'left',
                      lineHeight: '20px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = COLORS.hover
                      e.currentTarget.style.color = COLORS.textHeading
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = COLORS.text
                    }}
                  >
                    <Plus size={16} />
                    <span>Novo board</span>
                  </button>
                )}

                {/* Membros do workspace */}
                <button
                  onClick={() => openMembersPanel(workspace.id)}
                  style={{
                    width: 'calc(100% - 16px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px 6px 20px',
                    margin: '0 8px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: COLORS.text,
                    fontSize: 14,
                    fontWeight: 400,
                    borderRadius: 4,
                    transition: 'background-color 150ms, color 150ms',
                    textAlign: 'left' as const,
                    lineHeight: '20px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = COLORS.hover
                    e.currentTarget.style.color = COLORS.textHeading
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = COLORS.text
                  }}
                >
                  <Users size={16} />
                  <span>Membros</span>
                </button>

                {/* AI Board Builder */}
                <button
                  onClick={() => setAiBuilderWorkspace(workspace.id)}
                  style={{
                    width: 'calc(100% - 16px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px 6px 20px',
                    margin: '0 8px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: COLORS.text,
                    fontSize: 14,
                    fontWeight: 400,
                    borderRadius: 4,
                    transition: 'background-color 150ms, color 150ms',
                    textAlign: 'left',
                    lineHeight: '20px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = COLORS.hover
                    e.currentTarget.style.color = COLORS.textHeading
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = COLORS.text
                  }}
                >
                  <Sparkles size={16} />
                  <span>AI Board Builder</span>
                </button>
              </div>
            )}
          </div>
        ))}

        </div>

        {/* Separador */}
        <div
          style={{
            height: 1,
            backgroundColor: COLORS.border,
            margin: '8px 12px',
          }}
        />

        {/* Seção 3: Ações (bottom) */}
        {creatingWorkspace ? (
          <form onSubmit={handleCreateWorkspace} style={{ padding: '4px 12px' }}>
            <input
              autoFocus
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onBlur={() => {
                if (!newWorkspaceName.trim()) setCreatingWorkspace(false)
              }}
              placeholder="Nome do workspace"
              style={{
                width: '100%',
                backgroundColor: COLORS.inputBg,
                color: COLORS.textHeading,
                fontSize: 14,
                borderRadius: 4,
                padding: '6px 8px',
                border: `1px solid ${COLORS.inputBorder}`,
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = COLORS.accent
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = COLORS.inputBorder
              }}
            />
          </form>
        ) : (
          <button
            onClick={() => setCreatingWorkspace(true)}
            style={{
              width: 'calc(100% - 16px)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              margin: '0 8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: COLORS.text,
              fontSize: 14,
              fontWeight: 400,
              borderRadius: 4,
              transition: 'background-color 150ms, color 150ms',
              textAlign: 'left',
              lineHeight: '20px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.hover
              e.currentTarget.style.color = COLORS.textHeading
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = COLORS.text
            }}
          >
            <Plus size={16} />
            <span>Novo workspace</span>
          </button>
        )}
        </>
        )}
        </>)}

      </nav>

      {/* Resize handle — sempre visível entre os painéis */}
      <div
        onMouseDown={handleMouseDown}
        className="resize-handle"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: -13,
          width: 14,
          cursor: 'col-resize',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="handle-pill"
          style={{
            width: 4,
            height: 36,
            borderRadius: 4,
            backgroundColor: isResizing ? '#579DFF' : 'rgba(159, 173, 188, 0.4)',
            transition: 'background-color 150ms, height 150ms',
          }}
        />
        <style>{`
          .resize-handle:hover .handle-pill {
            background-color: rgba(87, 157, 255, 0.8) !important;
          }
        `}</style>
      </div>
    </aside>

    {/* AI Builder modal — fora da aside, fixed centralizado */}
    {aiBuilderWorkspace && (
      <AIBoardBuilder
        workspaceId={aiBuilderWorkspace}
        onClose={() => setAiBuilderWorkspace(null)}
      />
    )}

    {/* Modal membros — fora da aside pra não herdar overflow */}
    {membersWorkspace && (
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
        onClick={() => setMembersWorkspace(null)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#282E33',
            border: '1px solid rgba(166, 197, 226, 0.16)',
            borderRadius: 16,
            width: '100%',
            maxWidth: 480,
            padding: 28,
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ color: '#DEE4EA', fontSize: 18, fontWeight: 700 }}>
              Membros do workspace
            </h3>
            <button
              onClick={() => setMembersWorkspace(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6 }}
              className="hover:bg-[#A1BDD914]"
            >
              <X size={18} color="#9FADBC" />
            </button>
          </div>

          <form onSubmit={handleInviteMember} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="Email do membro..."
                type="email"
                style={{
                  flex: 1,
                  backgroundColor: '#22272B',
                  color: '#DEE4EA',
                  fontSize: 14,
                  borderRadius: 8,
                  padding: '10px 14px',
                  border: '1px solid rgba(166, 197, 226, 0.2)',
                  outline: 'none',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#579DFF' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(166, 197, 226, 0.2)' }}
              />
              <button
                type="submit"
                disabled={memberLoading || !memberEmail.trim()}
                style={{
                  backgroundColor: '#579DFF',
                  color: '#1D2125',
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                  padding: '10px 20px',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: memberLoading || !memberEmail.trim() ? 0.5 : 1,
                }}
              >
                {memberLoading ? 'Enviando...' : 'Convidar'}
              </button>
            </div>
            {memberError && <p style={{ color: '#F87168', fontSize: 13, marginTop: 8 }}>{memberError}</p>}
            {memberSuccess && <p style={{ color: '#4BCE97', fontSize: 13, marginTop: 8 }}>{memberSuccess}</p>}
          </form>

          <p style={{ fontSize: 11, fontWeight: 700, color: '#9FADBC', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontFamily: 'var(--font-inter)' }}>
            Membros ({wsMembers.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {wsMembers.map((m) => {
              const initials = (m.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <div
                  key={m.user_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 8,
                  }}
                  className="hover:bg-[#A1BDD914]"
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: '#579DFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#1D2125',
                    flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#DEE4EA' }}>
                      {m.name || 'Usuário'}
                    </p>
                    <p style={{ fontSize: 12, color: '#8C9BAB' }}>
                      {m.email || ''}
                    </p>
                  </div>
                  <select
                    value={m.role}
                    onChange={async (e) => {
                      if (!membersWorkspace) return
                      await updateMemberRole('workspace', membersWorkspace, m.user_id, e.target.value)
                      const updated = await getWorkspaceMembers(membersWorkspace)
                      setWsMembers(updated)
                    }}
                    style={{ backgroundColor: '#22272B', color: '#B6C2CF', border: '1px solid rgba(166,197,226,0.2)', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Membro</option>
                    <option value="guest">Convidado</option>
                  </select>
                  {m.role !== 'admin' && (
                    <button
                      onClick={async () => {
                        if (!membersWorkspace) return
                        await removeWorkspaceMember(membersWorkspace, m.user_id)
                        const updated = await getWorkspaceMembers(membersWorkspace)
                        setWsMembers(updated)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: 6,
                        color: '#F87168',
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                      className="hover:bg-[#F8716820]"
                    >
                      Remover
                    </button>
                  )}
                </div>
              )
            })}
            {wsMembers.length === 0 && (
              <p style={{ color: '#8C9BAB', fontSize: 13, textAlign: 'center', padding: 20 }}>
                Nenhum membro ainda
              </p>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  )
}
