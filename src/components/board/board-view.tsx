'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { BoardList } from './board-list'
import { BoardCard } from './board-card'
import { ListView } from './list-view'
import { CalendarView } from './calendar-view'
import { PlannerView } from './planner-view'
import { CardDetailModal } from '@/components/card/card-detail-modal'
import { createList } from '@/lib/actions/list'
import { moveCard, updateCard } from '@/lib/actions/card'
import { updateList } from '@/lib/actions/list'
import { createClient } from '@/lib/supabase/client'
import type { Card, Label, ListWithCards, Sprint } from '@/types/database'
import { toggleStar } from '@/lib/actions/star'
import { deleteBoard, duplicateBoard, updateBoardBackground, updateBoardName, updateBoardDescription } from '@/lib/actions/board'
import { getArchivedCards, restoreCard } from '@/lib/actions/card'
import { getArchivedLists, restoreList } from '@/lib/actions/list'
import { getBoardMembers, inviteMember } from '@/lib/actions/member'
import { Plus, X, LayoutGrid, List, Calendar, Star, Filter, Share2, MoreHorizontal, Info, Palette, Archive, Tag, Check, Search, Copy, Mail, Image as ImageIcon, Zap, Trash2, Activity, Settings, RotateCcw } from 'lucide-react'
import { uploadImage } from '@/lib/upload'
import { getAutomations, createAutomation, toggleAutomation, deleteAutomation, executeAutomations } from '@/lib/actions/automation'
import { getSavedFilters, saveFilter, deleteFilter } from '@/lib/actions/filter'
import { getBoardActivity } from '@/lib/actions/activity'
import { getSprints, createSprint, updateSprint, deleteSprint } from '@/lib/actions/sprint'
import { Target } from 'lucide-react'
import { getCustomFields, createCustomField, deleteCustomField } from '@/lib/actions/custom-field'

type BoardData = {
  id: string
  name: string
  background: string
  workspace_id: string
  description?: string | null
  lists: ListWithCards[]
}

export function BoardView({
  board: initialBoard,
  labels,
  initialStarred = false,
}: {
  board: BoardData
  labels: Label[]
  initialStarred?: boolean
}) {
  const [lists, setLists] = useState(initialBoard.lists)
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [addingList, setAddingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar' | 'planner'>('kanban')
  const [starred, setStarred] = useState(initialStarred)
  const [starLoading, setStarLoading] = useState(false)
  const [showBoardMenu, setShowBoardMenu] = useState(false)
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [boardBackground, setBoardBackground] = useState(initialBoard.background)
  const [addingCardToFirstList, setAddingCardToFirstList] = useState(false)
  const [editingBoardName, setEditingBoardName] = useState(false)
  const [boardName, setBoardName] = useState(initialBoard.name)
  const [editingBoardDesc, setEditingBoardDesc] = useState(false)
  const [boardDescription, setBoardDescription] = useState(initialBoard.description || '')

  // Filter state
  const [showFilter, setShowFilter] = useState(false)
  const [filterLabel, setFilterLabel] = useState<string | null>(null)
  const [filterDue, setFilterDue] = useState<'overdue' | 'soon' | 'none' | null>(null)
  const [filterText, setFilterText] = useState('')
  const filterRef = useRef<HTMLDivElement>(null)

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState('')
  const [members, setMembers] = useState<{ user_id: string; role: string; name?: string; email?: string }[]>([])
  const [linkCopied, setLinkCopied] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [uploadingBg, setUploadingBg] = useState(false)

  // Automations state
  const [showAutomations, setShowAutomations] = useState(false)
  const [automations, setAutomations] = useState<any[]>([])
  const [autoName, setAutoName] = useState('')
  const [autoTrigger, setAutoTrigger] = useState('card_moved_to_list')
  const [autoTriggerListId, setAutoTriggerListId] = useState('')
  const [autoAction, setAutoAction] = useState('mark_complete')
  const [autoActionValue, setAutoActionValue] = useState('')
  const [autoLoading, setAutoLoading] = useState(false)

  // Saved filters state
  const [savedFilters, setSavedFilters] = useState<any[]>([])
  const [saveFilterName, setSaveFilterName] = useState('')
  const [showSaveFilter, setShowSaveFilter] = useState(false)

  // Activity log state
  const [showActivity, setShowActivity] = useState(false)
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  // Custom fields state
  const [showCustomFields, setShowCustomFields] = useState(false)
  const [customFields, setCustomFields] = useState<any[]>([])
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState('text')
  const [newFieldOptions, setNewFieldOptions] = useState('')
  const [cfLoading, setCfLoading] = useState(false)

  // Sprints state
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [showSprints, setShowSprints] = useState(false)
  const [newSprintName, setNewSprintName] = useState('')
  const [newSprintStart, setNewSprintStart] = useState('')
  const [newSprintEnd, setNewSprintEnd] = useState('')
  const [newSprintGoal, setNewSprintGoal] = useState('')
  const [sprintLoading, setSprintLoading] = useState(false)

  // Archived items state
  const [showArchived, setShowArchived] = useState(false)
  const [archivedCards, setArchivedCards] = useState<{ id: string; name: string; list_id: string; list_name: string }[]>([])
  const [archivedLists, setArchivedLists] = useState<{ id: string; name: string }[]>([])
  const [archivedLoading, setArchivedLoading] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Salvar board recente no localStorage
  useEffect(() => {
    try {
      const recentBoards = JSON.parse(localStorage.getItem('artboard-recent-boards') || '[]')
      const current = { id: initialBoard.id, name: initialBoard.name, background: initialBoard.background }
      const filtered = recentBoards.filter((b: any) => b.id !== current.id)
      const updated = [current, ...filtered].slice(0, 5)
      localStorage.setItem('artboard-recent-boards', JSON.stringify(updated))
    } catch {}
  }, [initialBoard.id, initialBoard.name, initialBoard.background])

  // Carregar sprints do board
  useEffect(() => {
    getSprints(initialBoard.id).then(setSprints).catch(() => {})
  }, [initialBoard.id])

  // Carregar membros do board
  useEffect(() => {
    getBoardMembers(initialBoard.id).then(setMembers).catch(() => {})
  }, [initialBoard.id])

  // Realtime
  useEffect(() => {
    const supabase = createClient()

    const boardListIds = lists.map((l) => l.id)

    const channel = supabase
      .channel(`board-${initialBoard.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards' },
        (payload) => {
          const record = (payload.new || payload.old) as Card & { list_id: string }
          // Filtra: so processa cards que pertencem a listas deste board
          const belongsToBoard = (listId: string) =>
            boardListIds.includes(listId) ||
            lists.some((l) => l.id === listId)

          if (payload.eventType === 'INSERT') {
            const card = payload.new as Card
            if (!belongsToBoard(card.list_id)) return
            setLists((prev) =>
              prev.map((l) =>
                l.id === card.list_id
                  ? { ...l, cards: [...l.cards.filter((c) => c.id !== card.id), { ...card, card_labels: [], card_members: [] }] }
                  : l
              )
            )
          } else if (payload.eventType === 'UPDATE') {
            const card = payload.new as Card
            if (card.closed) {
              setLists((prev) =>
                prev.map((l) => ({
                  ...l,
                  cards: l.cards.filter((c) => c.id !== card.id),
                }))
              )
              return
            }
            setLists((prev) => {
              const wasInBoard = prev.some((l) => l.cards.some((c) => c.id === card.id))
              if (!wasInBoard && !belongsToBoard(card.list_id)) return prev
              return prev.map((l) => ({
                ...l,
                cards: l.id === card.list_id
                  ? [
                      ...l.cards.filter((c) => c.id !== card.id),
                      { ...l.cards.find((c) => c.id === card.id) || card, ...card },
                    ].sort((a, b) => a.position - b.position)
                  : l.cards.filter((c) => c.id !== card.id),
              }))
            })
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as { id: string }
            setLists((prev) =>
              prev.map((l) => ({
                ...l,
                cards: l.cards.filter((c) => c.id !== old.id),
              }))
            )
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lists', filter: `board_id=eq.${initialBoard.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const list = payload.new as ListWithCards
            setLists((prev) => {
              if (prev.some((l) => l.id === list.id)) return prev
              return [...prev, { ...list, cards: [] }].sort((a, b) => a.position - b.position)
            })
          } else if (payload.eventType === 'UPDATE') {
            const list = payload.new as ListWithCards
            if (list.closed) {
              setLists((prev) => prev.filter((l) => l.id !== list.id))
              return
            }
            setLists((prev) =>
              prev.map((l) => (l.id === list.id ? { ...l, ...list } : l))
                .sort((a, b) => a.position - b.position)
            )
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as { id: string }
            setLists((prev) => prev.filter((l) => l.id !== old.id))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => {
          // Comentarios mudaram — se o card detail modal estiver aberto, ele recarrega sozinho
          // Aqui so atualizamos o count de comentarios nos cards (via re-render se necessario)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [initialBoard.id])

  const BOARD_COLORS = [
    '#0079bf', '#d29034', '#519839', '#b04632',
    '#89609e', '#cd5a91', '#4bbf6b', '#00aecc',
    '#7B68EE', '#344563', '#091e42',
  ]

  const BOARD_GRADIENTS = [
    'linear-gradient(135deg, #0079bf, #5067C5)',
    'linear-gradient(135deg, #7B68EE, #E040FB)',
    'linear-gradient(135deg, #00C853, #00BFA5)',
    'linear-gradient(135deg, #FF6F00, #FF3D00)',
  ]

  async function saveBoardName() {
    setEditingBoardName(false)
    if (boardName.trim() && boardName.trim() !== initialBoard.name) {
      await updateBoardName(initialBoard.id, boardName.trim())
    } else {
      setBoardName(initialBoard.name)
    }
  }

  async function handleChangeBg(bg: string) {
    setBoardBackground(bg)
    await updateBoardBackground(initialBoard.id, bg)
  }

  async function handleToggleStar() {
    if (starLoading) return
    setStarLoading(true)
    setStarred(!starred) // optimistic
    try {
      const result = await toggleStar(initialBoard.id)
      setStarred(result)
    } catch (err) {
      setStarred(starred) // revert
      console.error('Erro ao favoritar:', err)
    } finally {
      setStarLoading(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        if (lists.length > 0) {
          setAddingCardToFirstList(true)
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        setShowFilter(true)
      } else if (e.key === '?') {
        e.preventDefault()
        alert(
          'Atalhos de teclado:\n\n' +
          'N — Novo card na primeira lista\n' +
          'F — Abrir filtros\n' +
          '? — Mostrar atalhos'
        )
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [lists])

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const type = active.data.current?.type

    if (type === 'card') {
      const card = active.data.current?.card as Card
      setActiveCard(card)
    } else if (type === 'list') {
      setActiveListId(active.id as string)
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || active.data.current?.type !== 'card') return

    const activeListId = active.data.current?.listId
    const overType = over.data.current?.type
    const overListId = overType === 'card'
      ? over.data.current?.listId
      : over.id

    if (activeListId === overListId) return

    setLists((prev) => {
      const card = prev
        .flatMap((l) => l.cards)
        .find((c) => c.id === active.id)
      if (!card) return prev

      return prev.map((l) => {
        if (l.id === activeListId) {
          return { ...l, cards: l.cards.filter((c) => c.id !== active.id) }
        }
        if (l.id === overListId) {
          const overIndex = overType === 'card'
            ? l.cards.findIndex((c) => c.id === over.id)
            : l.cards.length
          const newCards = [...l.cards]
          newCards.splice(overIndex, 0, { ...card, list_id: l.id as string })
          return { ...l, cards: newCards }
        }
        return l
      })
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCard(null)
    setActiveListId(null)

    if (!over) return

    const activeType = active.data.current?.type

    if (activeType === 'list') {
      if (active.id === over.id) return
      const oldIndex = lists.findIndex((l) => l.id === active.id)
      const overType = over.data.current?.type
      const newIndex = overType === 'list'
        ? lists.findIndex((l) => l.id === over.id)
        : lists.length - 1

      const newLists = [...lists]
      const [moved] = newLists.splice(oldIndex, 1)
      newLists.splice(newIndex, 0, moved)

      // Recalcular posições
      const updated = newLists.map((l, i) => ({ ...l, position: (i + 1) * 65536 }))
      setLists(updated)

      for (const l of updated) {
        await updateList(l.id, { position: l.position })
      }
      return
    }

    // Card drag end
    if (activeType === 'card') {
      const targetListId = over.data.current?.type === 'card'
        ? over.data.current?.listId
        : over.id

      const targetList = lists.find((l) => l.id === targetListId)
      if (!targetList) return

      const cardIndex = targetList.cards.findIndex((c) => c.id === active.id)
      const cards = targetList.cards

      let position: number
      if (cards.length <= 1) {
        position = 65536
      } else if (cardIndex === 0) {
        position = cards[1].position / 2
      } else if (cardIndex === cards.length - 1) {
        position = cards[cards.length - 2].position + 65536
      } else {
        position = (cards[cardIndex - 1].position + cards[cardIndex + 1].position) / 2
      }

      const fromListId = active.data.current?.listId
      await moveCard(active.id as string, targetListId as string, position)

      // Executar automacoes quando card muda de lista
      if (fromListId && fromListId !== targetListId) {
        executeAutomations(initialBoard.id, active.id as string, {
          type: 'card_moved_to_list',
          fromListId,
          toListId: targetListId as string,
        }).catch(() => {}) // fire and forget
      }
    }
  }

  // Filter logic
  const hasActiveFilter = filterText !== '' || filterLabel !== null || filterDue !== null

  function cardPassesFilter(card: Card): boolean {
    if (!hasActiveFilter) return true

    // Text filter
    if (filterText && !card.name.toLowerCase().includes(filterText.toLowerCase())) {
      return false
    }

    // Label filter
    if (filterLabel && !card.card_labels?.some((cl) => cl.label_id === filterLabel)) {
      return false
    }

    // Due date filter
    if (filterDue) {
      const now = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(now.getDate() + 7)

      if (filterDue === 'overdue') {
        if (!card.due_date || new Date(card.due_date) >= now || card.due_complete) return false
      } else if (filterDue === 'soon') {
        if (!card.due_date || new Date(card.due_date) < now || new Date(card.due_date) > nextWeek) return false
      } else if (filterDue === 'none') {
        if (card.due_date) return false
      }
    }

    return true
  }

  function clearFilters() {
    setFilterText('')
    setFilterLabel(null)
    setFilterDue(null)
  }

  // Load saved filters when filter popover opens
  useEffect(() => {
    if (showFilter) {
      getSavedFilters().then(setSavedFilters).catch(() => {})
    }
  }, [showFilter])

  // Close filter popover on outside click
  useEffect(() => {
    if (!showFilter) return
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilter])

  // Share modal
  async function handleOpenShare() {
    setShowShareModal(true)
    setShareError('')
    setInviteSuccess('')
    try {
      const data = await getBoardMembers(initialBoard.id)
      setMembers(data)
    } catch {
      // silently fail
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!shareEmail.trim()) return
    setShareLoading(true)
    setShareError('')
    setInviteSuccess('')
    try {
      const result = await inviteMember(initialBoard.id, shareEmail.trim())
      setMembers((prev) => [...prev, { user_id: result.userId, role: 'member' }])
      setInviteSuccess(`${result.email} convidado com sucesso!`)
      setShareEmail('')
    } catch (err: any) {
      setShareError(err.message || 'Erro ao convidar')
    } finally {
      setShareLoading(false)
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/board/${initialBoard.id}`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const [addListLoading, setAddListLoading] = useState(false)
  const [archiveLoading, setArchiveLoading] = useState(false)

  async function handleAddList(e: React.FormEvent) {
    e.preventDefault()
    if (!newListName.trim()) return
    setAddListLoading(true)
    try {
      const list = await createList(initialBoard.id, newListName.trim())
      setLists([...lists, { ...list, cards: [] }])
      setNewListName('')
      setAddingList(false)
    } finally {
      setAddListLoading(false)
    }
  }

  return (
    <div
      className="h-full flex flex-col relative"
      style={{
        background: boardBackground.startsWith('url(')
          ? `${boardBackground} center/cover no-repeat`
          : boardBackground
      }}
    >
      {/* Board header */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{
          background: 'rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {/* Grupo esquerdo: nome + ações do board */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Nome do board */}
          {editingBoardName ? (
            <input
              autoFocus
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              onBlur={saveBoardName}
              onKeyDown={(e) => e.key === 'Enter' && saveBoardName()}
              className="text-xl font-bold text-white bg-[#22272B] rounded-md px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#579DFF]"
              style={{ minWidth: 120 }}
            />
          ) : (
            <h1
              onClick={() => setEditingBoardName(true)}
              className="text-xl font-bold text-white truncate cursor-pointer hover:bg-white/10 rounded-md px-2 py-0.5 transition-colors duration-150"
            >
              {boardName}
            </h1>
          )}

          {/* Separador */}
          <div className="w-px h-5 bg-white/20 mx-1 shrink-0" />

          {/* Estrela */}
          <button
            onClick={handleToggleStar}
            disabled={starLoading}
            className={`p-1.5 rounded-md hover:bg-white/20 transition-colors duration-150 shrink-0 ${
              starred ? 'text-yellow-400' : 'text-white/60 hover:text-white'
            }`}
            title={starred ? 'Remover estrela' : 'Adicionar estrela'}
          >
            <Star className="w-4 h-4" fill={starred ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Grupo direito: filtros + compartilhar + menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Filtros */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors duration-150 ${
                hasActiveFilter
                  ? 'bg-[#579DFF] text-[#1D2125] font-semibold'
                  : 'text-white/70 hover:text-white hover:bg-white/15'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtros</span>
              {hasActiveFilter && (
                <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-[#1D2125]" />
              )}
            </button>

          {showFilter && (
            <div className="absolute top-full right-0 mt-2 w-80 rounded-lg border border-[#A6C5E229] bg-[#282E33] shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-[150]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#A6C5E229]">
                <h3 className="text-sm font-semibold text-[#DEE4EA]">Filtros</h3>
                <button onClick={() => setShowFilter(false)} className="p-1 hover:bg-[#A1BDD914] rounded">
                  <X className="w-4 h-4 text-[#9FADBC]" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Text filter */}
                <div>
                  <label className="text-xs font-semibold text-[#9FADBC] uppercase mb-1.5 block">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C9BAB]" />
                    <input
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      placeholder="Filtrar por nome..."
                      className="w-full pl-8 pr-3 py-2 rounded-md text-sm bg-[#22272B] text-[#B6C2CF] placeholder-[#8C9BAB] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                    />
                  </div>
                </div>

                {/* Label filter */}
                {labels.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-[#9FADBC] uppercase mb-1.5 block">Labels</label>
                    <div className="space-y-1">
                      {labels.map((label) => (
                        <button
                          key={label.id}
                          onClick={() => setFilterLabel(filterLabel === label.id ? null : label.id)}
                          className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-[#A1BDD914] transition-colors"
                        >
                          <div
                            className="flex-1 h-8 rounded flex items-center px-3"
                            style={{ backgroundColor: label.color }}
                          >
                            <span className="text-xs text-white font-medium truncate">
                              {label.name || '\u00A0'}
                            </span>
                          </div>
                          {filterLabel === label.id && (
                            <Check className="w-4 h-4 text-[#579DFF] shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Due date filter */}
                <div>
                  <label className="text-xs font-semibold text-[#9FADBC] uppercase mb-1.5 block">Data de entrega</label>
                  <div className="space-y-1">
                    {([
                      { key: 'overdue' as const, label: 'Atrasado' },
                      { key: 'soon' as const, label: 'Proxima semana' },
                      { key: 'none' as const, label: 'Sem data' },
                    ]).map(({ key, label: text }) => (
                      <button
                        key={key}
                        onClick={() => setFilterDue(filterDue === key ? null : key)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
                          filterDue === key
                            ? 'bg-[#579DFF]/20 text-[#579DFF]'
                            : 'text-[#B6C2CF] hover:bg-[#A1BDD914]'
                        }`}
                      >
                        {text}
                        {filterDue === key && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear filters */}
                {hasActiveFilter && (
                  <div className="space-y-2">
                    <button
                      onClick={clearFilters}
                      className="w-full text-center text-sm text-[#579DFF] hover:text-[#85B8FF] font-medium py-1.5"
                    >
                      Limpar filtros
                    </button>
                    {/* Save current filter */}
                    {!showSaveFilter ? (
                      <button
                        onClick={() => setShowSaveFilter(true)}
                        className="w-full text-center text-sm text-[#9FADBC] hover:text-[#DEE4EA] py-1"
                      >
                        Salvar filtro
                      </button>
                    ) : (
                      <div className="flex gap-1.5">
                        <input
                          autoFocus
                          value={saveFilterName}
                          onChange={(e) => setSaveFilterName(e.target.value)}
                          placeholder="Nome do filtro"
                          className="flex-1 px-2.5 py-1.5 rounded text-xs bg-[#22272B] text-[#B6C2CF] placeholder-[#8C9BAB] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && saveFilterName.trim()) {
                              const config = { filterText, filterLabel, filterDue }
                              const saved = await saveFilter(saveFilterName.trim(), config as Record<string, unknown>)
                              setSavedFilters((prev) => [...prev, saved])
                              setSaveFilterName('')
                              setShowSaveFilter(false)
                            }
                          }}
                        />
                        <button
                          onClick={async () => {
                            if (!saveFilterName.trim()) return
                            const config = { filterText, filterLabel, filterDue }
                            const saved = await saveFilter(saveFilterName.trim(), config as Record<string, unknown>)
                            setSavedFilters((prev) => [...prev, saved])
                            setSaveFilterName('')
                            setShowSaveFilter(false)
                          }}
                          className="px-2.5 py-1.5 bg-[#579DFF] text-[#1D2125] text-xs font-medium rounded hover:bg-[#85B8FF]"
                        >
                          Salvar
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Saved filters list */}
                {savedFilters.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-[#9FADBC] uppercase mb-1.5 block">Filtros salvos</label>
                    <div className="space-y-1">
                      {savedFilters.map((sf) => (
                        <div key={sf.id} className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const config = sf.filter_config as { filterText?: string; filterLabel?: string | null; filterDue?: 'overdue' | 'soon' | 'none' | null }
                              setFilterText(config.filterText || '')
                              setFilterLabel(config.filterLabel || null)
                              setFilterDue(config.filterDue || null)
                            }}
                            className="flex-1 text-left px-3 py-1.5 rounded text-sm text-[#B6C2CF] hover:bg-[#A1BDD914] transition-colors truncate"
                          >
                            {sf.name}
                          </button>
                          <button
                            onClick={async () => {
                              await deleteFilter(sf.id)
                              setSavedFilters((prev) => prev.filter((f: { id: string }) => f.id !== sf.id))
                            }}
                            className="p-1 rounded hover:bg-[#F8716820] transition-colors shrink-0"
                          >
                            <X className="w-3 h-3 text-[#9FADBC]" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

          {/* Separador */}
          <div className="w-px h-5 bg-white/20 shrink-0" />

          {/* Compartilhar */}
          <button
            onClick={handleOpenShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/15 border border-white/25 text-white text-sm font-medium hover:bg-white/25 transition-colors duration-150"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Compartilhar</span>
          </button>

          {/* Menu ... */}
          <button
            onClick={() => setShowBoardMenu(!showBoardMenu)}
            className="p-1.5 rounded-md hover:bg-white/15 text-white/60 hover:text-white transition-colors duration-150"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="flex-1 overflow-auto px-4 pb-4">
          <ListView lists={lists} labels={labels} onCardClick={setSelectedCardId} cardFilter={hasActiveFilter ? cardPassesFilter : undefined} boardMembers={members} />
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="flex-1 overflow-auto px-4 pb-4">
          <CalendarView lists={lists} labels={labels} onCardClick={setSelectedCardId} cardFilter={hasActiveFilter ? cardPassesFilter : undefined} />
        </div>
      ) : viewMode === 'planner' ? (
        <div className="flex-1 overflow-auto px-4 pb-4 pt-1">
          <PlannerView lists={lists} labels={labels} onCardClick={setSelectedCardId} />
        </div>
      ) : (
      <DndContext
        id="board-dnd"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-3 pb-3 pt-3">
          <div className="flex gap-3 items-start h-full">
            <SortableContext
              items={lists.map((l) => l.id)}
              strategy={horizontalListSortingStrategy}
            >
              {lists.map((list, index) => (
                <BoardList
                  key={list.id}
                  list={list}
                  onCardClick={setSelectedCardId}
                  onListUpdate={(id, updates) => {
                    setLists((prev) =>
                      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
                    )
                  }}
                  labels={labels}
                  autoAddCard={index === 0 && addingCardToFirstList}
                  onAutoAddCardDone={() => setAddingCardToFirstList(false)}
                  cardFilter={hasActiveFilter ? cardPassesFilter : undefined}
                />
              ))}
            </SortableContext>

            {lists.length === 0 && !addingList && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <LayoutGrid className="w-10 h-10 text-white/30 mx-auto mb-3" />
                  <p className="text-sm text-white/60 mb-1">Este quadro esta vazio</p>
                  <p className="text-xs text-white/40">Adicione uma lista para comecar</p>
                </div>
              </div>
            )}

            {addingList ? (
              <form
                onSubmit={handleAddList}
                className="w-[272px] shrink-0 bg-[#101204]/90 backdrop-blur rounded-xl p-2"
              >
                <input
                  autoFocus
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Nome da lista"
                  className="w-full px-3 py-2 rounded-lg text-sm border-2 border-[#579DFF] bg-[#22272B] text-[#B6C2CF] placeholder-[#8C9BAB] focus:outline-none"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="submit"
                    disabled={addListLoading}
                    className="px-3 py-1.5 bg-[#579DFF] text-[#1D2125] text-sm font-semibold rounded-lg hover:bg-[#85B8FF] disabled:opacity-50"
                  >
                    {addListLoading ? 'Adicionando...' : 'Adicionar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingList(false)}
                    className="p-1.5 text-[#9FADBC] hover:text-[#DEE4EA]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAddingList(true)}
                className="w-[272px] shrink-0 bg-white/10 hover:bg-white/20 text-white/90 rounded-xl p-3 text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Adicionar outra lista
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeCard && (
            <div className="rotate-3 opacity-90 scale-105 shadow-xl">
              <BoardCard card={activeCard} labels={labels} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
      )}

      {/* Bottom floating pill tab bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(29, 33, 37, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 10,
          padding: '4px 8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          border: '1px solid rgba(166, 197, 226, 0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          zIndex: 30,
        } as React.CSSProperties}
      >
        <button className="px-3 py-1.5 text-[13px] text-[#8C9BAB] hover:text-[#DEE4EA] hover:bg-[#A1BDD914] rounded-md transition-all duration-200">
          Caixa de entrada
        </button>
        <button
          onClick={() => setViewMode('planner')}
          className={`px-3 py-1.5 text-[13px] rounded-md transition-all duration-200 flex items-center gap-1.5 ${
            viewMode === 'planner' ? 'font-medium text-white bg-[#579DFF20]' : 'text-[#8C9BAB] hover:text-[#DEE4EA] hover:bg-[#A1BDD914]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Planejador
        </button>
        <button
          onClick={() => setViewMode('kanban')}
          className={`px-3 py-1.5 text-[13px] rounded-md transition-all duration-200 flex items-center gap-1.5 ${
            viewMode === 'kanban' ? 'font-medium text-white bg-[#579DFF20]' : 'text-[#8C9BAB] hover:text-[#DEE4EA] hover:bg-[#A1BDD914]'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Quadro
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-3 py-1.5 text-[13px] rounded-md transition-all duration-200 flex items-center gap-1.5 ${
            viewMode === 'list' ? 'font-medium text-white bg-[#579DFF20]' : 'text-[#8C9BAB] hover:text-[#DEE4EA] hover:bg-[#A1BDD914]'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          Lista
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`px-3 py-1.5 text-[13px] rounded-md transition-all duration-200 flex items-center gap-1.5 ${
            viewMode === 'calendar' ? 'font-medium text-white bg-[#579DFF20]' : 'text-[#8C9BAB] hover:text-[#DEE4EA] hover:bg-[#A1BDD914]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Calendário
        </button>
      </div>

      {/* Board menu sidebar */}
      {showBoardMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowBoardMenu(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-[#282E33] z-50 shadow-2xl flex flex-col border-l border-[#A6C5E229]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#A6C5E229]">
              <h3 className="text-sm font-semibold text-[#DEE4EA]">Menu</h3>
              <button
                onClick={() => setShowBoardMenu(false)}
                className="p-1 hover:bg-[#A1BDD914] rounded transition-colors"
              >
                <X className="w-4 h-4 text-[#9FADBC]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {/* Sobre este board */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-[#DEE4EA] mb-2">
                  <Info className="w-4 h-4" />
                  <span className="font-medium">Sobre este quadro</span>
                </div>
                {editingBoardDesc ? (
                  <div className="ml-6">
                    <textarea
                      autoFocus
                      value={boardDescription}
                      onChange={e => setBoardDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg px-3 py-2 text-sm text-[#B6C2CF] bg-[#22272B] focus:outline-none focus:ring-1 focus:ring-[#579DFF] resize-none border border-[#A6C5E229]"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={async () => {
                          await updateBoardDescription(initialBoard.id, boardDescription)
                          setEditingBoardDesc(false)
                        }}
                        className="px-3 py-1.5 bg-[#579DFF] text-[#1D2125] text-sm font-medium rounded hover:bg-[#85B8FF] transition-colors"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => { setBoardDescription(initialBoard.description || ''); setEditingBoardDesc(false) }}
                        className="px-3 py-1.5 text-sm text-[#B6C2CF] hover:bg-[#A1BDD914] rounded transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    onClick={() => setEditingBoardDesc(true)}
                    className="text-xs text-[#9FADBC] ml-6 cursor-pointer hover:bg-[#A1BDD914] rounded px-2 py-1.5 transition-colors"
                  >
                    {boardDescription || 'Clique para adicionar descricao...'}
                  </p>
                )}
              </div>

              <hr className="border-[#A6C5E229] my-1" />

              {/* Mudar background */}
              <button
                onClick={() => setShowBgPicker(!showBgPicker)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#B6C2CF] hover:bg-[#A1BDD914] transition-colors"
              >
                <Palette className="w-4 h-4" />
                Mudar plano de fundo
              </button>

              {showBgPicker && (
                <div className="px-4 pb-3">
                  <p className="text-xs font-semibold text-[#9FADBC] uppercase mb-2 ml-7">Cores</p>
                  <div className="ml-7 grid grid-cols-5 gap-2">
                    {BOARD_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleChangeBg(color)}
                        className="w-10 h-8 rounded-md transition-all hover:ring-1 hover:ring-white/40"
                        style={{
                          backgroundColor: color,
                          outline: boardBackground === color ? '2px solid #579DFF' : 'none',
                          outlineOffset: 2,
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-[#9FADBC] uppercase mt-3 mb-2 ml-7">Gradientes</p>
                  <div className="ml-7 grid grid-cols-4 gap-2">
                    {BOARD_GRADIENTS.map((gradient) => (
                      <button
                        key={gradient}
                        onClick={() => handleChangeBg(gradient)}
                        className="w-12 h-8 rounded-md transition-all hover:ring-1 hover:ring-white/40"
                        style={{
                          background: gradient,
                          outline: boardBackground === gradient ? '2px solid #579DFF' : 'none',
                          outlineOffset: 2,
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-[#9FADBC] uppercase mt-3 mb-2 ml-7">Imagem</p>
                  <label className="ml-7 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm cursor-pointer transition-colors"
                    style={{ backgroundColor: '#22272B', color: '#B6C2CF' }}
                  >
                    <ImageIcon className="w-4 h-4" />
                    {uploadingBg ? 'Enviando...' : 'Fazer upload de imagem'}
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file || !file.type.startsWith('image/')) return
                      setUploadingBg(true)
                      try {
                        const url = await uploadImage(file, 'backgrounds')
                        handleChangeBg(`url(${url})`)
                      } catch {} finally { setUploadingBg(false) }
                    }} />
                  </label>
                </div>
              )}

              {/* Labels do board */}
              <div className="px-4 py-2.5">
                <div className="flex items-center gap-3 text-sm text-[#B6C2CF] mb-2">
                  <Tag className="w-4 h-4" />
                  <span>Labels</span>
                </div>
                <div className="ml-7 flex flex-wrap gap-1.5">
                  {labels.map((label) => (
                    <span
                      key={label.id}
                      className="inline-flex items-center px-2 py-1 rounded text-xs text-white font-medium"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name || '\u00A0'}
                    </span>
                  ))}
                  {labels.length === 0 && (
                    <span className="text-xs text-[#8C9BAB]">Nenhuma label criada</span>
                  )}
                </div>
              </div>

              <hr className="border-[#A6C5E229] my-1" />

              {/* Sprints */}
              <button
                onClick={() => setShowSprints(!showSprints)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#B6C2CF] hover:bg-[#A1BDD914] transition-colors"
              >
                <Target className="w-4 h-4" />
                Sprints
              </button>

              {showSprints && (
                <div className="px-4 pb-3">
                  {/* Lista de sprints existentes */}
                  {sprints.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {sprints.map((sprint) => (
                        <div
                          key={sprint.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#22272B]"
                        >
                          <span className="flex-1 text-xs text-[#B6C2CF] truncate">{sprint.name}</span>
                          <button
                            onClick={async () => {
                              const nextStatus = sprint.status === 'planning' ? 'active' : sprint.status === 'active' ? 'completed' : 'planning'
                              await updateSprint(sprint.id, { status: nextStatus })
                              setSprints((prev) =>
                                prev.map((s) => s.id === sprint.id ? { ...s, status: nextStatus as Sprint['status'] } : s)
                              )
                            }}
                            className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded cursor-pointer ${
                              sprint.status === 'active' ? 'bg-[#4BCE97]/20 text-[#4BCE97]' :
                              sprint.status === 'completed' ? 'bg-[#579DFF]/20 text-[#579DFF]' :
                              'bg-[#A1BDD914] text-[#9FADBC]'
                            }`}
                          >
                            {sprint.status === 'planning' ? 'Planning' : sprint.status === 'active' ? 'Ativo' : 'Done'}
                          </button>
                          <button
                            onClick={async () => {
                              await deleteSprint(sprint.id)
                              setSprints((prev) => prev.filter((s) => s.id !== sprint.id))
                            }}
                            className="p-1 hover:bg-[#F8716820] rounded shrink-0"
                          >
                            <Trash2 className="w-3 h-3 text-[#F87168]" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Nova sprint */}
                  <div className="space-y-2 p-3 rounded-lg bg-[#22272B]">
                    <p className="text-xs font-semibold text-[#9FADBC] uppercase">Nova sprint</p>
                    <input
                      value={newSprintName}
                      onChange={(e) => setNewSprintName(e.target.value)}
                      placeholder="Nome da sprint"
                      className="w-full px-2.5 py-1.5 rounded text-xs bg-[#1D2125] text-[#B6C2CF] placeholder-[#8C9BAB] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold text-[#9FADBC] uppercase block mb-0.5">Inicio</label>
                        <input
                          type="date"
                          value={newSprintStart}
                          onChange={(e) => setNewSprintStart(e.target.value)}
                          className="w-full px-2 py-1 rounded text-xs bg-[#1D2125] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold text-[#9FADBC] uppercase block mb-0.5">Fim</label>
                        <input
                          type="date"
                          value={newSprintEnd}
                          onChange={(e) => setNewSprintEnd(e.target.value)}
                          className="w-full px-2 py-1 rounded text-xs bg-[#1D2125] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                        />
                      </div>
                    </div>
                    <input
                      value={newSprintGoal}
                      onChange={(e) => setNewSprintGoal(e.target.value)}
                      placeholder="Objetivo da sprint (opcional)"
                      className="w-full px-2.5 py-1.5 rounded text-xs bg-[#1D2125] text-[#B6C2CF] placeholder-[#8C9BAB] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                    />
                    <button
                      disabled={sprintLoading || !newSprintName.trim()}
                      onClick={async () => {
                        setSprintLoading(true)
                        try {
                          const created = await createSprint(
                            initialBoard.id,
                            newSprintName.trim(),
                            newSprintStart || undefined,
                            newSprintEnd || undefined,
                            newSprintGoal || undefined,
                          )
                          setSprints((prev) => [...prev, created])
                          setNewSprintName('')
                          setNewSprintStart('')
                          setNewSprintEnd('')
                          setNewSprintGoal('')
                        } catch {
                          // silently fail
                        } finally {
                          setSprintLoading(false)
                        }
                      }}
                      className="w-full py-1.5 rounded text-xs font-semibold bg-[#579DFF] text-[#1D2125] hover:bg-[#85B8FF] disabled:opacity-50 transition-colors"
                    >
                      {sprintLoading ? 'Criando...' : 'Criar sprint'}
                    </button>
                  </div>
                </div>
              )}

              <hr className="border-[#A6C5E229] my-1" />

              {/* Automacoes */}
              <button
                onClick={async () => {
                  setShowAutomations(!showAutomations)
                  if (!showAutomations) {
                    const data = await getAutomations(initialBoard.id)
                    setAutomations(data)
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#B6C2CF] hover:bg-[#A1BDD914] transition-colors"
              >
                <Zap className="w-4 h-4" />
                Automacoes
              </button>

              {showAutomations && (
                <div className="px-4 pb-3">
                  {/* Lista de automacoes existentes */}
                  {automations.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {automations.map((auto) => (
                        <div
                          key={auto.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#22272B]"
                        >
                          <button
                            onClick={async () => {
                              const next = !auto.enabled
                              await toggleAutomation(auto.id, next)
                              setAutomations((prev) =>
                                prev.map((a) => a.id === auto.id ? { ...a, enabled: next } : a)
                              )
                            }}
                            className="shrink-0"
                          >
                            <div
                              className="w-8 h-4 rounded-full transition-colors relative"
                              style={{ backgroundColor: auto.enabled ? '#579DFF' : '#3D444D' }}
                            >
                              <div
                                className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                                style={{ left: auto.enabled ? 16 : 2 }}
                              />
                            </div>
                          </button>
                          <span className="flex-1 text-xs text-[#B6C2CF] truncate">{auto.name}</span>
                          <button
                            onClick={async () => {
                              await deleteAutomation(auto.id)
                              setAutomations((prev) => prev.filter((a) => a.id !== auto.id))
                            }}
                            className="p-1 hover:bg-[#F8716820] rounded shrink-0"
                          >
                            <Trash2 className="w-3 h-3 text-[#F87168]" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Nova automacao */}
                  <div className="space-y-2 p-3 rounded-lg bg-[#22272B]">
                    <p className="text-xs font-semibold text-[#9FADBC] uppercase">Nova automacao</p>
                    <input
                      value={autoName}
                      onChange={(e) => setAutoName(e.target.value)}
                      placeholder="Nome da automacao"
                      className="w-full px-2.5 py-1.5 rounded text-xs bg-[#1D2125] text-[#B6C2CF] placeholder-[#8C9BAB] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                    />

                    <label className="text-[10px] font-semibold text-[#9FADBC] uppercase block">Quando</label>
                    <select
                      value={autoTrigger}
                      onChange={(e) => setAutoTrigger(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded text-xs bg-[#1D2125] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                    >
                      <option value="card_moved_to_list">Card mover para lista</option>
                    </select>

                    {autoTrigger === 'card_moved_to_list' && (
                      <select
                        value={autoTriggerListId}
                        onChange={(e) => setAutoTriggerListId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded text-xs bg-[#1D2125] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                      >
                        <option value="">Selecione a lista...</option>
                        {lists.map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    )}

                    <label className="text-[10px] font-semibold text-[#9FADBC] uppercase block">Acao</label>
                    <select
                      value={autoAction}
                      onChange={(e) => setAutoAction(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded text-xs bg-[#1D2125] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                    >
                      <option value="mark_complete">Marcar como concluido</option>
                      <option value="assign_member">Adicionar membro</option>
                      <option value="add_label">Adicionar label</option>
                    </select>

                    {autoAction === 'assign_member' && (
                      <input
                        value={autoActionValue}
                        onChange={(e) => setAutoActionValue(e.target.value)}
                        placeholder="ID do usuario"
                        className="w-full px-2.5 py-1.5 rounded text-xs bg-[#1D2125] text-[#B6C2CF] placeholder-[#8C9BAB] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                      />
                    )}

                    {autoAction === 'add_label' && (
                      <select
                        value={autoActionValue}
                        onChange={(e) => setAutoActionValue(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded text-xs bg-[#1D2125] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                      >
                        <option value="">Selecione a label...</option>
                        {labels.map((l) => (
                          <option key={l.id} value={l.id}>{l.name || l.color}</option>
                        ))}
                      </select>
                    )}

                    <button
                      disabled={autoLoading || !autoName.trim()}
                      onClick={async () => {
                        setAutoLoading(true)
                        try {
                          const triggerConfig: Record<string, unknown> = {}
                          if (autoTrigger === 'card_moved_to_list' && autoTriggerListId) {
                            triggerConfig.list_id = autoTriggerListId
                          }
                          const actionConfig: Record<string, unknown> = {}
                          if (autoAction === 'assign_member' && autoActionValue) {
                            actionConfig.user_id = autoActionValue
                          } else if (autoAction === 'add_label' && autoActionValue) {
                            actionConfig.label_id = autoActionValue
                          }
                          const created = await createAutomation(initialBoard.id, {
                            name: autoName,
                            trigger_type: autoTrigger,
                            trigger_config: triggerConfig,
                            action_type: autoAction,
                            action_config: actionConfig,
                          })
                          setAutomations((prev) => [...prev, created])
                          setAutoName('')
                          setAutoTriggerListId('')
                          setAutoActionValue('')
                        } catch {
                          // silently fail
                        } finally {
                          setAutoLoading(false)
                        }
                      }}
                      className="w-full py-1.5 rounded text-xs font-semibold bg-[#579DFF] text-[#1D2125] hover:bg-[#85B8FF] disabled:opacity-50 transition-colors"
                    >
                      {autoLoading ? 'Criando...' : 'Criar automacao'}
                    </button>
                  </div>
                </div>
              )}

              <hr className="border-[#A6C5E229] my-1" />

              {/* Campos personalizados */}
              <button
                onClick={async () => {
                  setShowCustomFields(!showCustomFields)
                  if (!showCustomFields) {
                    const data = await getCustomFields(initialBoard.id)
                    setCustomFields(data)
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#B6C2CF] hover:bg-[#A1BDD914] transition-colors"
              >
                <Settings className="w-4 h-4" />
                Campos personalizados
              </button>

              {showCustomFields && (
                <div className="px-4 pb-3">
                  {/* Lista de campos existentes */}
                  {customFields.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {customFields.map((field) => (
                        <div
                          key={field.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#22272B]"
                        >
                          <span className="flex-1 text-xs text-[#B6C2CF] truncate">{field.name}</span>
                          <span className="text-[10px] text-[#738496] uppercase">{field.field_type}</span>
                          <button
                            onClick={async () => {
                              await deleteCustomField(field.id)
                              setCustomFields((prev) => prev.filter((f: any) => f.id !== field.id))
                            }}
                            className="p-1 hover:bg-[#F8716820] rounded shrink-0"
                          >
                            <Trash2 className="w-3 h-3 text-[#F87168]" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Novo campo */}
                  <div className="space-y-2 p-3 rounded-lg bg-[#22272B]">
                    <p className="text-xs font-semibold text-[#9FADBC] uppercase">Novo campo</p>
                    <input
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="Nome do campo"
                      className="w-full px-2.5 py-1.5 rounded text-xs bg-[#1D2125] text-[#B6C2CF] placeholder-[#8C9BAB] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                    />
                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded text-xs bg-[#1D2125] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                    >
                      <option value="text">Texto</option>
                      <option value="number">Numero</option>
                      <option value="date">Data</option>
                      <option value="dropdown">Dropdown</option>
                      <option value="checkbox">Checkbox</option>
                    </select>

                    {newFieldType === 'dropdown' && (
                      <input
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                        placeholder="Opcoes separadas por virgula"
                        className="w-full px-2.5 py-1.5 rounded text-xs bg-[#1D2125] text-[#B6C2CF] placeholder-[#8C9BAB] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                      />
                    )}

                    <button
                      disabled={cfLoading || !newFieldName.trim()}
                      onClick={async () => {
                        setCfLoading(true)
                        try {
                          const options = newFieldType === 'dropdown'
                            ? newFieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
                            : undefined
                          const created = await createCustomField(initialBoard.id, newFieldName.trim(), newFieldType, options)
                          setCustomFields((prev) => [...prev, created])
                          setNewFieldName('')
                          setNewFieldOptions('')
                        } catch {
                          // silently fail
                        } finally {
                          setCfLoading(false)
                        }
                      }}
                      className="w-full py-1.5 rounded text-xs font-semibold bg-[#579DFF] text-[#1D2125] hover:bg-[#85B8FF] disabled:opacity-50 transition-colors"
                    >
                      {cfLoading ? 'Criando...' : 'Criar campo'}
                    </button>
                  </div>
                </div>
              )}

              <hr className="border-[#A6C5E229] my-1" />

              {/* Atividade recente */}
              <button
                onClick={async () => {
                  setShowActivity(!showActivity)
                  if (!showActivity) {
                    setActivityLoading(true)
                    try {
                      const data = await getBoardActivity(initialBoard.id)
                      setActivityLog(data)
                    } catch {} finally {
                      setActivityLoading(false)
                    }
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#B6C2CF] hover:bg-[#A1BDD914] transition-colors"
              >
                <Activity className="w-4 h-4" />
                Atividade
              </button>

              {showActivity && (
                <div className="px-4 pb-3">
                  {activityLoading ? (
                    <p className="text-xs text-[#738496] ml-7">Carregando...</p>
                  ) : activityLog.length === 0 ? (
                    <p className="text-xs text-[#738496] ml-7">Nenhuma atividade registrada</p>
                  ) : (
                    <div className="ml-7 space-y-2 max-h-80 overflow-y-auto">
                      {activityLog.map((entry) => (
                        <div key={entry.id} className="flex gap-2 items-start">
                          <div className="w-6 h-6 rounded-full bg-[#579DFF] flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5">
                            {(() => {
                              const m = members.find((mb) => mb.user_id === entry.user_id)
                              const name = m?.name || 'U'
                              return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#B6C2CF]">
                              <span className="font-semibold">{members.find((mb) => mb.user_id === entry.user_id)?.name || 'Usuario'}</span>
                              {' '}{entry.action}
                              {entry.cards?.name && (
                                <span className="text-[#579DFF]"> {entry.cards.name}</span>
                              )}
                            </p>
                            <p className="text-[10px] text-[#738496]">
                              {new Date(entry.created_at).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <hr className="border-[#A6C5E229] my-1" />

              {/* Itens arquivados */}
              <button
                onClick={async () => {
                  setShowArchived(!showArchived)
                  if (!showArchived) {
                    setArchivedLoading(true)
                    try {
                      const [cards, archivedListsData] = await Promise.all([
                        getArchivedCards(initialBoard.id),
                        getArchivedLists(initialBoard.id),
                      ])
                      setArchivedCards(cards)
                      setArchivedLists(archivedListsData)
                    } catch {} finally {
                      setArchivedLoading(false)
                    }
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#B6C2CF] hover:bg-[#A1BDD914] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Itens arquivados
              </button>

              {showArchived && (
                <div className="px-4 pb-3">
                  {archivedLoading ? (
                    <p className="text-xs text-[#738496] ml-7">Carregando...</p>
                  ) : archivedCards.length === 0 && archivedLists.length === 0 ? (
                    <p className="text-xs text-[#738496] ml-7">Nenhum item arquivado</p>
                  ) : (
                    <div className="ml-7 space-y-1.5 max-h-60 overflow-y-auto">
                      {archivedLists.length > 0 && (
                        <>
                          <p className="text-[10px] font-semibold text-[#9FADBC] uppercase">Listas</p>
                          {archivedLists.map((list) => (
                            <div key={list.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#22272B]">
                              <span className="flex-1 text-xs text-[#B6C2CF] truncate">{list.name}</span>
                              <button
                                onClick={async () => {
                                  await restoreList(list.id)
                                  setArchivedLists((prev) => prev.filter((l) => l.id !== list.id))
                                }}
                                className="text-[10px] font-semibold text-[#579DFF] hover:text-[#85B8FF] px-2 py-0.5 rounded hover:bg-[#579DFF20] transition-colors"
                              >
                                Restaurar
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                      {archivedCards.length > 0 && (
                        <>
                          <p className="text-[10px] font-semibold text-[#9FADBC] uppercase mt-2">Cards</p>
                          {archivedCards.map((card) => (
                            <div key={card.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#22272B]">
                              <div className="flex-1 min-w-0">
                                <span className="text-xs text-[#B6C2CF] truncate block">{card.name}</span>
                                <span className="text-[10px] text-[#738496]">{card.list_name}</span>
                              </div>
                              <button
                                onClick={async () => {
                                  await restoreCard(card.id)
                                  setArchivedCards((prev) => prev.filter((c) => c.id !== card.id))
                                }}
                                className="text-[10px] font-semibold text-[#579DFF] hover:text-[#85B8FF] px-2 py-0.5 rounded hover:bg-[#579DFF20] transition-colors shrink-0"
                              >
                                Restaurar
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <hr className="border-[#A6C5E229] my-1" />

              {/* Duplicar quadro */}
              <button
                disabled={duplicating}
                onClick={async () => {
                  setDuplicating(true)
                  try {
                    const copy = await duplicateBoard(initialBoard.id)
                    window.location.href = `/board/${copy.id}`
                  } catch {
                    setDuplicating(false)
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#B6C2CF] hover:bg-[#A1BDD914] transition-colors disabled:opacity-50"
              >
                <Copy className="w-4 h-4" />
                {duplicating ? 'Duplicando...' : 'Duplicar quadro'}
              </button>

              {/* Arquivar board */}
              <button
                disabled={archiveLoading}
                onClick={async () => {
                  if (!confirm('Tem certeza que deseja arquivar este quadro?')) return
                  setArchiveLoading(true)
                  try {
                    await deleteBoard(initialBoard.id)
                    window.location.href = '/'
                  } catch {
                    setArchiveLoading(false)
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#F87168] hover:bg-[#A1BDD914] transition-colors disabled:opacity-50"
              >
                <Archive className="w-4 h-4" />
                {archiveLoading ? 'Arquivando...' : 'Arquivar quadro'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Share modal */}
      {showShareModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowShareModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#282E33] rounded-xl border border-[#A6C5E229] shadow-[0_8px_24px_rgba(0,0,0,0.4)]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#A6C5E229]">
                <h3 className="text-base font-semibold text-[#DEE4EA]">Compartilhar quadro</h3>
                <button onClick={() => setShowShareModal(false)} className="p-1 hover:bg-[#A1BDD914] rounded">
                  <X className="w-4 h-4 text-[#9FADBC]" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Invite form */}
                <form onSubmit={handleInvite} className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C9BAB]" />
                    <input
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="Email do membro..."
                      type="email"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm bg-[#22272B] text-[#B6C2CF] placeholder-[#8C9BAB] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={shareLoading}
                    className="px-4 py-2.5 bg-[#579DFF] text-[#1D2125] text-sm font-semibold rounded-lg hover:bg-[#85B8FF] disabled:opacity-50 shrink-0"
                  >
                    {shareLoading ? '...' : 'Convidar'}
                  </button>
                </form>

                {shareError && (
                  <p className="text-xs text-[#F87168]">{shareError}</p>
                )}
                {inviteSuccess && (
                  <p className="text-xs text-[#7EE2B8]">{inviteSuccess}</p>
                )}

                {/* Members list */}
                {members.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-[#9FADBC] uppercase mb-2 block">
                      Membros ({members.length})
                    </label>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {members.map((member) => {
                        const displayName = member.name || member.email || 'Usuario'
                        const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                        return (
                          <div
                            key={member.user_id}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#22272B]"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#579DFF] flex items-center justify-center text-xs font-bold text-[#1D2125]">
                                {initials}
                              </div>
                              <div>
                                <p className="text-sm text-[#DEE4EA] truncate max-w-[200px]">{displayName}</p>
                                <p className="text-xs text-[#8C9BAB] capitalize">{member.role}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Copy link */}
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#A6C5E229] text-sm transition-colors hover:bg-[#A1BDD914]"
                >
                  <Copy className="w-4 h-4 text-[#9FADBC]" />
                  <span className={linkCopied ? 'text-[#7EE2B8]' : 'text-[#B6C2CF]'}>
                    {linkCopied ? 'Copiado!' : 'Copiar link do quadro'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          labels={labels}
          listName={lists.find((l) => l.cards.some((c) => c.id === selectedCardId))?.name || ''}
          lists={lists.map((l) => ({ id: l.id, name: l.name }))}
          boardMembers={members}
          sprints={sprints}
          boardId={initialBoard.id}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </div>
  )
}
