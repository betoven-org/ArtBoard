'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Card, Label, ListWithCards } from '@/types/database'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function CalendarView({
  lists,
  labels,
  onCardClick,
  cardFilter,
}: {
  lists: ListWithCards[]
  labels: Label[]
  onCardClick: (cardId: string) => void
  cardFilter?: (card: Card) => boolean
}) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const cardsWithDates = useMemo(() => {
    return lists
      .flatMap((list) =>
        list.cards
          .filter((card) => card.due_date)
          .map((card) => ({ ...card, listName: list.name }))
      )
  }, [lists])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const today = new Date()

  function getCardsForDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return cardsWithDates.filter((card) => {
      const cardDate = card.due_date!.split('T')[0]
      return cardDate === dateStr
    })
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  function goToday() {
    setCurrentDate(new Date())
  }

  const cells = []

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="bg-[#1D2125] min-h-[100px] border-b border-r border-[#A6C5E229]" />)
  }

  // Days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCards = getCardsForDay(day)
    const isToday =
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()

    cells.push(
      <div
        key={day}
        className="bg-[#22272B] min-h-[100px] border-b border-r border-[#A6C5E229] p-1"
      >
        <span
          className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-1 ${
            isToday
              ? 'bg-[#579DFF] text-[#1D2125]'
              : 'text-[#B6C2CF]'
          }`}
        >
          {day}
        </span>
        <div className="space-y-0.5">
          {dayCards.map((card) => {
            const cardLabels = labels.filter((l) =>
              card.card_labels?.some((cl) => cl.label_id === l.id)
            )

            return (
              <button
                key={card.id}
                onClick={() => onCardClick(card.id)}
                className={`w-full text-left text-xs px-1.5 py-1 rounded truncate transition-all ${
                  cardFilter && !cardFilter(card) ? 'opacity-40 ' : ''
                }${
                  card.due_complete
                    ? 'bg-[#1F845A]/30 text-[#7EE2B8] hover:bg-[#1F845A]/50'
                    : new Date(card.due_date!) < today
                    ? 'bg-[#C9372C]/30 text-[#FD9891] hover:bg-[#C9372C]/50'
                    : 'bg-[#579DFF]/20 text-[#85B8FF] hover:bg-[#579DFF]/30'
                }`}
                title={`${card.name} (${card.listName})`}
              >
                {cardLabels.length > 0 && (
                  <span className="flex gap-0.5 mb-0.5">
                    {cardLabels.map((l) => (
                      <span
                        key={l.id}
                        className="w-3 h-1 rounded-full inline-block"
                        style={{ backgroundColor: l.color }}
                      />
                    ))}
                  </span>
                )}
                {card.name}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Fill remaining cells
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let i = 0; i < remaining; i++) {
      cells.push(<div key={`end-${i}`} className="bg-[#1D2125] min-h-[100px] border-b border-r border-[#A6C5E229]" />)
    }
  }

  return (
    <div className="bg-[#1D2125] rounded-xl overflow-hidden border border-[#A6C5E229]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#A6C5E229]">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1 hover:bg-[#A1BDD914] rounded">
            <ChevronLeft className="w-5 h-5 text-[#9FADBC]" />
          </button>
          <h3 className="text-sm font-semibold text-[#DEE4EA] min-w-[160px] text-center">
            {MONTHS[month]} {year}
          </h3>
          <button onClick={nextMonth} className="p-1 hover:bg-[#A1BDD914] rounded">
            <ChevronRight className="w-5 h-5 text-[#9FADBC]" />
          </button>
        </div>
        <button
          onClick={goToday}
          className="text-xs text-[#579DFF] hover:text-[#85B8FF] font-medium"
        >
          Hoje
        </button>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-[#9FADBC] py-2 border-b border-r border-[#A6C5E229] bg-[#282E33]"
          >
            {day}
          </div>
        ))}
        {cells}
      </div>
    </div>
  )
}
