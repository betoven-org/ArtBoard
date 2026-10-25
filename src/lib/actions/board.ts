'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const BOARD_BACKGROUNDS = [
  '#0079bf', '#d29034', '#519839', '#b04632',
  '#89609e', '#cd5a91', '#4bbf6b', '#00aecc',
  '#838c91',
]

export async function createBoard(workspaceId: string, name: string, background?: string) {
  const supabase = await createClient()

  const bg = background || BOARD_BACKGROUNDS[Math.floor(Math.random() * BOARD_BACKGROUNDS.length)]

  const { data, error } = await supabase
    .from('boards')
    .insert({ workspace_id: workspaceId, name, background: bg })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/')
  return data
}

export async function getBoards(workspaceId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('closed', false)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getBoardWithLists(boardId: string) {
  const supabase = await createClient()

  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('*')
    .eq('id', boardId)
    .single()

  if (boardError) throw new Error(boardError.message)

  const { data: lists, error: listsError } = await supabase
    .from('lists')
    .select('*')
    .eq('board_id', boardId)
    .eq('closed', false)
    .order('position', { ascending: true })

  if (listsError) throw new Error(listsError.message)

  const listIds = lists.map((l) => l.id)

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select(`
      *,
      card_labels(label_id),
      card_members(user_id),
      checklists(id, checklist_items(id, checked)),
      comments(id),
      attachments:attachments(id)
    `)
    .in('list_id', listIds.length > 0 ? listIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('closed', false)
    .order('position', { ascending: true })

  if (cardsError) throw new Error(cardsError.message)

  const { data: labels } = await supabase
    .from('labels')
    .select('*')
    .eq('board_id', boardId)

  const listsWithCards = lists.map((list) => ({
    ...list,
    cards: (cards || []).filter((c) => c.list_id === list.id),
  }))

  return { ...board, lists: listsWithCards, labels: labels || [] }
}

export async function deleteBoard(boardId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('boards')
    .update({ closed: true })
    .eq('id', boardId)

  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function updateBoardName(boardId: string, name: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('boards')
    .update({ name })
    .eq('id', boardId)

  if (error) throw new Error(error.message)
  revalidatePath(`/board/${boardId}`)
  revalidatePath('/')
}

export async function createBoardFromTemplate(workspaceId: string, templateId: string) {
  const { BOARD_TEMPLATES } = await import('@/lib/templates')
  const template = BOARD_TEMPLATES.find((t) => t.id === templateId)
  if (!template) throw new Error('Template nao encontrado')

  const supabase = await createClient()

  // Criar board
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .insert({ workspace_id: workspaceId, name: template.name, background: template.background })
    .select()
    .single()

  if (boardError) throw new Error(boardError.message)

  // Criar listas e cards
  for (let i = 0; i < template.lists.length; i++) {
    const listData = template.lists[i]
    const { data: list, error: listError } = await supabase
      .from('lists')
      .insert({ board_id: board.id, name: listData.name, position: (i + 1) * 65536 })
      .select()
      .single()

    if (listError) continue

    if (listData.cards.length > 0) {
      const cardsToInsert = listData.cards.map((card, j) => ({
        list_id: list.id,
        name: card.name,
        description: card.description || null,
        position: (j + 1) * 65536,
      }))
      await supabase.from('cards').insert(cardsToInsert)
    }
  }

  revalidatePath('/')
  return board
}

export async function updateBoardDescription(boardId: string, description: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('boards')
    .update({ description })
    .eq('id', boardId)

  if (error) throw new Error(error.message)
  revalidatePath(`/board/${boardId}`)
}

export async function duplicateBoard(boardId: string) {
  const supabase = await createClient()

  const { data: original } = await supabase.from('boards').select('*').eq('id', boardId).single()
  if (!original) throw new Error('Board nao encontrado')

  const { data: copy, error } = await supabase.from('boards')
    .insert({ workspace_id: original.workspace_id, name: `${original.name} (copia)`, background: original.background })
    .select().single()
  if (error) throw new Error(error.message)

  const { data: lists } = await supabase.from('lists').select('*').eq('board_id', boardId).eq('closed', false).order('position')
  for (const list of lists || []) {
    const { data: newList } = await supabase.from('lists')
      .insert({ board_id: copy.id, name: list.name, position: list.position }).select().single()
    if (!newList) continue

    const { data: cards } = await supabase.from('cards').select('*').eq('list_id', list.id).eq('closed', false).order('position')
    if (cards && cards.length > 0) {
      await supabase.from('cards').insert(cards.map(c => ({
        list_id: newList.id, name: c.name, description: c.description, position: c.position,
        cover_color: c.cover_color, priority: c.priority, card_type: c.card_type, estimated_hours: c.estimated_hours,
      })))
    }
  }

  revalidatePath('/')
  return copy
}

export async function updateBoardBackground(boardId: string, background: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('boards')
    .update({ background })
    .eq('id', boardId)

  if (error) throw new Error(error.message)
  revalidatePath(`/board/${boardId}`)
  revalidatePath('/')
}
