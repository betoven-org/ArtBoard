'use client'

import { useEffect, useState } from 'react'
import {
  getCard,
  updateCard,
  addComment,
  toggleLabel,
  createChecklist,
  addChecklistItem,
  toggleChecklistItem,
  deleteCard,
  copyCard,
  toggleCardMember,
} from '@/lib/actions/card'
import { updateComment, deleteComment } from '@/lib/actions/comment'
import { addAttachment, getAttachments, deleteAttachment } from '@/lib/actions/attachment'
import { assignCardToSprint } from '@/lib/actions/sprint'
import { deleteChecklist, deleteChecklistItem } from '@/lib/actions/checklist'
import { startTimer, stopTimer, pauseTimer, resumeTimer, getCardTimeEntries, addManualTimeEntry, updateTimeEntry, deleteTimeEntry } from '@/lib/actions/timesheet'
import type { Label, Attachment, Sprint } from '@/types/database'
import {
  X,
  Tag,
  Clock,
  CheckSquare,
  MessageSquare,
  Trash2,
  AlignLeft,
  User,
  Paperclip,
  Copy,
  ArrowRight,
  Archive,
  Palette,
  Image as ImageIcon,
  Plus,
  Users,
  ChevronDown,
  Maximize2,
  Zap,
  Plug,
  Circle,
  Play,
  Pause,
  Square,
  Pencil,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Minus,
  Bug,
  BookOpen,
  TrendingUp,
  Sparkles,
  Target,
  Settings,
} from 'lucide-react'
import { uploadImage } from '@/lib/upload'
import { createClient } from '@/lib/supabase/client'
import { getCardCustomValues, setCustomFieldValue, getCustomFields } from '@/lib/actions/custom-field'

export function CardDetailModal({
  cardId,
  labels,
  listName,
  lists,
  boardMembers = [],
  sprints = [],
  boardId,
  onClose,
}: {
  cardId: string
  labels: Label[]
  listName?: string
  lists?: Array<{ id: string; name: string }>
  boardMembers?: Array<{ user_id: string; role: string; name?: string; email?: string }>
  sprints?: Sprint[]
  boardId?: string
  onClose: () => void
}) {
  const [card, setCard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editingDesc, setEditingDesc] = useState(false)
  const [description, setDescription] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState('')
  const [commentText, setCommentText] = useState('')
  const [showLabels, setShowLabels] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [newChecklistName, setNewChecklistName] = useState('Checklist')
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({})
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [showMove, setShowMove] = useState(false)
  const [moveListId, setMoveListId] = useState('')
  const [showCopy, setShowCopy] = useState(false)
  const [copyName, setCopyName] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [showCover, setShowCover] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [activeTab, setActiveTab] = useState<'powerups' | 'automations' | 'comments'>('comments')
  const [showListDropdown, setShowListDropdown] = useState(false)
  const [estimatedHours, setEstimatedHours] = useState<number | null>(null)
  const [showEstimate, setShowEstimate] = useState(false)
  const [estimateInput, setEstimateInput] = useState('')
  const [showPriority, setShowPriority] = useState(false)
  const [cardType, setCardType] = useState<string>('task')
  const [showCardType, setShowCardType] = useState(false)
  const [showSprint, setShowSprint] = useState(false)
  const [showStoryPoints, setShowStoryPoints] = useState(false)
  const [storyPoints, setStoryPoints] = useState<number | null>(null)
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle')
  const [timerStart, setTimerStart] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [pausedSeconds, setPausedSeconds] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [timeEntries, setTimeEntries] = useState<any[]>([])

  // Manual time entry
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editEntryDate, setEditEntryDate] = useState('')
  const [editEntryStart, setEditEntryStart] = useState('')
  const [editEntryEnd, setEditEntryEnd] = useState('')
  const [editEntryDesc, setEditEntryDesc] = useState('')
  const [editEntryLoading, setEditEntryLoading] = useState(false)
  const [manualDate, setManualDate] = useState('')
  const [manualStart, setManualStart] = useState('')
  const [manualEnd, setManualEnd] = useState('')
  const [manualDesc, setManualDesc] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

  // Loading states
  const [savingDesc, setSavingDesc] = useState(false)
  const [addingItem, setAddingItem] = useState<string | null>(null)
  const [movingCard, setMovingCard] = useState(false)
  const [togglingLabel, setTogglingLabel] = useState<string | null>(null)
  const [addingComment, setAddingComment] = useState(false)

  // Comment edit/delete
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploadingAttachment, setUploadingAttachment] = useState(false)

  // Custom fields
  const [customFieldDefs, setCustomFieldDefs] = useState<any[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})

  // @mention autocomplete
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionCursorPos, setMentionCursorPos] = useState(0)


  useEffect(() => {
    loadCard()
    // Carregar user id atual
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id)
    })
  }, [cardId])

  async function loadCard() {
    setLoading(true)

    // Fase 1: carregar card e mostrar modal imediatamente
    const data = await getCard(cardId)
    setCard(data)
    setName(data.name)
    setDescription(data.description || '')
    setDueDate(data.due_date ? data.due_date.split('T')[0] : '')
    setEstimatedHours(data.estimated_hours || null)
    setCardType(data.card_type || 'task')
    setStoryPoints(data.story_points ?? null)
    setLoading(false)

    // Fase 2: time entries + attachments em background (nao bloqueia o modal)
    Promise.all([
      getCardTimeEntries(cardId),
      getAttachments(cardId),
    ]).then(([entries, attachData]) => {
      setTimeEntries(entries)
      const total = entries.reduce((sum: number, e: any) => sum + (e.duration_seconds || 0), 0)
      setTotalTime(total)
      setAttachments(attachData)
    }).catch(() => {})

    // Fase 3: custom fields em background
    if (boardId) {
      Promise.all([
        getCustomFields(boardId),
        getCardCustomValues(cardId),
      ]).then(([fields, values]) => {
        setCustomFieldDefs(fields)
        const valMap: Record<string, string> = {}
        for (const v of values) {
          valMap[v.field_id] = v.value || ''
        }
        setCustomFieldValues(valMap)
      }).catch(() => {})
    }
  }

  async function handleSaveName() {
    if (name.trim() && name !== card.name) {
      await updateCard(cardId, { name: name.trim() })
      setCard({ ...card, name: name.trim() })
    }
    setEditingName(false)
  }

  async function handleSaveDescription() {
    setSavingDesc(true)
    try {
      await updateCard(cardId, { description: description || null })
      setCard((prev: any) => ({ ...prev, description }))
      setEditingDesc(false)
    } finally {
      setSavingDesc(false)
    }
  }

  async function handleToggleLabel(labelId: string) {
    setTogglingLabel(labelId)
    // Optimistic: toggle label imediatamente
    const isActive = card.card_labels?.some((cl: any) => cl.label_id === labelId)
    setCard((prev: any) => ({
      ...prev,
      card_labels: isActive
        ? prev.card_labels?.filter((cl: any) => cl.label_id !== labelId)
        : [...(prev.card_labels || []), { label_id: labelId }],
    }))
    try {
      await toggleLabel(cardId, labelId)
    } catch {
      await loadCard()
    } finally {
      setTogglingLabel(null)
    }
  }

  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setCommentText(val)

    const cursorPos = e.target.selectionStart || 0
    const textBeforeCursor = val.slice(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')

    if (atIndex >= 0) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1)
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
        setMentionFilter(textAfterAt.toLowerCase())
        setMentionCursorPos(atIndex)
        setShowMentionDropdown(true)
        return
      }
    }
    setShowMentionDropdown(false)
  }

  function insertMention(member: any) {
    const memberName = member.name || member.email || 'Usuario'
    const before = commentText.slice(0, mentionCursorPos)
    const cursorEnd = commentText.indexOf(' ', mentionCursorPos + 1)
    const after = cursorEnd >= 0 ? commentText.slice(cursorEnd + 1) : ''
    setCommentText(`${before}@${memberName} ${after}`)
    setShowMentionDropdown(false)
  }

  function renderCommentText(text: string) {
    const parts = text.split(/(@\w[\w\s]*?\s)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} style={{ color: '#579DFF', fontWeight: 500 }}>{part}</span>
      }
      return part
    })
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    setAddingComment(true)
    // Optimistic: adicionar comentário imediatamente
    const tempComment = {
      id: `temp-${Date.now()}`,
      text: commentText.trim(),
      user_id: currentUserId,
      created_at: new Date().toISOString(),
    }
    setCard((prev: any) => ({
      ...prev,
      comments: [...(prev.comments || []), tempComment],
    }))
    const savedText = commentText.trim()
    setCommentText('')
    try {
      await addComment(cardId, savedText)
      await loadCard()
    } catch {
      await loadCard()
    } finally {
      setAddingComment(false)
    }
  }

  async function handleCreateChecklist(e: React.FormEvent) {
    e.preventDefault()
    if (!newChecklistName.trim()) return
    await createChecklist(cardId, newChecklistName.trim())
    setNewChecklistName('Checklist')
    setShowChecklist(false)
    await loadCard()
  }

  async function handleAddItem(checklistId: string) {
    const text = newItemTexts[checklistId]?.trim()
    if (!text) return
    setAddingItem(checklistId)
    // Optimistic: adicionar item imediatamente
    const tempItem = {
      id: `temp-${Date.now()}`,
      name: text,
      checked: false,
      position: 99999,
      checklist_id: checklistId,
    }
    setCard((prev: any) => ({
      ...prev,
      checklists: prev.checklists?.map((cl: any) =>
        cl.id === checklistId
          ? { ...cl, checklist_items: [...(cl.checklist_items || []), tempItem] }
          : cl
      ),
    }))
    setNewItemTexts({ ...newItemTexts, [checklistId]: '' })
    try {
      await addChecklistItem(checklistId, text)
      await loadCard()
    } catch {
      await loadCard()
    } finally {
      setAddingItem(null)
    }
  }

  async function handleToggleItem(itemId: string, checked: boolean) {
    // Optimistic: atualizar UI imediatamente
    setCard((prev: any) => ({
      ...prev,
      checklists: prev.checklists?.map((cl: any) => ({
        ...cl,
        checklist_items: cl.checklist_items?.map((item: any) =>
          item.id === itemId ? { ...item, checked: !checked } : item
        ),
      })),
    }))
    toggleChecklistItem(itemId, !checked).catch(() => loadCard())
  }

  async function handleSaveDueDate() {
    const date = dueDate ? new Date(dueDate).toISOString() : null
    await updateCard(cardId, { due_date: date })
    setCard({ ...card, due_date: date })
    setShowDatePicker(false)
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja arquivar este card?')) return
    await deleteCard(cardId)
    onClose()
  }

  async function handleMove() {
    if (!moveListId) return
    setMovingCard(true)
    try {
      await updateCard(cardId, { list_id: moveListId })
      setShowMove(false)
      await loadCard()
    } finally {
      setMovingCard(false)
    }
  }

  async function handleCopy() {
    if (!copyName.trim()) return
    const copy = await copyCard(cardId)
    if (copyName.trim() !== `${card.name} (copia)`) {
      await updateCard(copy.id, { name: copyName.trim() })
    }
    setShowCopy(false)
    await loadCard()
  }

  async function handleToggleMember(userId: string) {
    await toggleCardMember(cardId, userId)
    await loadCard()
  }

  async function handleMoveToList(targetListId: string) {
    await updateCard(cardId, { list_id: targetListId })
    setShowListDropdown(false)
    await loadCard()
  }

  // elapsedAtPause guarda o valor do elapsed no momento da pausa
  const [elapsedAtPause, setElapsedAtPause] = useState(0)
  // resumeOffset: timestamp de quando resumiu (pra calcular delta desde resume)
  const [resumeTs, setResumeTs] = useState<number | null>(null)

  useEffect(() => {
    if (timerState !== 'running') return
    const baseTs = resumeTs || (timerStart?.getTime() || Date.now())
    const interval = setInterval(() => {
      const delta = Math.floor((Date.now() - baseTs) / 1000)
      setElapsed(elapsedAtPause + delta)
    }, 1000)
    return () => clearInterval(interval)
  }, [timerState, resumeTs, timerStart, elapsedAtPause])

  async function handleStartTimer() {
    const entry = await startTimer(cardId)
    setTimerState('running')
    setTimerStart(new Date(entry.started_at))
    setResumeTs(Date.now())
    setElapsedAtPause(0)
    setElapsed(0)
  }

  async function handlePauseTimer() {
    await pauseTimer(cardId)
    setElapsedAtPause(elapsed) // congela o valor atual
    setResumeTs(null)
    setTimerState('paused')
  }

  async function handleResumeTimer() {
    await resumeTimer(cardId)
    setResumeTs(Date.now()) // novo ponto de referência
    setTimerState('running')
  }

  async function handleStopTimer() {
    const duration = await stopTimer(cardId)
    setTimerState('idle')
    setTimerStart(null)
    setElapsed(0)
    setPausedSeconds(0)
    if (duration) setTotalTime(prev => prev + duration)
    const entries = await getCardTimeEntries(cardId)
    setTimeEntries(entries)
  }

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
        <div className="bg-[#282E33] rounded-xl w-full max-w-[1080px] p-6">
          <div className="space-y-3">
            <div className="h-5 bg-[#A1BDD90A] rounded w-2/3" />
            <div className="h-3 bg-[#A1BDD90A] rounded w-1/2" />
            <div className="h-3 bg-[#A1BDD90A] rounded w-1/3" />
          </div>
        </div>
      </div>
    )
  }

  if (!card) return null

  const cardLabels = labels.filter((l) =>
    card.card_labels?.some((cl: any) => cl.label_id === l.id)
  )

  function getDueDateStatus() {
    if (!card.due_date) return null
    if (card.due_complete) return 'complete'
    const due = new Date(card.due_date)
    const now = new Date()
    const diff = due.getTime() - now.getTime()
    const hours24 = 24 * 60 * 60 * 1000
    if (diff < 0) return 'overdue'
    if (diff < hours24) return 'soon'
    return 'normal'
  }

  const dueDateStatus = getDueDateStatus()

  const dueDateColors: Record<string, { bg: string; text: string; label: string }> = {
    complete: { bg: '#4BCE97', text: '#1D2125', label: 'Concluido' },
    overdue: { bg: '#F87168', text: '#1D2125', label: 'Em Atraso' },
    soon: { bg: '#F5CD47', text: '#1D2125', label: 'Em breve' },
    normal: { bg: '#A1BDD914', text: '#B6C2CF', label: '' },
  }

  return (
    <div
      className="card-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-[100] overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[1080px] max-h-[calc(100dvh-48px)] rounded-xl shadow-2xl my-6 flex flex-col overflow-hidden"
        style={{ backgroundColor: '#282E33' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover */}
        {card.cover_color && (
          <div
            className="h-[80px] rounded-t-xl shrink-0"
            style={{ backgroundColor: card.cover_color }}
          />
        )}
        {card.cover_image && !card.cover_color && (
          <div
            className="h-[100px] rounded-t-xl bg-cover bg-center shrink-0"
            style={{ backgroundImage: `url(${card.cover_image})` }}
          />
        )}

        {/* ============ TOP BAR ============ */}
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          {/* Left: List name dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowListDropdown(!showListDropdown)}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-sm font-medium text-[#DEE4EA] hover:bg-[#A1BDD914] transition-colors"
              style={{ backgroundColor: '#22272B' }}
            >
              {listName || 'Lista'}
              <ChevronDown className="w-4 h-4 text-[#9FADBC]" />
            </button>
            {showListDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowListDropdown(false)} />
                <div
                  className="absolute left-0 top-9 w-[220px] rounded-lg p-2 z-50"
                  style={{
                    backgroundColor: '#282E33',
                    border: '1px solid rgba(166, 197, 226, 0.16)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <p className="text-[11px] font-semibold text-[#9FADBC] uppercase px-2 mb-1">Mover para</p>
                  {lists?.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => handleMoveToList(l.id)}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                        l.name === listName
                          ? 'text-[#579DFF] bg-[#579DFF1A]'
                          : 'text-[#B6C2CF] hover:bg-[#A1BDD914]'
                      }`}
                    >
                      {l.name} {l.name === listName ? '(atual)' : ''}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right: action icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              className="p-1.5 rounded hover:bg-[#A1BDD914] transition-colors"
              title="Arquivar"
            >
              <Archive className="w-4 h-4 text-[#9FADBC]" />
            </button>
            <button
              className="p-1.5 rounded hover:bg-[#A1BDD914] transition-colors"
              title="Maximizar"
            >
              <Maximize2 className="w-4 h-4 text-[#9FADBC]" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#A1BDD914] transition-colors"
              title="Fechar"
            >
              <X className="w-4.5 h-4.5 text-[#9FADBC]" />
            </button>
          </div>
        </div>

        {/* ============ TITLE ============ */}
        <div className="px-4 pt-3 pb-1 flex items-start gap-3">
          {/* Checkbox circle */}
          <button
            onClick={async () => {
              await updateCard(cardId, { due_complete: !card.due_complete })
              loadCard()
            }}
            className="mt-1 shrink-0"
          >
            <Circle
              className={`w-6 h-6 ${
                card.due_complete
                  ? 'text-[#4BCE97] fill-[#4BCE97]'
                  : 'text-[#738496] hover:text-[#9FADBC]'
              } transition-colors`}
            />
          </button>

          {/* Title text */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="text-xl font-bold text-white bg-[#22272B] rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-[#579DFF] border-none"
              />
            ) : (
              <h2
                onClick={() => setEditingName(true)}
                className="text-xl font-bold text-white cursor-pointer hover:bg-[#A1BDD914] rounded px-1 py-0.5 break-words"
              >
                {card.name}
              </h2>
            )}
          </div>
        </div>

        {/* ============ ACTION BAR (pills) ============ */}
        <div className="px-4 pt-2 pb-3 flex flex-wrap items-center gap-2">
          {/* Adicionar - with popover for labels/checklist/members/dates/cover */}
          <PillButton icon={<Plus className="w-4 h-4" />} label="Adicionar" />

          {/* Etiquetas */}
          <div className="relative">
            <PillButton
              icon={<Tag className="w-4 h-4" />}
              label="Etiquetas"
              onClick={() => setShowLabels(!showLabels)}
            />
            {showLabels && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLabels(false)} />
                <div
                  className="absolute left-0 top-10 w-[304px] rounded-lg shadow-lg p-3 z-50"
                  style={{
                    backgroundColor: '#282E33',
                    border: '1px solid rgba(166, 197, 226, 0.16)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-[#DEE4EA]">Etiquetas</h5>
                    <button
                      onClick={() => setShowLabels(false)}
                      className="p-1 hover:bg-[#A1BDD914] rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-[#9FADBC]" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {labels.map((label) => {
                      const isActive = card.card_labels?.some(
                        (cl: any) => cl.label_id === label.id
                      )
                      return (
                        <button
                          key={label.id}
                          onClick={() => handleToggleLabel(label.id)}
                          disabled={togglingLabel !== null}
                          className={`w-full flex items-center gap-2 px-1 py-1 rounded text-sm transition-colors ${
                            isActive ? 'ring-1 ring-[#579DFF]' : ''
                          } ${togglingLabel === label.id ? 'opacity-50' : ''}`}
                        >
                          <span
                            className="w-full h-8 rounded flex items-center px-3 text-white text-xs font-medium"
                            style={{ backgroundColor: label.color }}
                          >
                            {label.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Checklist */}
          <div className="relative">
            <PillButton
              icon={<CheckSquare className="w-4 h-4" />}
              label="Checklist"
              onClick={() => setShowChecklist(!showChecklist)}
            />
            {showChecklist && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowChecklist(false)} />
                <form
                  onSubmit={handleCreateChecklist}
                  className="absolute left-0 top-10 w-[304px] rounded-lg shadow-lg p-3 z-50"
                  style={{
                    backgroundColor: '#282E33',
                    border: '1px solid rgba(166, 197, 226, 0.16)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-[#DEE4EA]">Adicionar Checklist</h5>
                    <button
                      type="button"
                      onClick={() => setShowChecklist(false)}
                      className="p-1 hover:bg-[#A1BDD914] rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-[#9FADBC]" />
                    </button>
                  </div>
                  <label className="text-xs font-semibold text-[#9FADBC] mb-1 block">Titulo</label>
                  <input
                    autoFocus
                    value={newChecklistName}
                    onChange={(e) => setNewChecklistName(e.target.value)}
                    className="w-full rounded px-3 py-1.5 text-sm text-[#B6C2CF] focus:outline-none focus:ring-1 focus:ring-[#579DFF] mb-3 border-none"
                    style={{ backgroundColor: '#22272B' }}
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#579DFF] text-[#1D2125] text-sm font-medium rounded hover:bg-[#85B8FF] transition-colors"
                  >
                    Adicionar
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Membros */}
          <div className="relative">
            <PillButton
              icon={<Users className="w-4 h-4" />}
              label="Membros"
              onClick={() => setShowMembers(!showMembers)}
            />
            {showMembers && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMembers(false)} />
                <div
                  className="absolute left-0 top-10 w-[304px] rounded-lg p-3 z-50"
                  style={{
                    backgroundColor: '#282E33',
                    border: '1px solid rgba(166, 197, 226, 0.16)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-[#DEE4EA]">Membros</h5>
                    <button
                      onClick={() => setShowMembers(false)}
                      className="p-1 hover:bg-[#A1BDD914] rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-[#9FADBC]" />
                    </button>
                  </div>
                  <p className="text-[11px] font-semibold text-[#9FADBC] uppercase mb-2">Membros do quadro</p>
                  <div className="space-y-1">
                    {boardMembers.map((member) => {
                      const isOnCard = card.card_members?.some(
                        (cm: any) => cm.user_id === member.user_id
                      )
                      const displayName = member.name || member.email || 'Usuario'
                      const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                      return (
                        <button
                          key={member.user_id}
                          onClick={() => handleToggleMember(member.user_id)}
                          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-[#A1BDD914] transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-[#579DFF] flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {initials}
                          </div>
                          <span className="flex-1 text-sm text-[#B6C2CF] text-left truncate">
                            {displayName}
                          </span>
                          {isOnCard && (
                            <div className="w-4 h-4 rounded bg-[#579DFF] flex items-center justify-center">
                              <CheckSquare className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                    {boardMembers.length === 0 && (
                      <p className="text-xs text-[#738496] px-2 py-1">Nenhum membro encontrado</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Datas */}
          <div className="relative">
            <PillButton
              icon={<Clock className="w-4 h-4" />}
              label="Datas"
              onClick={() => setShowDatePicker(!showDatePicker)}
            />
            {showDatePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
                <div
                  className="absolute left-0 top-10 w-[304px] rounded-lg shadow-lg p-3 z-50"
                  style={{
                    backgroundColor: '#282E33',
                    border: '1px solid rgba(166, 197, 226, 0.16)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-[#DEE4EA]">Data de entrega</h5>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="p-1 hover:bg-[#A1BDD914] rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-[#9FADBC]" />
                    </button>
                  </div>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded px-3 py-1.5 text-sm text-[#B6C2CF] focus:outline-none focus:ring-1 focus:ring-[#579DFF] mb-3 border-none"
                    style={{ backgroundColor: '#22272B' }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveDueDate}
                      className="px-3 py-1.5 bg-[#579DFF] text-[#1D2125] text-sm font-medium rounded hover:bg-[#85B8FF] transition-colors"
                    >
                      Salvar
                    </button>
                    {card.due_date && (
                      <button
                        onClick={async () => {
                          setDueDate('')
                          await updateCard(cardId, { due_date: null })
                          await loadCard()
                          setShowDatePicker(false)
                        }}
                        className="px-3 py-1.5 text-sm text-[#F87168] hover:bg-[#A1BDD914] rounded transition-colors"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Capa */}
          <div className="relative">
            <PillButton
              icon={<Palette className="w-4 h-4" />}
              label="Capa"
              onClick={() => setShowCover(!showCover)}
            />
            {showCover && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCover(false)} />
                <div
                  className="absolute left-0 top-10 w-[304px] rounded-lg p-3 z-50"
                  style={{
                    backgroundColor: '#282E33',
                    border: '1px solid rgba(166, 197, 226, 0.16)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-[#DEE4EA]">Capa</h5>
                    <button
                      onClick={() => setShowCover(false)}
                      className="p-1 hover:bg-[#A1BDD914] rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-[#9FADBC]" />
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-[#9FADBC] uppercase mb-2">Cor</p>
                  <div className="grid grid-cols-5 gap-2">
                    {['#579DFF', '#4BCE97', '#F5CD47', '#F87168', '#9F8FEF', '#FF9F1A', '#0079BF', '#cd5a91', '#344563'].map(color => (
                      <button
                        key={color}
                        onClick={() => { updateCard(cardId, { cover_color: color, cover_image: null }); loadCard() }}
                        style={{ backgroundColor: color, width: 40, height: 28, borderRadius: 4 }}
                        className={card.cover_color === color ? 'ring-1 ring-[#579DFF] ring-offset-2 ring-offset-[#282E33]' : ''}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-[#9FADBC] uppercase mt-3 mb-2">Imagem</p>
                  <label
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm cursor-pointer transition-colors"
                    style={{ backgroundColor: '#22272B', color: '#B6C2CF' }}
                  >
                    <ImageIcon className="w-4 h-4" />
                    {uploadingCover ? 'Enviando...' : 'Fazer upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setUploadingCover(true)
                      try {
                        const url = await uploadImage(file, 'covers')
                        await updateCard(cardId, { cover_image: url, cover_color: null })
                        loadCard()
                      } catch {} finally { setUploadingCover(false) }
                    }} />
                  </label>
                  {(card.cover_color || card.cover_image) && (
                    <button
                      onClick={() => { updateCard(cardId, { cover_color: null, cover_image: null }); loadCard() }}
                      className="w-full mt-2 text-center text-xs text-[#F87168] hover:text-[#FF9F9F]"
                    >
                      Remover capa
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Anexo */}
          <div className="relative">
            <label className="cursor-pointer">
              <PillButton
                icon={<Paperclip className="w-4 h-4" />}
                label={uploadingAttachment ? 'Enviando...' : 'Anexo'}
              />
              <input type="file" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setUploadingAttachment(true)
                try {
                  const url = await uploadImage(file, 'attachments')
                  const att = await addAttachment(cardId, url, file.name)
                  setAttachments((prev) => [att, ...prev])
                } catch {
                  // silently fail
                } finally {
                  setUploadingAttachment(false)
                }
              }} />
            </label>
          </div>

          {/* Mover */}
          <div className="relative">
            <PillButton
              icon={<ArrowRight className="w-4 h-4" />}
              label="Mover"
              onClick={() => {
                setMoveListId(card.list_id || '')
                setShowMove(!showMove)
              }}
            />
            {showMove && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMove(false)} />
                <div
                  className="absolute left-0 top-10 w-[304px] rounded-lg p-3 z-50"
                  style={{
                    backgroundColor: '#282E33',
                    border: '1px solid rgba(166, 197, 226, 0.16)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-[#DEE4EA]">Mover cartao</h5>
                    <button
                      onClick={() => setShowMove(false)}
                      className="p-1 hover:bg-[#A1BDD914] rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-[#9FADBC]" />
                    </button>
                  </div>
                  <p className="text-[11px] font-semibold text-[#9FADBC] uppercase mb-1.5">Lista</p>
                  <select
                    value={moveListId}
                    onChange={(e) => setMoveListId(e.target.value)}
                    className="w-full rounded px-3 py-1.5 text-sm text-[#B6C2CF] focus:outline-none focus:ring-1 focus:ring-[#579DFF] mb-3 border-none appearance-none cursor-pointer"
                    style={{ backgroundColor: '#22272B' }}
                  >
                    {lists?.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} {l.id === card.list_id ? '(atual)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleMove}
                    disabled={movingCard}
                    className="px-3 py-1.5 bg-[#579DFF] text-[#1D2125] text-sm font-medium rounded hover:bg-[#85B8FF] transition-colors disabled:opacity-50"
                  >
                    {movingCard ? 'Movendo...' : 'Mover'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Copiar */}
          <div className="relative">
            <PillButton
              icon={<Copy className="w-4 h-4" />}
              label="Copiar"
              onClick={() => {
                setCopyName(card.name || '')
                setShowCopy(!showCopy)
              }}
            />
            {showCopy && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCopy(false)} />
                <div
                  className="absolute left-0 top-10 w-[304px] rounded-lg p-3 z-50"
                  style={{
                    backgroundColor: '#282E33',
                    border: '1px solid rgba(166, 197, 226, 0.16)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-[#DEE4EA]">Copiar cartao</h5>
                    <button
                      onClick={() => setShowCopy(false)}
                      className="p-1 hover:bg-[#A1BDD914] rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-[#9FADBC]" />
                    </button>
                  </div>
                  <p className="text-[11px] font-semibold text-[#9FADBC] uppercase mb-1.5">Nome</p>
                  <input
                    autoFocus
                    value={copyName}
                    onChange={(e) => setCopyName(e.target.value)}
                    className="w-full rounded px-3 py-1.5 text-sm text-[#B6C2CF] focus:outline-none focus:ring-1 focus:ring-[#579DFF] mb-3 border-none"
                    style={{ backgroundColor: '#22272B' }}
                  />
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 bg-[#579DFF] text-[#1D2125] text-sm font-medium rounded hover:bg-[#85B8FF] transition-colors"
                  >
                    Criar cartao
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Prioridade */}
          <div className="relative">
            <PillButton
              icon={<ArrowUp className="w-4 h-4" />}
              label="Prioridade"
              value={card?.priority ? card.priority.charAt(0).toUpperCase() + card.priority.slice(1) : undefined}
              onClick={() => setShowPriority(!showPriority)}
            />
            {showPriority && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPriority(false)} />
                <div
                  className="absolute left-0 top-10 w-[240px] rounded-lg p-3 z-50"
                  style={{
                    backgroundColor: '#282E33',
                    border: '1px solid rgba(166, 197, 226, 0.16)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-[#DEE4EA]">Prioridade</h5>
                    <button
                      onClick={() => setShowPriority(false)}
                      className="p-1 hover:bg-[#A1BDD914] rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-[#9FADBC]" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {([
                      { value: 'critical' as const, label: 'Critical', color: '#F87168', Icon: ArrowUp },
                      { value: 'high' as const, label: 'High', color: '#FF9F1A', Icon: ArrowUp },
                      { value: 'medium' as const, label: 'Medium', color: '#F5CD47', Icon: Minus },
                      { value: 'low' as const, label: 'Low', color: '#579DFF', Icon: ArrowDown },
                    ] as const).map(({ value, label, color, Icon }) => (
                      <button
                        key={value}
                        onClick={async () => {
                          const newPriority = card.priority === value ? null : value
                          await updateCard(cardId, { priority: newPriority })
                          setCard({ ...card, priority: newPriority })
                          setShowPriority(false)
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                          card.priority === value
                            ? 'bg-[#579DFF1A] text-[#DEE4EA]'
                            : 'text-[#B6C2CF] hover:bg-[#A1BDD914]'
                        }`}
                      >
                        <Icon className="w-4 h-4" style={{ color }} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Estimativa */}
          <div className="relative">
            <PillButton
              icon={<Clock className="w-4 h-4" />}
              label="Estimativa"
              value={estimatedHours ? `${estimatedHours}h` : undefined}
              onClick={() => {
                setEstimateInput(estimatedHours ? String(estimatedHours) : '')
                setShowEstimate(!showEstimate)
              }}
            />
            {showEstimate && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowEstimate(false)} />
                <div
                  className="absolute left-0 top-10 w-[304px] rounded-lg p-3 z-50"
                  style={{
                    backgroundColor: '#282E33',
                    border: '1px solid rgba(166, 197, 226, 0.16)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-[#DEE4EA]">Estimativa (horas)</h5>
                    <button
                      onClick={() => setShowEstimate(false)}
                      className="p-1 hover:bg-[#A1BDD914] rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-[#9FADBC]" />
                    </button>
                  </div>
                  <input
                    autoFocus
                    type="number"
                    min="0"
                    step="0.5"
                    value={estimateInput}
                    onChange={(e) => setEstimateInput(e.target.value)}
                    placeholder="Ex: 4"
                    className="w-full rounded px-3 py-1.5 text-sm text-[#B6C2CF] focus:outline-none focus:ring-1 focus:ring-[#579DFF] mb-3 border-none"
                    style={{ backgroundColor: '#22272B' }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const hours = estimateInput ? parseFloat(estimateInput) : null
                        await updateCard(cardId, { estimated_hours: hours })
                        setEstimatedHours(hours)
                        setShowEstimate(false)
                      }}
                      className="px-3 py-1.5 bg-[#579DFF] text-[#1D2125] text-sm font-medium rounded hover:bg-[#85B8FF] transition-colors"
                    >
                      Salvar
                    </button>
                    {estimatedHours && (
                      <button
                        onClick={async () => {
                          await updateCard(cardId, { estimated_hours: null })
                          setEstimatedHours(null)
                          setEstimateInput('')
                          setShowEstimate(false)
                        }}
                        className="px-3 py-1.5 text-sm text-[#F87168] hover:bg-[#A1BDD914] rounded transition-colors"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Tipo */}
          <div className="relative">
            <PillButton
              icon={<CheckSquare className="w-4 h-4" />}
              label="Tipo"
              value={cardType !== 'task' ? cardType.charAt(0).toUpperCase() + cardType.slice(1) : undefined}
              onClick={() => setShowCardType(!showCardType)}
            />
            {showCardType && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCardType(false)} />
                <div
                  className="absolute left-0 top-10 w-[240px] rounded-lg p-3 z-50"
                  style={{
                    backgroundColor: '#282E33',
                    border: '1px solid rgba(166, 197, 226, 0.16)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-[#DEE4EA]">Tipo de card</h5>
                    <button
                      onClick={() => setShowCardType(false)}
                      className="p-1 hover:bg-[#A1BDD914] rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-[#9FADBC]" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {([
                      { value: 'task', label: 'Task', color: '#B6C2CF', Icon: CheckSquare },
                      { value: 'bug', label: 'Bug', color: '#F87168', Icon: Bug },
                      { value: 'feature', label: 'Feature', color: '#4BCE97', Icon: Sparkles },
                      { value: 'story', label: 'Story', color: '#579DFF', Icon: BookOpen },
                      { value: 'improvement', label: 'Improvement', color: '#FF9F1A', Icon: TrendingUp },
                      { value: 'epic', label: 'Epic', color: '#9F8FEF', Icon: Zap },
                    ] as const).map(({ value, label, color, Icon }) => (
                      <button
                        key={value}
                        onClick={async () => {
                          await updateCard(cardId, { card_type: value })
                          setCardType(value)
                          setCard({ ...card, card_type: value })
                          setShowCardType(false)
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                          cardType === value
                            ? 'bg-[#579DFF1A] text-[#DEE4EA]'
                            : 'text-[#B6C2CF] hover:bg-[#A1BDD914]'
                        }`}
                      >
                        <Icon className="w-4 h-4" style={{ color }} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sprint */}
          <div className="relative">
            <PillButton
              icon={<Target className="w-4 h-4" />}
              label="Sprint"
              value={card?.sprint_id ? sprints?.find((s: Sprint) => s.id === card.sprint_id)?.name : undefined}
              onClick={() => setShowSprint(!showSprint)}
            />
            {showSprint && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSprint(false)} />
                <div
                  className="absolute left-0 top-10 w-[280px] rounded-lg p-3 z-50"
                  style={{
                    backgroundColor: '#282E33',
                    border: '1px solid rgba(166, 197, 226, 0.16)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-[#DEE4EA]">Sprint</h5>
                    <button
                      onClick={() => setShowSprint(false)}
                      className="p-1 hover:bg-[#A1BDD914] rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-[#9FADBC]" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={async () => {
                        await assignCardToSprint(cardId, null)
                        setCard({ ...card, sprint_id: null })
                        setShowSprint(false)
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                        !card.sprint_id
                          ? 'bg-[#579DFF1A] text-[#DEE4EA]'
                          : 'text-[#B6C2CF] hover:bg-[#A1BDD914]'
                      }`}
                    >
                      Nenhuma sprint
                    </button>
                    {sprints.map((sprint: Sprint) => (
                      <button
                        key={sprint.id}
                        onClick={async () => {
                          await assignCardToSprint(cardId, sprint.id)
                          setCard({ ...card, sprint_id: sprint.id })
                          setShowSprint(false)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
                          card.sprint_id === sprint.id
                            ? 'bg-[#579DFF1A] text-[#DEE4EA]'
                            : 'text-[#B6C2CF] hover:bg-[#A1BDD914]'
                        }`}
                      >
                        <span>{sprint.name}</span>
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          sprint.status === 'active' ? 'bg-[#4BCE97]/20 text-[#4BCE97]' :
                          sprint.status === 'completed' ? 'bg-[#579DFF]/20 text-[#579DFF]' :
                          'bg-[#A1BDD914] text-[#9FADBC]'
                        }`}>
                          {sprint.status === 'planning' ? 'Plan' : sprint.status === 'active' ? 'Ativo' : 'Done'}
                        </span>
                      </button>
                    ))}
                    {sprints.length === 0 && (
                      <p className="text-xs text-[#738496] px-3 py-1">Nenhuma sprint criada</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Story Points */}
          <div className="relative">
            <PillButton
              icon={<Zap className="w-4 h-4" />}
              label="Pontos"
              value={card?.story_points ? `${card.story_points} pts` : undefined}
              onClick={() => setShowStoryPoints(!showStoryPoints)}
            />
            {showStoryPoints && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowStoryPoints(false)} />
                <div
                  className="absolute left-0 top-10 w-[240px] rounded-lg p-3 z-50"
                  style={{
                    backgroundColor: '#282E33',
                    border: '1px solid rgba(166, 197, 226, 0.16)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-[#DEE4EA]">Story Points</h5>
                    <button
                      onClick={() => setShowStoryPoints(false)}
                      className="p-1 hover:bg-[#A1BDD914] rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-[#9FADBC]" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 5, 8, 13, 21].map((points) => (
                      <button
                        key={points}
                        onClick={async () => {
                          const newPoints = storyPoints === points ? null : points
                          await updateCard(cardId, { story_points: newPoints })
                          setStoryPoints(newPoints)
                          setCard({ ...card, story_points: newPoints })
                          setShowStoryPoints(false)
                        }}
                        className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${
                          storyPoints === points
                            ? 'bg-[#579DFF] text-[#1D2125]'
                            : 'bg-[#22272B] text-[#B6C2CF] hover:bg-[#A1BDD914]'
                        }`}
                      >
                        {points}
                      </button>
                    ))}
                  </div>
                  {storyPoints && (
                    <button
                      onClick={async () => {
                        await updateCard(cardId, { story_points: null })
                        setStoryPoints(null)
                        setCard({ ...card, story_points: null })
                        setShowStoryPoints(false)
                      }}
                      className="mt-2 text-xs text-[#F87168] hover:text-[#FF9F9F]"
                    >
                      Remover pontos
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ============ TWO COLUMN LAYOUT ============ */}
        <div className="flex gap-0 px-4 pb-4 min-h-0 flex-1 overflow-hidden">

          {/* ---- LEFT COLUMN (content) ---- */}
          <div className="flex-[3] min-w-0 pr-4 space-y-5 overflow-y-auto" style={{ borderRight: '1px solid rgba(166, 197, 226, 0.08)' }}>

            {/* Labels row */}
            {cardLabels.length > 0 && (
              <div>
                <div className="flex flex-wrap gap-1.5">
                  {cardLabels.map((label) => (
                    <span
                      key={label.id}
                      className="inline-flex items-center justify-center text-xs font-medium text-white rounded"
                      style={{
                        backgroundColor: label.color,
                        minWidth: '36px',
                        height: '24px',
                        padding: '0 10px',
                        borderRadius: '4px',
                      }}
                    >
                      {label.name || ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Members row */}
            {card.card_members?.length > 0 && (
              <div className="flex -space-x-1">
                {card.card_members.map((m: any) => {
                  const member = boardMembers.find((bm) => bm.user_id === m.user_id)
                  const displayName = member?.name || member?.email || 'Usuario'
                  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                  return (
                    <div
                      key={m.user_id}
                      className="w-7 h-7 rounded-full bg-[#579DFF] flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-[#282E33]"
                      title={displayName}
                    >
                      {initials}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Due date badge */}
            {card.due_date && dueDateStatus && (
              <div>
                <h4 className="text-[11px] font-semibold text-[#9FADBC] uppercase tracking-wide mb-1.5">Data Entrega</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={card.due_complete || false}
                    onChange={async () => {
                      await updateCard(cardId, { due_complete: !card.due_complete })
                      loadCard()
                    }}
                    className="w-4 h-4 rounded border-[#738496] bg-transparent accent-[#579DFF] cursor-pointer"
                  />
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold"
                    style={{
                      backgroundColor: dueDateColors[dueDateStatus].bg,
                      color: dueDateColors[dueDateStatus].text,
                    }}
                  >
                    {new Date(card.due_date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {dueDateColors[dueDateStatus].label && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: dueDateColors[dueDateStatus].bg,
                        color: dueDateColors[dueDateStatus].text,
                      }}
                    >
                      {dueDateColors[dueDateStatus].label}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Tempo */}
            <div>
              <h4 className="text-base font-semibold text-[#DEE4EA] mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Tempo
              </h4>
              <div className="ml-7 flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#22272B' }}>
                  <span className={`text-lg font-mono font-bold ${timerState === 'running' ? 'text-[#4BCE97]' : timerState === 'paused' ? 'text-[#F5CD47]' : 'text-[#B6C2CF]'}`}>
                    {timerState !== 'idle' ? formatTime(elapsed) : formatTime(totalTime)}
                  </span>
                  {timerState === 'paused' && (
                    <span className="text-[10px] text-[#F5CD47] uppercase font-semibold animate-pulse">pausado</span>
                  )}
                </div>

                {timerState === 'idle' && (
                  <button onClick={handleStartTimer}
                    className="p-2 rounded-lg bg-[#4BCE97] hover:bg-[#7EE2B8] text-[#1D2125] transition-colors"
                    title="Iniciar timer"
                  >
                    <Play className="w-4 h-4" fill="currentColor" />
                  </button>
                )}

                {timerState === 'running' && (
                  <>
                    <button onClick={handlePauseTimer}
                      className="p-2 rounded-lg bg-[#F5CD47] hover:bg-[#F5CD47CC] text-[#1D2125] transition-colors"
                      title="Pausar timer"
                    >
                      <Pause className="w-4 h-4" fill="currentColor" />
                    </button>
                    <button onClick={handleStopTimer}
                      className="p-2 rounded-lg bg-[#F87168] hover:bg-[#FF9F9F] text-[#1D2125] transition-colors"
                      title="Parar e salvar"
                    >
                      <Square className="w-4 h-4" fill="currentColor" />
                    </button>
                  </>
                )}

                {timerState === 'paused' && (
                  <>
                    <button onClick={handleResumeTimer}
                      className="p-2 rounded-lg bg-[#4BCE97] hover:bg-[#7EE2B8] text-[#1D2125] transition-colors"
                      title="Retomar timer"
                    >
                      <Play className="w-4 h-4" fill="currentColor" />
                    </button>
                    <button onClick={handleStopTimer}
                      className="p-2 rounded-lg bg-[#F87168] hover:bg-[#FF9F9F] text-[#1D2125] transition-colors"
                      title="Parar e salvar"
                    >
                      <Square className="w-4 h-4" fill="currentColor" />
                    </button>
                  </>
                )}

                {totalTime > 0 && timerState === 'idle' && (
                  <span className="text-xs text-[#9FADBC]">
                    Total: {formatTime(totalTime)}
                  </span>
                )}
              </div>
              {estimatedHours && (
                <div className="ml-7 mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#22272B' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (totalTime / (estimatedHours * 3600)) * 100)}%`,
                        backgroundColor: totalTime > estimatedHours * 3600 ? '#F87168' : '#4BCE97',
                      }}
                    />
                  </div>
                  <span className="text-xs text-[#9FADBC]">
                    {formatTime(totalTime)} / {estimatedHours}h
                  </span>
                </div>
              )}
              {showManualEntry ? (
                <div className="ml-7 mt-2 p-3 rounded-lg" style={{ backgroundColor: '#22272B' }}>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="text-[10px] text-[#9FADBC] uppercase block mb-1">Data</label>
                      <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)}
                        className="w-full px-2 py-1.5 rounded text-xs bg-[#1D2125] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#9FADBC] uppercase block mb-1">Inicio</label>
                      <input type="time" value={manualStart} onChange={e => setManualStart(e.target.value)}
                        className="w-full px-2 py-1.5 rounded text-xs bg-[#1D2125] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#9FADBC] uppercase block mb-1">Fim</label>
                      <input type="time" value={manualEnd} onChange={e => setManualEnd(e.target.value)}
                        className="w-full px-2 py-1.5 rounded text-xs bg-[#1D2125] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]" />
                    </div>
                  </div>
                  <input value={manualDesc} onChange={e => setManualDesc(e.target.value)} placeholder="Descricao (opcional)"
                    className="w-full px-2 py-1.5 rounded text-xs bg-[#1D2125] text-[#B6C2CF] placeholder-[#738496] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF] mb-2" />
                  <div className="flex gap-2">
                    <button disabled={manualLoading || !manualDate || !manualStart || !manualEnd}
                      onClick={async () => {
                        setManualLoading(true)
                        try {
                          await addManualTimeEntry(cardId, `${manualDate}T${manualStart}:00`, `${manualDate}T${manualEnd}:00`, manualDesc || undefined)
                          const entries = await getCardTimeEntries(cardId)
                          setTimeEntries(entries)
                          setTotalTime(entries.reduce((s: number, e: any) => s + (e.duration_seconds || 0), 0))
                          setShowManualEntry(false); setManualDate(''); setManualStart(''); setManualEnd(''); setManualDesc('')
                        } catch (err: any) { alert(err.message) }
                        finally { setManualLoading(false) }
                      }}
                      className="px-3 py-1 bg-[#579DFF] text-[#1D2125] text-xs font-medium rounded hover:bg-[#85B8FF] disabled:opacity-50">
                      {manualLoading ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button onClick={() => setShowManualEntry(false)} className="px-3 py-1 text-xs text-[#9FADBC] hover:text-[#DEE4EA]">Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setShowManualEntry(true); setManualDate(new Date().toISOString().split('T')[0]) }}
                  className="ml-7 mt-2 text-xs text-[#579DFF] hover:text-[#85B8FF] transition-colors">
                  + Registrar manualmente
                </button>
              )}
              {timeEntries.length > 0 && (
                <div className="ml-7 mt-3 max-h-[140px] overflow-y-auto space-y-1">
                  {timeEntries.map((entry: any) => {
                    const isEditing = editingEntryId === entry.id
                    const startDate = new Date(entry.started_at)
                    const endDate = entry.stopped_at ? new Date(entry.stopped_at) : null

                    if (isEditing) {
                      return (
                        <div key={entry.id} className="p-2 rounded-lg" style={{ backgroundColor: '#1D2125' }}>
                          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                            <input type="date" value={editEntryDate} onChange={e => setEditEntryDate(e.target.value)}
                              className="px-1.5 py-1 rounded text-[11px] bg-[#22272B] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]" />
                            <input type="time" value={editEntryStart} onChange={e => setEditEntryStart(e.target.value)}
                              className="px-1.5 py-1 rounded text-[11px] bg-[#22272B] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]" />
                            <input type="time" value={editEntryEnd} onChange={e => setEditEntryEnd(e.target.value)}
                              className="px-1.5 py-1 rounded text-[11px] bg-[#22272B] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]" />
                          </div>
                          <div className="flex gap-1.5">
                            <button disabled={editEntryLoading || !editEntryDate || !editEntryStart || !editEntryEnd}
                              onClick={async () => {
                                setEditEntryLoading(true)
                                try {
                                  await updateTimeEntry(entry.id, `${editEntryDate}T${editEntryStart}:00`, `${editEntryDate}T${editEntryEnd}:00`, editEntryDesc || undefined)
                                  const entries = await getCardTimeEntries(cardId)
                                  setTimeEntries(entries)
                                  setTotalTime(entries.reduce((s: number, e: any) => s + (e.duration_seconds || 0), 0))
                                  setEditingEntryId(null)
                                } catch (err: any) { alert(err.message) }
                                finally { setEditEntryLoading(false) }
                              }}
                              className="px-2 py-0.5 bg-[#579DFF] text-[#1D2125] text-[10px] font-medium rounded hover:bg-[#85B8FF] disabled:opacity-50">
                              {editEntryLoading ? '...' : 'Salvar'}
                            </button>
                            <button onClick={() => setEditingEntryId(null)} className="px-2 py-0.5 text-[10px] text-[#9FADBC]">Cancelar</button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={entry.id} className="flex items-center justify-between text-xs text-[#8C9BAB] px-2 py-1 group">
                        <span>{startDate.toLocaleDateString('pt-BR')} {startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-[#B6C2CF]">{formatTime(entry.duration_seconds || 0)}</span>
                          <button
                            onClick={() => {
                              setEditingEntryId(entry.id)
                              setEditEntryDate(startDate.toISOString().split('T')[0])
                              setEditEntryStart(startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
                              setEditEntryEnd(endDate ? endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '')
                              setEditEntryDesc(entry.description || '')
                            }}
                            className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#A1BDD914] transition-all"
                            title="Editar registro"
                          >
                            <Pencil className="w-3 h-3 text-[#9FADBC]" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('Excluir este registro?')) return
                              await deleteTimeEntry(entry.id)
                              const entries = await getCardTimeEntries(cardId)
                              setTimeEntries(entries)
                              setTotalTime(entries.reduce((s: number, e: any) => s + (e.duration_seconds || 0), 0))
                            }}
                            className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#F8716820] transition-all"
                            title="Excluir registro"
                          >
                            <Trash2 className="w-3 h-3 text-[#9FADBC] hover:text-[#F87168]" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-semibold text-[#DEE4EA] mb-2 flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-[#9FADBC]" />
                Descricao
              </h4>
              {editingDesc ? (
                <div className="ml-6">
                  <textarea
                    autoFocus
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg px-3 py-2 text-sm text-[#B6C2CF] focus:outline-none focus:ring-1 focus:ring-[#579DFF] resize-none border-none"
                    style={{ backgroundColor: '#22272B' }}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleSaveDescription}
                      disabled={savingDesc}
                      className="px-3 py-1.5 bg-[#579DFF] text-[#1D2125] text-sm font-medium rounded hover:bg-[#85B8FF] transition-colors disabled:opacity-50"
                    >
                      {savingDesc ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => {
                        setDescription(card.description || '')
                        setEditingDesc(false)
                      }}
                      disabled={savingDesc}
                      className="px-3 py-1.5 text-sm text-[#B6C2CF] hover:bg-[#A1BDD914] rounded transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingDesc(true)}
                  className="ml-6 rounded-lg px-3 py-2.5 text-sm cursor-pointer min-h-[72px] transition-colors whitespace-pre-wrap"
                  style={{
                    backgroundColor: '#22272B',
                    color: card.description ? '#B6C2CF' : '#738496',
                  }}
                >
                  {card.description || 'Adicione uma descricao mais detalhada...'}
                </div>
              )}
            </div>

            {/* Custom Fields */}
            {customFieldDefs.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[#DEE4EA] mb-2 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#9FADBC]" />
                  Campos personalizados
                </h4>
                <div className="ml-6 space-y-2">
                  {customFieldDefs.map((field: any) => (
                    <div key={field.id} className="flex items-center gap-3">
                      <label className="text-xs text-[#9FADBC] w-28 shrink-0 truncate">{field.name}</label>
                      {field.field_type === 'text' && (
                        <input
                          type="text"
                          value={customFieldValues[field.id] || ''}
                          onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                          onBlur={async () => {
                            const val = customFieldValues[field.id]?.trim() || null
                            await setCustomFieldValue(cardId, field.id, val)
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded text-sm bg-[#22272B] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                        />
                      )}
                      {field.field_type === 'number' && (
                        <input
                          type="number"
                          value={customFieldValues[field.id] || ''}
                          onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                          onBlur={async () => {
                            const val = customFieldValues[field.id]?.trim() || null
                            await setCustomFieldValue(cardId, field.id, val)
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded text-sm bg-[#22272B] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                        />
                      )}
                      {field.field_type === 'date' && (
                        <input
                          type="date"
                          value={customFieldValues[field.id] || ''}
                          onChange={async (e) => {
                            const val = e.target.value || null
                            setCustomFieldValues((prev) => ({ ...prev, [field.id]: val || '' }))
                            await setCustomFieldValue(cardId, field.id, val)
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded text-sm bg-[#22272B] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                        />
                      )}
                      {field.field_type === 'dropdown' && (
                        <select
                          value={customFieldValues[field.id] || ''}
                          onChange={async (e) => {
                            const val = e.target.value || null
                            setCustomFieldValues((prev) => ({ ...prev, [field.id]: val || '' }))
                            await setCustomFieldValue(cardId, field.id, val)
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded text-sm bg-[#22272B] text-[#B6C2CF] border border-[#A6C5E229] focus:outline-none focus:border-[#579DFF]"
                        >
                          <option value="">Selecione...</option>
                          {(field.options as string[])?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      {field.field_type === 'checkbox' && (
                        <input
                          type="checkbox"
                          checked={customFieldValues[field.id] === 'true'}
                          onChange={async (e) => {
                            const val = e.target.checked ? 'true' : null
                            setCustomFieldValues((prev) => ({ ...prev, [field.id]: val || '' }))
                            await setCustomFieldValue(cardId, field.id, val)
                          }}
                          className="w-4 h-4 rounded border-[#738496] bg-transparent accent-[#579DFF] cursor-pointer"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklists */}
            {card.checklists?.map((checklist: any) => {
              const total = checklist.checklist_items?.length || 0
              const done = checklist.checklist_items?.filter((i: any) => i.checked).length || 0
              const pct = total > 0 ? Math.round((done / total) * 100) : 0

              return (
                <div key={checklist.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-[#DEE4EA] flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-[#9FADBC]" />
                      {checklist.name}
                    </h4>
                    <button
                      onClick={async () => {
                        if (!confirm('Excluir checklist inteira?')) return
                        await deleteChecklist(checklist.id)
                        await loadCard()
                      }}
                      className="p-1 rounded hover:bg-[#A1BDD914] transition-colors"
                      title="Excluir checklist"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[#9FADBC] hover:text-[#F87168]" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="ml-6 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-[#9FADBC] w-7 text-right">{pct}%</span>
                      <div
                        className="flex-1 h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: '#A1BDD914' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct === 100 ? '#4BCE97' : '#579DFF',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="ml-6 space-y-0.5">
                    {checklist.checklist_items
                      ?.sort((a: any, b: any) => a.position - b.position)
                      .map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-[#A1BDD914] group transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => handleToggleItem(item.id, item.checked)}
                            className="w-4 h-4 rounded border-[#738496] bg-transparent accent-[#579DFF] cursor-pointer"
                          />
                          <span
                            className={`flex-1 text-sm ${
                              item.checked
                                ? 'text-[#738496] line-through'
                                : 'text-[#B6C2CF]'
                            }`}
                          >
                            {item.name}
                          </span>
                          <button
                            onClick={async () => {
                              await deleteChecklistItem(item.id)
                              await loadCard()
                            }}
                            className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#F8716820] transition-all"
                            title="Excluir item"
                          >
                            <X className="w-3.5 h-3.5 text-[#9FADBC] hover:text-[#F87168]" />
                          </button>
                        </div>
                      ))}
                  </div>

                  {/* Add item */}
                  <div className="ml-6 mt-2 flex gap-2">
                    <input
                      value={newItemTexts[checklist.id] || ''}
                      onChange={(e) =>
                        setNewItemTexts({ ...newItemTexts, [checklist.id]: e.target.value })
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleAddItem(checklist.id)}
                      placeholder="Adicionar item..."
                      className="flex-1 rounded px-3 py-1.5 text-sm text-[#B6C2CF] placeholder-[#738496] focus:outline-none focus:ring-1 focus:ring-[#579DFF] border-none"
                      style={{ backgroundColor: '#22272B' }}
                    />
                    <button
                      onClick={() => handleAddItem(checklist.id)}
                      disabled={addingItem === checklist.id}
                      className="px-3 py-1.5 text-sm rounded font-medium text-[#B6C2CF] hover:bg-[#A1BDD929] transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#A1BDD914' }}
                    >
                      {addingItem === checklist.id ? 'Adicionando...' : 'Adicionar'}
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[#DEE4EA] mb-2 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-[#9FADBC]" />
                  Anexos
                </h4>
                <div className="ml-6 space-y-1.5">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg group transition-colors"
                      style={{ backgroundColor: '#22272B' }}
                    >
                      <Paperclip className="w-3.5 h-3.5 text-[#9FADBC] shrink-0" />
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-sm text-[#579DFF] hover:text-[#85B8FF] truncate"
                      >
                        {att.name}
                      </a>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-[#A1BDD914] transition-colors"
                        title="Abrir"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#9FADBC]" />
                      </a>
                      <button
                        onClick={async () => {
                          await deleteAttachment(att.id)
                          setAttachments((prev) => prev.filter((a) => a.id !== att.id))
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[#F8716820] transition-all"
                        title="Excluir anexo"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[#9FADBC] hover:text-[#F87168]" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ---- RIGHT COLUMN (comments & activity) ---- */}
          <div className="flex-[2] min-w-0 pl-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-[#DEE4EA] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#9FADBC]" />
                Comentarios e atividade
              </h4>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-[#579DFF] hover:underline"
              >
                {showDetails ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
              </button>
            </div>

            {/* Comment input */}
            <form onSubmit={handleAddComment} className="mb-4">
              <div style={{ position: 'relative' }}>
                <textarea
                  value={commentText}
                  onChange={handleCommentChange}
                  placeholder="Escrever um comentario... Use @ para mencionar"
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-sm text-[#B6C2CF] placeholder-[#738496] focus:outline-none focus:ring-1 focus:ring-[#579DFF] resize-none border-none"
                  style={{ backgroundColor: '#22272B' }}
                />
                {showMentionDropdown && (
                  <div style={{
                    position: 'absolute', bottom: '100%', left: 0, width: 250,
                    background: '#282E33', borderRadius: 8, border: '1px solid rgba(166,197,226,0.16)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 50, maxHeight: 200, overflowY: 'auto',
                    marginBottom: 4,
                  }}>
                    <div style={{ padding: '6px 10px', fontSize: 10, color: '#9FADBC', fontWeight: 600, textTransform: 'uppercase' }}>
                      Mencionar membro
                    </div>
                    {(boardMembers || [])
                      .filter((m: any) => !mentionFilter || (m.name || '').toLowerCase().includes(mentionFilter))
                      .map((m: any) => {
                        const mName = m.name || m.email || 'Usuario'
                        const initials = mName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                        return (
                          <button key={m.user_id} onClick={(e) => { e.preventDefault(); insertMention(m) }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#DEE4EA', fontSize: 13, textAlign: 'left' }}
                            className="hover:bg-[#A1BDD914]"
                          >
                            <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#579DFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#1D2125' }}>
                              {initials}
                            </div>
                            {mName}
                          </button>
                        )
                      })
                    }
                  </div>
                )}
              </div>
              {commentText.trim() && (
                <button
                  type="submit"
                  disabled={addingComment}
                  className="mt-2 px-3 py-1.5 bg-[#579DFF] text-[#1D2125] text-sm font-medium rounded hover:bg-[#85B8FF] transition-colors disabled:opacity-50"
                >
                  {addingComment ? 'Salvando...' : 'Salvar'}
                </button>
              )}
            </form>

            {/* Comments list */}
            <div className="space-y-3 flex-1 overflow-y-auto">
              {card.comments
                ?.sort(
                  (a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
                .map((comment: any) => {
                  const isOwner = currentUserId === comment.user_id
                  const isEditing = editingCommentId === comment.id

                  const cmember = boardMembers.find((bm: any) => bm.user_id === comment.user_id)
                  const commentName = cmember?.name || cmember?.email || 'Usuario'
                  const commentInitials = commentName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

                  return (
                        <div key={comment.id} className="flex gap-2.5 group">
                          <div className="w-7 h-7 rounded-full bg-[#579DFF] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {commentInitials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-[#DEE4EA]">{commentName}</span>
                              <span className="text-[11px] text-[#738496]">
                                {new Date(comment.created_at).toLocaleString('pt-BR')}
                              </span>
                              {isOwner && !isEditing && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(comment.id)
                                      setEditingCommentText(comment.text)
                                    }}
                                    className="p-1 rounded hover:bg-[#A1BDD914] transition-colors"
                                    title="Editar"
                                  >
                                    <Pencil className="w-3 h-3 text-[#9FADBC]" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm('Excluir este comentario?')) return
                                      await deleteComment(comment.id)
                                      await loadCard()
                                    }}
                                    className="p-1 rounded hover:bg-[#F8716820] transition-colors"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3 h-3 text-[#9FADBC] hover:text-[#F87168]" />
                                  </button>
                                </div>
                              )}
                            </div>
                            {isEditing ? (
                              <div>
                                <textarea
                                  autoFocus
                                  value={editingCommentText}
                                  onChange={(e) => setEditingCommentText(e.target.value)}
                                  rows={2}
                                  className="w-full rounded px-2.5 py-1.5 text-sm text-[#B6C2CF] focus:outline-none focus:ring-1 focus:ring-[#579DFF] resize-none border-none"
                                  style={{ backgroundColor: '#22272B' }}
                                />
                                <div className="flex gap-2 mt-1">
                                  <button
                                    onClick={async () => {
                                      if (!editingCommentText.trim()) return
                                      await updateComment(comment.id, editingCommentText.trim())
                                      setEditingCommentId(null)
                                      await loadCard()
                                    }}
                                    className="px-2.5 py-1 bg-[#579DFF] text-[#1D2125] text-xs font-medium rounded hover:bg-[#85B8FF] transition-colors"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={() => setEditingCommentId(null)}
                                    className="px-2.5 py-1 text-xs text-[#B6C2CF] hover:bg-[#A1BDD914] rounded transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p
                                className="text-sm text-[#B6C2CF] rounded px-2.5 py-1.5"
                                style={{ backgroundColor: '#22272B' }}
                              >
                                {renderCommentText(comment.text)}
                              </p>
                            )}
                          </div>
                        </div>
                  )
                })}
            </div>
          </div>
        </div>

        {/* ============ BOTTOM TAB BAR ============ */}
        <div
          className="flex items-center gap-1 px-4 py-2 rounded-b-xl"
          style={{ backgroundColor: '#22272B', borderTop: '1px solid rgba(166, 197, 226, 0.08)' }}
        >
          <TabButton
            icon={<Plug className="w-4 h-4" />}
            label="Power-ups"
            active={activeTab === 'powerups'}
            onClick={() => setActiveTab('powerups')}
          />
          <TabButton
            icon={<Zap className="w-4 h-4" />}
            label="Automacoes"
            active={activeTab === 'automations'}
            onClick={() => setActiveTab('automations')}
          />
          <TabButton
            icon={<MessageSquare className="w-4 h-4" />}
            label="Comentarios"
            active={activeTab === 'comments'}
            onClick={() => setActiveTab('comments')}
          />
        </div>
      </div>
    </div>
  )
}

/* ============ SUB-COMPONENTS ============ */

function PillButton({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-[#A1BDD929]"
      style={{ backgroundColor: value ? '#579DFF20' : '#22272B', color: value ? '#579DFF' : '#B6C2CF' }}
    >
      {icon}
      {value || label}
    </button>
  )
}

function TabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
        active
          ? 'text-[#579DFF] bg-[#579DFF1A]'
          : 'text-[#9FADBC] hover:bg-[#A1BDD914] hover:text-[#B6C2CF]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
