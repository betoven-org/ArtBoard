'use client'

import { useMemo, useState } from 'react'
import { Clock, AlertTriangle, UserX, TrendingUp, BarChart2 } from 'lucide-react'

type TimeEntry = {
  id: string
  user_id: string
  board_id: string
  workspace_id: string
  duration_seconds: number
  started_at: string
  cards?: { name: string; lists?: { name: string; boards?: { name: string } } } | null
}

type OverdueCard = {
  id: string
  name: string
  due_date: string | null
  due_complete: boolean
  list_id: string
  lists?: { name: string; board_id: string; boards?: { name: string } } | null
}

type UnassignedCard = {
  id: string
  name: string
  list_id: string
  card_members?: { user_id: string }[] | null
  lists?: { name: string; boards?: { name: string } } | null
}

type Props = {
  timeEntries: TimeEntry[]
  overdueCards: OverdueCard[]
  unassignedCards: UnassignedCard[]
  workspaces: { id: string; name: string }[]
  userNames?: Record<string, string>
}

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

function getWeekLabel(date: Date): string {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
  return `${fmt(start)} - ${fmt(end)}`
}

function getWeekKey(date: Date): string {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}

function daysOverdue(dueDate: string): number {
  const now = new Date()
  const due = new Date(dueDate)
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
}

export function DashboardView({ timeEntries, overdueCards, unassignedCards, workspaces, userNames = {} }: Props) {
  const [filterWorkspace, setFilterWorkspace] = useState<string>('')

  const filteredTimeEntries = useMemo(
    () => filterWorkspace ? timeEntries.filter(e => e.workspace_id === filterWorkspace) : timeEntries,
    [timeEntries, filterWorkspace]
  )

  const filteredOverdueCards = useMemo(
    () => filterWorkspace ? overdueCards.filter(c => c.lists?.board_id && filteredTimeEntries.some(e => e.board_id === c.lists?.board_id)) : overdueCards,
    [overdueCards, filterWorkspace, filteredTimeEntries]
  )

  const totalSeconds = useMemo(() => filteredTimeEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0), [filteredTimeEntries])

  const thisWeekKey = getWeekKey(new Date())
  const thisWeekSeconds = useMemo(
    () => filteredTimeEntries.filter(e => getWeekKey(new Date(e.started_at)) === thisWeekKey).reduce((sum, e) => sum + (e.duration_seconds || 0), 0),
    [filteredTimeEntries, thisWeekKey]
  )

  // Horas por semana (ultimas 4)
  const weeklyData = useMemo(() => {
    const map: Record<string, { label: string; seconds: number }> = {}
    for (let i = 0; i < 4; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i * 7)
      const key = getWeekKey(d)
      map[key] = { label: getWeekLabel(d), seconds: 0 }
    }
    for (const e of filteredTimeEntries) {
      const key = getWeekKey(new Date(e.started_at))
      if (map[key]) map[key].seconds += e.duration_seconds || 0
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
  }, [filteredTimeEntries])

  const maxWeekSeconds = Math.max(...weeklyData.map(w => w.seconds), 1)

  // Horas por membro
  const memberData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of filteredTimeEntries) {
      map[e.user_id] = (map[e.user_id] || 0) + (e.duration_seconds || 0)
    }
    return Object.entries(map)
      .map(([userId, seconds]) => ({ userId, seconds, name: userNames[userId] || 'Usuario' }))
      .sort((a, b) => b.seconds - a.seconds)
  }, [filteredTimeEntries])

  const maxMemberSeconds = Math.max(...memberData.map(m => m.seconds), 1)

  // Horas por board
  const boardData = useMemo(() => {
    const map: Record<string, { name: string; seconds: number }> = {}
    for (const e of filteredTimeEntries) {
      const boardName = e.cards?.lists?.boards?.name || 'Sem board'
      const key = e.board_id || 'unknown'
      if (!map[key]) map[key] = { name: boardName, seconds: 0 }
      map[key].seconds += e.duration_seconds || 0
    }
    return Object.values(map).sort((a, b) => b.seconds - a.seconds)
  }, [filteredTimeEntries])

  const COLORS = {
    bg: '#1D2125',
    card: '#22272B',
    cardBorder: 'rgba(166, 197, 226, 0.12)',
    text: '#B6C2CF',
    heading: '#DEE4EA',
    accent: '#579DFF',
    muted: '#8C9BAB',
    red: '#F87168',
    green: '#4BCE97',
    yellow: '#F5CD47',
    surface: '#282E33',
  }

  const BOARD_COLORS = ['#579DFF', '#9F8FEF', '#4BCE97', '#E56910', '#F87168', '#F5CD47', '#0C66E4', '#943D73']

  return (
    <div style={{ padding: 24, background: COLORS.bg, minHeight: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.heading }}>Dashboard</h1>
        <select
          value={filterWorkspace}
          onChange={(e) => setFilterWorkspace(e.target.value)}
          style={{
            background: '#22272B',
            color: '#B6C2CF',
            border: '1px solid rgba(166,197,226,0.2)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 14,
            outline: 'none',
          }}
        >
          <option value="">Todos os workspaces</option>
          {workspaces.map(ws => (
            <option key={ws.id} value={ws.id}>{ws.name}</option>
          ))}
        </select>
      </div>

      {timeEntries.length === 0 && overdueCards.length === 0 && unassignedCards.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
          <BarChart2 size={40} color={COLORS.accent} style={{ opacity: 0.4, marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: COLORS.muted }}>Sem dados para exibir</p>
          <p style={{ fontSize: 12, color: '#738496', marginTop: 4 }}>Registre tempo e atribua tarefas para ver metricas</p>
        </div>
      )}

      {/* Metricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <MetricCard icon={<Clock size={18} />} label="Total horas (4 sem)" value={formatHours(totalSeconds)} color={COLORS.accent} colors={COLORS} />
        <MetricCard icon={<AlertTriangle size={18} />} label="Cards atrasados" value={String(filteredOverdueCards.length)} color={COLORS.red} colors={COLORS} />
        <MetricCard icon={<UserX size={18} />} label="Cards sem responsavel" value={String(unassignedCards.length)} color={COLORS.yellow} colors={COLORS} />
        <MetricCard icon={<TrendingUp size={18} />} label="Horas esta semana" value={formatHours(thisWeekSeconds)} color={COLORS.green} colors={COLORS} />
      </div>

      {/* Linha 2: Horas por Semana + Horas por Membro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
        {/* Horas por semana */}
        <div style={panelStyle(COLORS)}>
          <h3 style={panelTitleStyle(COLORS)}>Horas por Semana</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {weeklyData.map((week, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: COLORS.muted }}>{week.label}</span>
                  <span style={{ fontSize: 12, color: COLORS.text, fontWeight: 600 }}>{formatHours(week.seconds)}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'rgba(166, 197, 226, 0.08)' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 4,
                    background: COLORS.accent,
                    width: `${(week.seconds / maxWeekSeconds) * 100}%`,
                    transition: 'width 300ms',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Horas por membro */}
        <div style={panelStyle(COLORS)}>
          <h3 style={panelTitleStyle(COLORS)}>Horas por Membro</h3>
          {memberData.length === 0 ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Nenhum registro encontrado</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {memberData.map((m) => (
                <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', backgroundColor: COLORS.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#1D2125', flexShrink: 0,
                  }}>
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{m.name}</span>
                      <span style={{ fontSize: 12, color: COLORS.muted }}>{formatHours(m.seconds)}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(166, 197, 226, 0.08)' }}>
                      <div style={{
                        height: '100%', borderRadius: 3, background: COLORS.accent,
                        width: `${(m.seconds / maxMemberSeconds) * 100}%`, transition: 'width 300ms',
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Linha 3: Horas por Board + Cards Atrasados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
        {/* Horas por board */}
        <div style={panelStyle(COLORS)}>
          <h3 style={panelTitleStyle(COLORS)}>Horas por Board</h3>
          {boardData.length === 0 ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Nenhum registro encontrado</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {boardData.map((b, i) => {
                const pct = totalSeconds > 0 ? Math.round((b.seconds / totalSeconds) * 100) : 0
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                      backgroundColor: BOARD_COLORS[i % BOARD_COLORS.length],
                    }} />
                    <span style={{ flex: 1, fontSize: 13, color: COLORS.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.name}
                    </span>
                    <span style={{ fontSize: 12, color: COLORS.muted, flexShrink: 0 }}>{formatHours(b.seconds)}</span>
                    <span style={{ fontSize: 11, color: COLORS.muted, flexShrink: 0, width: 36, textAlign: 'right' }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Cards atrasados */}
        <div style={panelStyle(COLORS)}>
          <h3 style={panelTitleStyle(COLORS)}>Cards Atrasados</h3>
          {filteredOverdueCards.length === 0 ? (
            <p style={{ color: COLORS.muted, fontSize: 13 }}>Nenhum card atrasado</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
              {filteredOverdueCards.map((card) => {
                const days = card.due_date ? daysOverdue(card.due_date) : 0
                return (
                  <div key={card.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderRadius: 8, background: 'rgba(248, 113, 104, 0.06)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: COLORS.heading, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {card.name}
                      </p>
                      <p style={{ fontSize: 11, color: COLORS.muted }}>
                        {card.lists?.boards?.name || 'Board'}
                      </p>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: '#fff', backgroundColor: COLORS.red,
                      padding: '2px 8px', borderRadius: 10, flexShrink: 0,
                    }}>
                      {days}d atrasado
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Linha 4: Cards sem responsavel */}
      <div style={panelStyle(COLORS)}>
        <h3 style={panelTitleStyle(COLORS)}>Cards sem Responsavel</h3>
        {unassignedCards.length === 0 ? (
          <p style={{ color: COLORS.muted, fontSize: 13 }}>Todos os cards possuem responsavel</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
            {unassignedCards.map((card) => (
              <div key={card.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 8, background: 'rgba(245, 205, 71, 0.06)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: COLORS.heading, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.name}
                  </p>
                  <p style={{ fontSize: 11, color: COLORS.muted }}>
                    {card.lists?.boards?.name || 'Board'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, color, colors }: {
  icon: React.ReactNode; label: string; value: string; color: string
  colors: { card: string; cardBorder: string; heading: string; muted: string }
}) {
  return (
    <div style={{
      background: colors.card, border: `1px solid ${colors.cardBorder}`,
      borderRadius: 12, padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ color }}>{icon}</div>
        <span style={{ fontSize: 12, color: colors.muted, fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ fontSize: 24, fontWeight: 700, color: colors.heading }}>{value}</p>
    </div>
  )
}

function panelStyle(colors: { card: string; cardBorder: string }): React.CSSProperties {
  return {
    background: colors.card,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 12,
    padding: 16,
  }
}

function panelTitleStyle(colors: { heading: string }): React.CSSProperties {
  return {
    fontSize: 14,
    fontWeight: 600,
    color: colors.heading,
    marginBottom: 12,
  }
}
