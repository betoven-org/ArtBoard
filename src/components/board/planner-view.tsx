'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import type { Card, Label, ListWithCards } from '@/types/database'

const DAY_WIDTH = 40
const ROW_HEIGHT = 36
const HEADER_HEIGHT = 48

function getDaysBetween(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function formatMonth(date: Date) {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function PlannerView({
  lists,
  labels,
  onCardClick,
}: {
  lists: ListWithCards[]
  labels: Label[]
  onCardClick: (cardId: string) => void
}) {
  const today = new Date()
  const [offset, setOffset] = useState(0) // semanas de offset

  // Range de 6 semanas centrado no offset
  const startDate = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() - d.getDay() + offset * 7 - 7) // inicio da semana anterior
    d.setHours(0, 0, 0, 0)
    return d
  }, [offset])

  const totalDays = 42 // 6 semanas
  const endDate = useMemo(() => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + totalDays)
    return d
  }, [startDate])

  // Cards com due_date no range
  const cardsWithDates = useMemo(() => {
    return lists.flatMap((list) =>
      list.cards
        .filter((card) => card.due_date)
        .map((card) => ({
          ...card,
          listName: list.name,
          dueDate: new Date(card.due_date!),
        }))
    ).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
  }, [lists])

  // Gerar dias do header
  const days = useMemo(() => {
    const result = []
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      result.push(d)
    }
    return result
  }, [startDate])

  // Agrupar dias por mês pra header
  const months = useMemo(() => {
    const result: { label: string; days: number; start: number }[] = []
    let current = ''
    let count = 0
    let start = 0
    for (let i = 0; i < days.length; i++) {
      const m = formatMonth(days[i])
      if (m !== current) {
        if (current) result.push({ label: current, days: count, start })
        current = m
        count = 1
        start = i
      } else {
        count++
      }
    }
    if (current) result.push({ label: current, days: count, start })
    return result
  }, [days])

  const todayIndex = getDaysBetween(startDate, today)

  // Cards agrupados por lista pra exibir como rows
  const rows = useMemo(() => {
    return lists
      .filter((list) => list.cards.some((c) => c.due_date))
      .map((list) => ({
        listName: list.name,
        cards: list.cards
          .filter((c) => c.due_date)
          .map((c) => {
            const dueDate = new Date(c.due_date!)
            const dayIndex = getDaysBetween(startDate, dueDate)
            const cardLabels = labels.filter((l) =>
              c.card_labels?.some((cl) => cl.label_id === l.id)
            )
            return { ...c, dayIndex, cardLabels }
          })
          .sort((a, b) => a.dayIndex - b.dayIndex),
      }))
  }, [lists, startDate, labels])

  return (
    <div className="rounded-xl overflow-hidden border border-[#A6C5E229]" style={{ background: '#1D2125' }}>
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#A6C5E229]" style={{ background: '#282E33' }}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOffset(offset - 2)}
            className="p-1 hover:bg-[#A1BDD914] rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[#9FADBC]" />
          </button>
          <button
            onClick={() => setOffset(0)}
            className="px-3 py-1 text-xs font-medium rounded hover:bg-[#A1BDD914] transition-colors"
            style={{ color: '#579DFF' }}
          >
            Hoje
          </button>
          <button
            onClick={() => setOffset(offset + 2)}
            className="p-1 hover:bg-[#A1BDD914] rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-[#9FADBC]" />
          </button>
        </div>
        <span className="text-sm font-medium" style={{ color: '#DEE4EA' }}>
          {formatMonth(days[Math.floor(totalDays / 2)])}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: totalDays * DAY_WIDTH + 160 }}>
          {/* Month header */}
          <div className="flex" style={{ borderBottom: '1px solid rgba(166, 197, 226, 0.16)' }}>
            <div style={{ width: 160, flexShrink: 0, padding: '8px 12px' }} />
            {months.map((m) => (
              <div
                key={m.label + m.start}
                style={{
                  width: m.days * DAY_WIDTH,
                  padding: '6px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#9FADBC',
                  textTransform: 'capitalize',
                  borderLeft: '1px solid rgba(166, 197, 226, 0.08)',
                }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Day header */}
          <div className="flex" style={{ borderBottom: '1px solid rgba(166, 197, 226, 0.16)' }}>
            <div style={{ width: 160, flexShrink: 0, padding: '4px 12px', fontSize: 11, color: '#8C9BAB', fontWeight: 600 }}>
              LISTA
            </div>
            {days.map((d, i) => {
              const isToday = i === todayIndex
              const isWeekend = d.getDay() === 0 || d.getDay() === 6
              return (
                <div
                  key={i}
                  style={{
                    width: DAY_WIDTH,
                    padding: '4px 0',
                    fontSize: 11,
                    textAlign: 'center',
                    color: isToday ? '#579DFF' : isWeekend ? '#738496' : '#8C9BAB',
                    fontWeight: isToday ? 700 : 400,
                    borderLeft: d.getDay() === 1 ? '1px solid rgba(166, 197, 226, 0.12)' : 'none',
                  }}
                >
                  <div>{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][d.getDay()]}</div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: isToday ? 700 : 500,
                    marginTop: 1,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isToday ? '#579DFF' : 'transparent',
                    color: isToday ? '#1D2125' : undefined,
                  }}>
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Rows por lista */}
          {rows.length === 0 ? (
            <div className="flex items-center justify-center py-16" style={{ color: '#8C9BAB' }}>
              <div className="text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum card com data de entrega</p>
                <p className="text-xs mt-1 opacity-70">Adicione datas aos cards para vê-los no planejador</p>
              </div>
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.listName}>
                {/* List name row */}
                <div
                  className="flex"
                  style={{
                    borderBottom: '1px solid rgba(166, 197, 226, 0.08)',
                    background: 'rgba(40, 46, 51, 0.5)',
                  }}
                >
                  <div style={{
                    width: 160,
                    flexShrink: 0,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#DEE4EA',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {row.listName}
                  </div>
                  <div style={{ flex: 1, position: 'relative', height: ROW_HEIGHT }}>
                    {/* Today line */}
                    {todayIndex >= 0 && todayIndex < totalDays && (
                      <div style={{
                        position: 'absolute',
                        left: todayIndex * DAY_WIDTH + DAY_WIDTH / 2,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        background: '#579DFF',
                        zIndex: 5,
                        opacity: 0.4,
                      }} />
                    )}
                  </div>
                </div>

                {/* Card rows */}
                {row.cards.map((card) => (
                  <div
                    key={card.id}
                    className="flex hover:bg-[#A1BDD914] cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid rgba(166, 197, 226, 0.06)' }}
                    onClick={() => onCardClick(card.id)}
                  >
                    <div style={{
                      width: 160,
                      flexShrink: 0,
                      padding: '6px 12px 6px 24px',
                      fontSize: 13,
                      color: '#B6C2CF',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      {card.cardLabels.length > 0 && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: card.cardLabels[0].color,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {card.name}
                      </span>
                    </div>
                    <div style={{ flex: 1, position: 'relative', height: ROW_HEIGHT }}>
                      {/* Card bar */}
                      {card.dayIndex >= 0 && card.dayIndex < totalDays && (
                        <div
                          style={{
                            position: 'absolute',
                            left: card.dayIndex * DAY_WIDTH + 4,
                            top: 6,
                            height: ROW_HEIGHT - 12,
                            minWidth: DAY_WIDTH - 8,
                            maxWidth: DAY_WIDTH * 3,
                            borderRadius: 6,
                            background: card.due_complete
                              ? '#4BCE97'
                              : new Date(card.due_date!) < today
                              ? '#F87168'
                              : card.cardLabels[0]?.color || '#579DFF',
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: 6,
                            paddingRight: 6,
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#1D2125',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {new Date(card.due_date!).getDate()}/{new Date(card.due_date!).getMonth() + 1}
                        </div>
                      )}

                      {/* Today line */}
                      {todayIndex >= 0 && todayIndex < totalDays && (
                        <div style={{
                          position: 'absolute',
                          left: todayIndex * DAY_WIDTH + DAY_WIDTH / 2,
                          top: 0,
                          bottom: 0,
                          width: 2,
                          background: '#579DFF',
                          zIndex: 5,
                          opacity: 0.4,
                        }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
