'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card, Label } from '@/types/database'
import { Clock, MessageSquare, CheckSquare, Paperclip, AlignLeft, ArrowUp, ArrowDown, Minus, Bug, BookOpen, TrendingUp, Sparkles, Zap } from 'lucide-react'

const TYPE_ICONS: Record<string, { icon: typeof CheckSquare; color: string }> = {
  task: { icon: CheckSquare, color: '#B6C2CF' },
  bug: { icon: Bug, color: '#F87168' },
  feature: { icon: Sparkles, color: '#4BCE97' },
  story: { icon: BookOpen, color: '#579DFF' },
  improvement: { icon: TrendingUp, color: '#FF9F1A' },
  epic: { icon: Zap, color: '#9F8FEF' },
}

export function BoardCard({
  card,
  listId,
  onClick,
  labels,
}: {
  card: Card
  listId?: string
  onClick?: () => void
  labels: Label[]
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', card, listId: listId || card.list_id },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const cardLabels = labels.filter((l) =>
    card.card_labels?.some((cl: { label_id: string }) => cl.label_id === l.id)
  )

  const commentCount = card.comments?.length ?? 0
  const attachmentCount = (card as any).attachments?.length ?? 0

  const checklistItems = card.checklists?.flatMap((cl: any) => cl.checklist_items || []) ?? []
  const checklistTotal = checklistItems.length
  const checklistDone = checklistItems.filter((i: any) => i.checked).length
  const hasChecklists = (card.checklists?.length ?? 0) > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-[#22272B] rounded-lg cursor-pointer px-3 py-2 group outline-none border border-transparent hover:border-[#579DFF]/60 focus-visible:border-[#579DFF] transition-all duration-150"
    >
      {card.cover_color && (
        <div
          className="h-8 -mx-3 -mt-2 mb-1.5 rounded-t-lg"
          style={{ backgroundColor: card.cover_color }}
        />
      )}

      {cardLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {cardLabels.map((label) => (
            <span
              key={label.id}
              className="h-2 w-10 rounded inline-block"
              style={{ backgroundColor: label.color }}
              title={label.name}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {card.priority && (
          <span className="flex items-center gap-0.5 text-xs" title={`Prioridade: ${card.priority}`}>
            {card.priority === 'critical' && <ArrowUp className="w-3 h-3 text-[#F87168]" />}
            {card.priority === 'high' && <ArrowUp className="w-3 h-3 text-[#FF9F1A]" />}
            {card.priority === 'medium' && <Minus className="w-3 h-3 text-[#F5CD47]" />}
            {card.priority === 'low' && <ArrowDown className="w-3 h-3 text-[#579DFF]" />}
          </span>
        )}
        {card.card_type && card.card_type !== 'task' && (() => {
          const typeInfo = TYPE_ICONS[card.card_type]
          if (!typeInfo) return null
          const Icon = typeInfo.icon
          return (
            <span title={card.card_type} className="shrink-0">
              <Icon className="w-3.5 h-3.5" style={{ color: typeInfo.color }} />
            </span>
          )
        })()}
        <p className="text-sm text-[#B6C2CF] leading-snug">{card.name}</p>
        {card.story_points != null && card.story_points > 0 && (
          <span className="shrink-0 text-[10px] font-bold text-[#9FADBC] bg-[#A1BDD914] rounded-full w-5 h-5 flex items-center justify-center" title={`${card.story_points} pts`}>
            {card.story_points}
          </span>
        )}
      </div>

      {(card.due_date || card.description || hasChecklists || commentCount > 0 || attachmentCount > 0) && (
        <div className="flex items-center gap-2 mt-2 text-[#8C9BAB] flex-wrap">
          {card.due_date && (
            <span className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${
              card.due_complete
                ? 'bg-[#1F845A] text-white'
                : new Date(card.due_date) < new Date()
                ? 'bg-[#C9372C] text-white'
                : 'text-[#8C9BAB]'
            }`}>
              <Clock className="w-3 h-3" />
              {new Date(card.due_date).toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          )}

          {card.description && (
            <span className="text-xs text-[#8C9BAB]" title="Tem descricao">
              <AlignLeft className="w-3 h-3" />
            </span>
          )}

          {commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-[#8C9BAB]" title={`${commentCount} comentario(s)`}>
              <MessageSquare className="w-3 h-3" />
              {commentCount}
            </span>
          )}

          {hasChecklists && (
            <span
              className={`flex items-center gap-0.5 text-xs px-1 py-0.5 rounded ${
                checklistDone === checklistTotal
                  ? 'bg-[#1F845A] text-white'
                  : 'text-[#8C9BAB]'
              }`}
              title="Checklist"
            >
              <CheckSquare className="w-3 h-3" />
              {checklistDone}/{checklistTotal}
            </span>
          )}

          {attachmentCount > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-[#8C9BAB]" title={`${attachmentCount} anexo(s)`}>
              <Paperclip className="w-3 h-3" />
              {attachmentCount}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
