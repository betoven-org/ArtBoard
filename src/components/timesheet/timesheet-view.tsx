'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Clock, Trash2, Download, FileSpreadsheet } from 'lucide-react'
import { getMonthlyTimesheet, deleteTimeEntry } from '@/lib/actions/timesheet'

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatHoursDecimal(seconds: number) {
  return (seconds / 3600).toFixed(1) + 'h'
}

type TimesheetProps = {
  initialEntries: any[]
  workspaces?: Array<{ id: string; name: string }>
  users?: Array<{ id: string; name: string; email: string }>
  currentUserId?: string
}

export function TimesheetView({ initialEntries, workspaces = [], users = [], currentUserId }: TimesheetProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [entries, setEntries] = useState(initialEntries)
  const [loading, setLoading] = useState(false)
  const [filterWorkspace, setFilterWorkspace] = useState<string>('')
  const [filterUser, setFilterUser] = useState<string>('')

  const reloadEntries = useCallback(async (y: number, m: number, wsId?: string, uId?: string) => {
    setLoading(true)
    const data = await getMonthlyTimesheet(y, m, wsId || undefined, uId || undefined)
    setEntries(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    reloadEntries(year, month, filterWorkspace, filterUser)
  }, [filterWorkspace, filterUser])

  async function changeMonth(delta: number) {
    let newMonth = month + delta
    let newYear = year
    if (newMonth < 1) {
      newMonth = 12
      newYear--
    } else if (newMonth > 12) {
      newMonth = 1
      newYear++
    }
    setMonth(newMonth)
    setYear(newYear)
    await reloadEntries(newYear, newMonth, filterWorkspace, filterUser)
  }

  async function handleDelete(entryId: string) {
    if (!confirm('Remover este registro de tempo?')) return
    try {
      await deleteTimeEntry(entryId)
      setEntries(entries.filter((e: any) => e.id !== entryId))
    } catch {
      alert('Erro ao remover registro de tempo. Tente novamente.')
    }
  }

  const totalSeconds = entries.reduce((sum: number, e: any) => sum + (e.duration_seconds || 0), 0)

  function handleExportCSV() {
    const headers = ['Data', 'Colaborador', 'Workspace', 'Board', 'Lista', 'Card', 'Inicio', 'Fim', 'Duracao (h)']
    const rows = entries.map((entry: any) => {
      const card = entry.cards
      const list = card?.lists
      const board = list?.boards
      const startedAt = new Date(entry.started_at)
      const stoppedAt = entry.stopped_at ? new Date(entry.stopped_at) : null
      const userName = users.find(u => u.id === entry.user_id)?.name || 'Usuario'
      return [
        startedAt.toLocaleDateString('pt-BR'),
        userName,
        workspaces.find(w => w.id === entry.workspace_id)?.name || '-',
        board?.name || '-',
        list?.name || '-',
        card?.name || '-',
        startedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        stoppedAt ? stoppedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-',
        ((entry.duration_seconds || 0) / 3600).toFixed(2),
      ]
    })

    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timesheet-${year}-${String(month).padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleExportPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()

    // === HEADER — limpo, sem fundo pesado ===
    doc.setDrawColor(220, 220, 220)
    doc.line(14, 32, pageW - 14, 32)

    doc.setFontSize(20)
    doc.setTextColor(40, 40, 40)
    doc.text('ArtBoard', 14, 16)

    doc.setFontSize(9)
    doc.setTextColor(130, 130, 130)
    doc.text('Relatorio de Horas', 14, 23)

    doc.setFontSize(13)
    doc.setTextColor(60, 60, 60)
    doc.text(`${MONTH_NAMES[month - 1]} ${year}`, 14, 30)

    // Total — sem fundo pesado, só texto bold
    doc.setFontSize(11)
    doc.setTextColor(130, 130, 130)
    doc.text('Total:', pageW - 55, 16, { align: 'right' })
    doc.setFontSize(18)
    doc.setTextColor(34, 139, 94)
    doc.text(formatHoursDecimal(totalSeconds), pageW - 14, 16, { align: 'right' })

    // === INFO ===
    const currentUser = filterUser ? users.find(u => u.id === filterUser) : users.find(u => u.id === currentUserId)
    const wsName = filterWorkspace
      ? workspaces.find(w => w.id === filterWorkspace)?.name || '-'
      : workspaces.length > 0 ? workspaces.map(w => w.name).join(', ') : 'Todos'

    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    let infoY = 40
    doc.text(`Colaborador: ${currentUser?.name || 'Todos'}`, 14, infoY)
    doc.text(`Workspace: ${wsName}`, 14, infoY + 5)
    doc.text(`Gerado: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageW - 14, infoY, { align: 'right' })

    // === RESUMO POR BOARD — tabela limpa ===
    const byBoard: Record<string, { name: string; seconds: number; cards: number }> = {}
    for (const entry of entries) {
      const boardName = entry.cards?.lists?.boards?.name || 'Sem board'
      if (!byBoard[boardName]) byBoard[boardName] = { name: boardName, seconds: 0, cards: 0 }
      byBoard[boardName].seconds += entry.duration_seconds || 0
      byBoard[boardName].cards++
    }

    const boardSummary = Object.values(byBoard).sort((a, b) => b.seconds - a.seconds)

    if (boardSummary.length > 0) {
      autoTable(doc, {
        startY: infoY + 12,
        head: [['Board', 'Registros', 'Horas', '%']],
        body: boardSummary.map(b => [
          b.name,
          String(b.cards),
          formatHoursDecimal(b.seconds),
          totalSeconds > 0 ? `${Math.round((b.seconds / totalSeconds) * 100)}%` : '0%',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [245, 245, 245], textColor: [80, 80, 80], fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
        bodyStyles: { textColor: [60, 60, 60], fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { cellWidth: 80 },
          2: { halign: 'right', fontStyle: 'bold', textColor: [34, 139, 94] },
          3: { halign: 'right', textColor: [130, 130, 130] },
        },
        margin: { left: 14, right: 14 },
      })
    }

    // === TABELA DETALHADA ===
    const detailStartY = (doc as any).lastAutoTable?.finalY + 8 || infoY + 40

    // Agrupar por dia
    const byDay: Record<string, any[]> = {}
    for (const entry of entries) {
      const day = new Date(entry.started_at).toLocaleDateString('pt-BR')
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(entry)
    }

    const tableData: any[] = []
    for (const [day, dayEntries] of Object.entries(byDay)) {
      const dayTotal = dayEntries.reduce((s: number, e: any) => s + (e.duration_seconds || 0), 0)
      // Header do dia
      tableData.push([{
        content: `${day}  —  ${formatHoursDecimal(dayTotal)}`,
        colSpan: 6,
        styles: { fillColor: [235, 237, 240], textColor: [50, 50, 50], fontStyle: 'bold', fontSize: 9 },
      }])
      // Entries do dia
      for (const entry of dayEntries) {
        const card = entry.cards
        const list = card?.lists
        const board = list?.boards
        const startedAt = new Date(entry.started_at)
        const stoppedAt = entry.stopped_at ? new Date(entry.stopped_at) : null
        const userName = users.find(u => u.id === entry.user_id)?.name || 'Usuario'
        tableData.push([
          userName,
          board?.name || '-',
          `${list?.name || '-'} > ${card?.name || '-'}`,
          startedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          stoppedAt ? stoppedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-',
          formatTime(entry.duration_seconds || 0),
        ])
      }
    }

    autoTable(doc, {
      startY: detailStartY,
      head: [['Colaborador', 'Board', 'Task', 'Inicio', 'Fim', 'Duracao']],
      body: tableData,
      foot: [['', '', '', '', 'TOTAL', formatTime(totalSeconds)]],
      theme: 'striped',
      headStyles: { fillColor: [245, 245, 245], textColor: [80, 80, 80], fontSize: 8, fontStyle: 'bold', cellPadding: 4 },
      bodyStyles: { textColor: [60, 60, 60], fontSize: 8, cellPadding: 3 },
      footStyles: { fillColor: [245, 245, 245], textColor: [34, 139, 94], fontStyle: 'bold', fontSize: 10, cellPadding: 5 },
      alternateRowStyles: { fillColor: [252, 252, 252] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40 },
        2: { cellWidth: 'auto' },
        5: { halign: 'right', fontStyle: 'bold', textColor: [34, 139, 94] },
      },
      margin: { left: 14, right: 14 },
      styles: { overflow: 'linebreak', lineColor: [230, 230, 230], lineWidth: 0.3 },
    })

    // === FOOTER ===
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(160, 160, 160)
      doc.text(`ArtBoard Timesheet  |  ${MONTH_NAMES[month - 1]} ${year}  |  Pagina ${i}/${pageCount}`, pageW / 2, pageH - 8, { align: 'center' })
    }

    doc.save(`timesheet-${year}-${String(month).padStart(2, '0')}.pdf`)
  }

  // Resumo por dia da semana
  const byDayOfWeek: Record<number, number> = {}
  for (const entry of entries) {
    const day = new Date(entry.started_at).getDay()
    byDayOfWeek[day] = (byDayOfWeek[day] || 0) + (entry.duration_seconds || 0)
  }

  const maxDaySeconds = Math.max(...Object.values(byDayOfWeek), 1)

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: '#1D2125' }}>
      <div className="mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Clock className="w-7 h-7 text-[#579DFF]" />
            <h1 className="text-2xl font-bold text-[#DEE4EA]">Timesheet</h1>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="px-5 py-3 rounded-xl text-center"
              style={{ backgroundColor: '#22272B' }}
            >
              <p className="text-xs text-[#9FADBC] uppercase font-semibold mb-1">Total do mes</p>
              <p className="text-2xl font-bold text-[#4BCE97] font-mono">{formatHoursDecimal(totalSeconds)}</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#22272B', color: '#B6C2CF' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#A1BDD914' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#22272B' }}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#22272B', color: '#B6C2CF' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#A1BDD914' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#22272B' }}
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </button>
          </div>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-lg hover:bg-[#A1BDD914] transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#9FADBC]" />
          </button>
          <h2 className="text-lg font-semibold text-[#DEE4EA] min-w-[200px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 rounded-lg hover:bg-[#A1BDD914] transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[#9FADBC]" />
          </button>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 mb-6">
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

          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
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
            <option value="">Todos os colaboradores</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Resumo por dia da semana */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{ backgroundColor: '#22272B' }}
        >
          <h3 className="text-xs font-semibold text-[#9FADBC] uppercase mb-4">Horas por dia da semana</h3>
          <div className="grid grid-cols-7 gap-3">
            {DAY_NAMES.map((name, i) => {
              const seconds = byDayOfWeek[i] || 0
              const pct = maxDaySeconds > 0 ? (seconds / maxDaySeconds) * 100 : 0
              return (
                <div key={i} className="text-center">
                  <p className="text-[11px] text-[#738496] mb-2">{name}</p>
                  <div className="h-16 flex items-end justify-center mb-1">
                    <div
                      className="w-6 rounded-t"
                      style={{
                        height: `${Math.max(pct, 4)}%`,
                        backgroundColor: seconds > 0 ? '#579DFF' : '#A1BDD914',
                      }}
                    />
                  </div>
                  <p className="text-[11px] font-medium text-[#B6C2CF]">
                    {seconds > 0 ? formatHoursDecimal(seconds) : '-'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tabela */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#22272B' }}>
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-sm text-[#738496]">Carregando...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Clock className="w-10 h-10 text-[#579DFF] opacity-40 mb-3" />
              <p className="text-sm text-[#9FADBC]">Nenhum registro de tempo neste mes</p>
              <p className="text-xs text-[#738496] mt-1">Inicie o timer em um card para comecar</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(166, 197, 226, 0.08)' }}>
                  <th className="text-left text-[11px] font-semibold text-[#9FADBC] uppercase px-4 py-3">Data</th>
                  <th className="text-left text-[11px] font-semibold text-[#9FADBC] uppercase px-4 py-3">Board</th>
                  <th className="text-left text-[11px] font-semibold text-[#9FADBC] uppercase px-4 py-3">Lista</th>
                  <th className="text-left text-[11px] font-semibold text-[#9FADBC] uppercase px-4 py-3">Card</th>
                  <th className="text-left text-[11px] font-semibold text-[#9FADBC] uppercase px-4 py-3">Inicio</th>
                  <th className="text-left text-[11px] font-semibold text-[#9FADBC] uppercase px-4 py-3">Fim</th>
                  <th className="text-right text-[11px] font-semibold text-[#9FADBC] uppercase px-4 py-3">Duracao</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry: any) => {
                  const card = entry.cards
                  const list = card?.lists
                  const board = list?.boards
                  const startedAt = new Date(entry.started_at)
                  const stoppedAt = entry.stopped_at ? new Date(entry.stopped_at) : null

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-[#A1BDD90A] transition-colors"
                      style={{ borderBottom: '1px solid rgba(166, 197, 226, 0.04)' }}
                    >
                      <td className="px-4 py-2.5 text-sm text-[#B6C2CF]">
                        {startedAt.toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-[#B6C2CF]">
                        {board?.name || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-[#B6C2CF]">
                        {list?.name || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-[#DEE4EA] font-medium">
                        {card?.name || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-[#B6C2CF]">
                        {startedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-[#B6C2CF]">
                        {stoppedAt ? stoppedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-right font-mono font-medium text-[#4BCE97]">
                        {formatTime(entry.duration_seconds || 0)}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1 rounded hover:bg-[#F8716820] transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-[#F87168]" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '1px solid rgba(166, 197, 226, 0.12)' }}>
                  <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-[#DEE4EA]">
                    Total
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono font-bold text-[#4BCE97]">
                    {formatTime(totalSeconds)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
