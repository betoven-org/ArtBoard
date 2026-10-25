'use client'

import { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BoardCard } from './board-card'
import { createCard } from '@/lib/actions/card'
import { updateList, archiveList } from '@/lib/actions/list'
import type { Card, Label, ListWithCards } from '@/types/database'
import { MoreHorizontal, Plus, X, Archive } from 'lucide-react'

export function BoardList({
  list,
  onCardClick,
  onListUpdate,
  labels,
  autoAddCard,
  onAutoAddCardDone,
  cardFilter,
}: {
  list: ListWithCards
  onCardClick: (cardId: string) => void
  onListUpdate: (id: string, updates: Partial<ListWithCards>) => void
  labels: Label[]
  autoAddCard?: boolean
  onAutoAddCardDone?: () => void
  cardFilter?: (card: Card) => boolean
}) {
  const [addingCard, setAddingCard] = useState(false)
  const [newCardName, setNewCardName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [listName, setListName] = useState(list.name)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    if (autoAddCard) {
      setAddingCard(true)
      onAutoAddCardDone?.()
    }
  }, [autoAddCard])

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: { type: 'list', list },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault()
    if (!newCardName.trim()) return
    const card = await createCard(list.id, newCardName.trim())
    onListUpdate(list.id, {
      cards: [...list.cards, { ...card, card_labels: [], card_members: [] }],
    })
    setNewCardName('')
  }

  async function handleRename() {
    if (listName.trim() && listName !== list.name) {
      await updateList(list.id, { name: listName.trim() })
      onListUpdate(list.id, { name: listName.trim() })
    }
    setEditingName(false)
  }

  async function handleArchive() {
    await archiveList(list.id)
    onListUpdate(list.id, { closed: true })
    setShowMenu(false)
  }

  return (
    <div
      ref={setNodeRef}
      className="w-[272px] shrink-0 rounded-xl flex flex-col max-h-[calc(100vh-140px)] p-1.5 group/list"
      style={{
        ...style,
        background: 'rgba(16, 18, 4, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      } as React.CSSProperties}
    >
      <div
        {...attributes}
        {...listeners}
        className="px-3 py-2.5 flex items-center justify-between cursor-grab active:cursor-grabbing min-h-[36px]"
      >
        {editingName ? (
          <input
            autoFocus
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            className="font-semibold text-sm text-[#DEE4EA] bg-[#22272B] rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-[#579DFF] transition-colors duration-150"
          />
        ) : (
          <div className="flex items-center gap-2">
            <h3
              onClick={() => setEditingName(true)}
              className="font-semibold text-sm text-[#DEE4EA] cursor-pointer px-1"
            >
              {list.name}
            </h3>
            {list.cards.length > 0 && (
              <span className="text-xs text-[#8C9BAB] font-normal">
                {list.cards.length}
              </span>
            )}
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`p-1 hover:bg-[#A1BDD914] rounded transition-all duration-150 ${showMenu ? 'opacity-100' : 'opacity-0 group-hover/list:opacity-100'}`}
          >
            <MoreHorizontal className="w-4 h-4 text-[#9FADBC]" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
              <div
                className="absolute right-0 top-8 w-48 rounded-lg py-1 z-50 border border-[#A6C5E229]"
                style={{
                  background: '#282E33',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                } as React.CSSProperties}
              >
                <button
                  onClick={handleArchive}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#B6C2CF] hover:bg-[#A1BDD914] transition-colors duration-150"
                >
                  <Archive className="w-4 h-4" />
                  Arquivar lista
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-0.5 pb-0.5 flex flex-col gap-2">
        <SortableContext
          items={list.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {list.cards.map((card) => (
            <div
              key={card.id}
              className={cardFilter && !cardFilter(card) ? 'opacity-40 transition-opacity' : 'transition-opacity'}
            >
              <BoardCard
                card={card}
                listId={list.id}
                onClick={() => onCardClick(card.id)}
                labels={labels}
              />
            </div>
          ))}
        </SortableContext>
      </div>

      <div className="px-0.5 pb-0.5 pt-1">
        {addingCard ? (
          <form onSubmit={handleAddCard}>
            <textarea
              autoFocus
              value={newCardName}
              onChange={(e) => setNewCardName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddCard(e)
                }
              }}
              placeholder="Título do card..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm border-0 bg-[#22272B] text-[#B6C2CF] placeholder-[#8C9BAB] focus:outline-none focus:ring-1 focus:ring-[#579DFF] resize-none"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#579DFF] text-[#1D2125] text-sm font-semibold rounded-lg hover:bg-[#85B8FF]"
              >
                Adicionar
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingCard(false)
                  setNewCardName('')
                }}
                className="p-1.5 text-[#9FADBC] hover:text-[#DEE4EA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="w-full flex items-center gap-1 px-3 py-1.5 text-sm text-[#9FADBC] hover:bg-[#A1BDD914] rounded-lg transition-colors duration-150"
          >
            <Plus className="w-4 h-4" />
            Adicionar um cartão
          </button>
        )}
      </div>
    </div>
  )
}
