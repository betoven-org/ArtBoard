'use client'

import { useState } from 'react'
import type { Card, Label, ListWithCards } from '@/types/database'
import { Clock, ArrowUp, ArrowDown, Minus, ChevronUp, ChevronDown } from 'lucide-react'

function priorityOrder(p: string | null) {
  if (!p) return 99
  return { critical: 0, high: 1, medium: 2, low: 3 }[p] ?? 99
}

export function ListView({
  lists,
  labels,
  onCardClick,
  cardFilter,
  boardMembers = [],
}: {
  lists: ListWithCards[]
  labels: Label[]
  onCardClick: (cardId: string) => void
  cardFilter?: (card: Card) => boolean
  boardMembers?: Array<{ user_id: string; role: string; name?: string; email?: string }>
}) {
  const [sortBy, setSortBy] = useState<string>('position')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const allCards = lists.flatMap((list) =>
    list.cards.map((card) => ({ ...card, listName: list.name }))
  )

  const sortedCards = [...allCards].sort((a, b) => {
    let va: string | number, vb: string | number
    switch (sortBy) {
      case 'name': va = a.name; vb = b.name; break
      case 'priority': va = priorityOrder(a.priority); vb = priorityOrder(b.priority); break
      case 'due_date': va = a.due_date || ''; vb = b.due_date || ''; break
      case 'estimated_hours': va = a.estimated_hours || 0; vb = b.estimated_hours || 0; break
      case 'listName': va = a.listName; vb = b.listName; break
      default: va = a.position; vb = b.position
    }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  if (allCards.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#9FADBC]">
        Nenhum card encontrado
      </div>
    )
  }

  function SortHeader({ label, field }: { label: string; field: string }) {
    const active = sortBy === field
    return (
      <th
        onClick={() => { setSortBy(field); setSortDir(active && sortDir === 'asc' ? 'desc' : 'asc') }}
        className="px-4 py-3 cursor-pointer hover:bg-[#A1BDD914] select-none"
      >
        <div className="flex items-center gap-1">
          <span>{label}</span>
          {active && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
        </div>
      </th>
    )
  }

  return (
    <div className="bg-[#1D2125] rounded-xl overflow-hidden border border-[#A6C5E229]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#A6C5E229] bg-[#282E33] text-left text-xs font-semibold text-[#9FADBC] uppercase">
            <SortHeader label="Card" field="name" />
            <SortHeader label="Lista" field="listName" />
            <SortHeader label="Prioridade" field="priority" />
            <th className="px-4 py-3">Responsavel</th>
            <SortHeader label="Data limite" field="due_date" />
            <th className="px-4 py-3">Status</th>
            <SortHeader label="Estimativa" field="estimated_hours" />
          </tr>
        </thead>
        <tbody>
          {sortedCards.map((card) => {
            const cardLabels = labels.filter((l) =>
              card.card_labels?.some((cl) => cl.label_id === l.id)
            )

            return (
              <tr
                key={card.id}
                onClick={() => onCardClick(card.id)}
                className={`border-b border-[#A6C5E229] last:border-0 hover:bg-[#A1BDD914] cursor-pointer transition-all ${
                  cardFilter && !cardFilter(card) ? 'opacity-40' : ''
                }`}
              >
                {/* Card name */}
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#DEE4EA]">{card.name}</p>
                    {card.description && (
                      <p className="text-xs text-[#8C9BAB] mt-0.5 truncate max-w-md">
                        {card.description}
                      </p>
                    )}
                  </div>
                </td>

                {/* Lista */}
                <td className="px-4 py-3">
                  <span className="text-xs bg-[#22272B] text-[#B6C2CF] px-2 py-1 rounded">
                    {card.listName}
                  </span>
                </td>

                {/* Prioridade */}
                <td className="px-4 py-3">
                  {card.priority && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium">
                      {card.priority === 'critical' && <><ArrowUp className="w-3.5 h-3.5 text-[#F87168]" /><span className="text-[#F87168]">Critical</span></>}
                      {card.priority === 'high' && <><ArrowUp className="w-3.5 h-3.5 text-[#FF9F1A]" /><span className="text-[#FF9F1A]">High</span></>}
                      {card.priority === 'medium' && <><Minus className="w-3.5 h-3.5 text-[#F5CD47]" /><span className="text-[#F5CD47]">Medium</span></>}
                      {card.priority === 'low' && <><ArrowDown className="w-3.5 h-3.5 text-[#579DFF]" /><span className="text-[#579DFF]">Low</span></>}
                    </span>
                  )}
                </td>

                {/* Responsavel */}
                <td className="px-4 py-3">
                  {card.card_members && card.card_members.length > 0 ? (
                    <div className="flex -space-x-1">
                      {card.card_members.slice(0, 3).map((m: { user_id: string }) => {
                        const member = boardMembers.find((bm) => bm.user_id === m.user_id)
                        const displayName = member?.name || member?.email || 'Usuario'
                        const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                        return (
                          <div
                            key={m.user_id}
                            className="w-6 h-6 rounded-full bg-[#579DFF] flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-[#1D2125]"
                            title={displayName}
                          >
                            {initials}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-[#738496]">-</span>
                  )}
                </td>

                {/* Data limite */}
                <td className="px-4 py-3">
                  {card.due_date ? (
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                        card.due_complete
                          ? 'bg-[#1F845A] text-white'
                          : new Date(card.due_date) < new Date()
                          ? 'bg-[#C9372C] text-white'
                          : 'text-[#8C9BAB]'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {new Date(card.due_date).toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  ) : (
                    <span className="text-xs text-[#738496]">-</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  {card.due_complete ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-[#1F845A] text-white font-medium">
                      Concluido
                    </span>
                  ) : card.due_date && new Date(card.due_date) < new Date() ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-[#C9372C] text-white font-medium">
                      Atrasado
                    </span>
                  ) : (
                    <span className="text-xs text-[#8C9BAB]">Em andamento</span>
                  )}
                </td>

                {/* Estimativa */}
                <td className="px-4 py-3">
                  {card.estimated_hours ? (
                    <span className="text-xs text-[#B6C2CF]">{card.estimated_hours}h</span>
                  ) : (
                    <span className="text-xs text-[#738496]">-</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
