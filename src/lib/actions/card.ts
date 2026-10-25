'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org-context'

export async function createCard(listId: string, name: string) {
  const { supabase } = await getOrgContext()

  const { data: lastCard } = await supabase
    .from('cards')
    .select('position')
    .eq('list_id', listId)
    .eq('closed', false)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = lastCard ? lastCard.position + 65536 : 65536

  const { data, error } = await supabase
    .from('cards')
    .insert({ list_id: listId, name, position })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateCard(
  cardId: string,
  updates: {
    name?: string
    description?: string | null
    position?: number
    list_id?: string
    due_date?: string | null
    due_complete?: boolean
    cover_color?: string | null
    cover_image?: string | null
    estimated_hours?: number | null
    priority?: 'critical' | 'high' | 'medium' | 'low' | null
    card_type?: 'task' | 'bug' | 'feature' | 'epic' | 'story' | 'improvement'
    sprint_id?: string | null
    epic_id?: string | null
    story_points?: number | null
    closed?: boolean
  }
) {
  const { supabase } = await getOrgContext()
  const { error } = await supabase
    .from('cards')
    .update(updates)
    .eq('id', cardId)

  if (error) throw new Error(error.message)
}

export async function deleteCard(cardId: string) {
  const { supabase } = await getOrgContext()
  const { error } = await supabase
    .from('cards')
    .update({ closed: true })
    .eq('id', cardId)

  if (error) throw new Error(error.message)
}

export async function moveCard(cardId: string, targetListId: string, position: number) {
  const { supabase } = await getOrgContext()
  const { error } = await supabase
    .from('cards')
    .update({ list_id: targetListId, position })
    .eq('id', cardId)

  if (error) throw new Error(error.message)
}

export async function getCard(cardId: string) {
  const { supabase } = await getOrgContext()
  const { data, error } = await supabase
    .from('cards')
    .select(`
      *,
      card_labels(label_id, labels:label_id(*)),
      card_members(user_id),
      checklists(*, checklist_items(*)),
      comments(*)
    `)
    .eq('id', cardId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function addComment(cardId: string, text: string) {
  const { supabase, userId } = await getOrgContext()

  const { data, error } = await supabase
    .from('comments')
    .insert({ card_id: cardId, user_id: userId, text })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Detectar @mentions e criar notificações
  const mentions = text.match(/@(\w[\w\s]*?)(?=\s|$)/g)
  if (mentions && mentions.length > 0) {
    try {
      const { data: { users } } = await supabase.auth.admin.listUsers()

      for (const mention of mentions) {
        const mentionName = mention.slice(1).trim()
        const mentionedUser = users?.find(u =>
          (u.user_metadata?.full_name || '').toLowerCase() === mentionName.toLowerCase() ||
          (u.email?.split('@')[0] || '').toLowerCase() === mentionName.toLowerCase()
        )

        if (mentionedUser && mentionedUser.id !== userId) {
          const { data: cardInfo } = await supabase.from('cards')
            .select('name, lists(board_id)').eq('id', cardId).single()

          const { data: { user } } = await supabase.auth.getUser()
          const authorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Alguem'

          await supabase.from('notifications').insert({
            user_id: mentionedUser.id,
            type: 'mention',
            card_id: cardId,
            board_id: (cardInfo as any)?.lists?.board_id || null,
            message: `${authorName} mencionou voce no card "${cardInfo?.name}"`,
          })
        }
      }
    } catch {
      // Falha na notificação não deve bloquear o comentário
    }
  }

  return data
}

export async function toggleLabel(cardId: string, labelId: string) {
  const { supabase } = await getOrgContext()

  const { data: existing } = await supabase
    .from('card_labels')
    .select()
    .eq('card_id', cardId)
    .eq('label_id', labelId)
    .single()

  if (existing) {
    await supabase
      .from('card_labels')
      .delete()
      .eq('card_id', cardId)
      .eq('label_id', labelId)
  } else {
    await supabase
      .from('card_labels')
      .insert({ card_id: cardId, label_id: labelId })
  }
}

export async function createChecklist(cardId: string, name: string) {
  const { supabase } = await getOrgContext()

  const { data, error } = await supabase
    .from('checklists')
    .insert({ card_id: cardId, name, position: 0 })
    .select('*, checklist_items(*)')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function addChecklistItem(checklistId: string, name: string) {
  const { supabase } = await getOrgContext()

  const { data: lastItem } = await supabase
    .from('checklist_items')
    .select('position')
    .eq('checklist_id', checklistId)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = lastItem ? lastItem.position + 65536 : 65536

  const { data, error } = await supabase
    .from('checklist_items')
    .insert({ checklist_id: checklistId, name, position })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function toggleChecklistItem(itemId: string, checked: boolean) {
  const { supabase } = await getOrgContext()
  const { error } = await supabase
    .from('checklist_items')
    .update({ checked })
    .eq('id', itemId)

  if (error) throw new Error(error.message)
}

export async function copyCard(cardId: string) {
  const { supabase } = await getOrgContext()

  const { data: original } = await supabase
    .from('cards')
    .select('*')
    .eq('id', cardId)
    .single()

  if (!original) throw new Error('Card não encontrado')

  const { data: copy, error } = await supabase
    .from('cards')
    .insert({
      list_id: original.list_id,
      name: `${original.name} (cópia)`,
      description: original.description,
      position: original.position + 1,
      cover_color: original.cover_color,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return copy
}

export async function getArchivedCards(boardId: string) {
  const { supabase } = await getOrgContext()
  const { data: lists } = await supabase.from('lists').select('id, name').eq('board_id', boardId)
  if (!lists || lists.length === 0) return []
  const listIds = lists.map(l => l.id)
  const listMap = Object.fromEntries(lists.map(l => [l.id, l.name]))
  const { data } = await supabase.from('cards')
    .select('id, name, list_id')
    .eq('closed', true)
    .in('list_id', listIds)
    .order('created_at', { ascending: false })
  return (data || []).map(c => ({ ...c, list_name: listMap[c.list_id] || '' }))
}

export async function restoreCard(cardId: string) {
  const { supabase } = await getOrgContext()
  const { error } = await supabase.from('cards').update({ closed: false }).eq('id', cardId)
  if (error) throw new Error(error.message)
}

export async function toggleCardMember(cardId: string, userId: string) {
  const { supabase } = await getOrgContext()

  const { data: existing } = await supabase
    .from('card_members')
    .select()
    .eq('card_id', cardId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    await supabase.from('card_members').delete()
      .eq('card_id', cardId).eq('user_id', userId)
  } else {
    await supabase.from('card_members').insert({ card_id: cardId, user_id: userId })
  }
}
