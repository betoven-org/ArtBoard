'use server'

import { getOrgContext } from '@/lib/org-context'

export async function globalSearch(query: string) {
  if (!query || query.trim().length < 2) {
    return { cards: [], boards: [], comments: [] }
  }

  const { supabase, orgId } = await getOrgContext()

  // Buscar workspace ids da org
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id')
    .eq('org_id', orgId)

  const wsIds = (workspaces || []).map((w) => w.id)
  if (wsIds.length === 0) {
    return { cards: [], boards: [], comments: [] }
  }

  const pattern = `%${query.trim()}%`

  const [boardsRes, cardsRes, commentsRes] = await Promise.all([
    // Boards
    supabase
      .from('boards')
      .select('id, name, background, workspace_id')
      .in('workspace_id', wsIds)
      .eq('closed', false)
      .ilike('name', pattern)
      .limit(10),

    // Cards via lists -> boards -> workspaces
    supabase
      .from('cards')
      .select('id, name, description, list_id, lists!inner(id, board_id, boards!inner(id, name, background, workspace_id))')
      .eq('closed', false)
      .or(`name.ilike.${pattern},description.ilike.${pattern}`)
      .limit(10),

    // Comments via cards -> lists -> boards -> workspaces
    supabase
      .from('comments')
      .select('id, text, card_id, created_at, cards!inner(id, name, list_id, lists!inner(board_id, boards!inner(id, name, workspace_id)))')
      .ilike('text', pattern)
      .limit(10),
  ])

  // Filtrar cards/comments que pertencem a workspaces da org
  const cards = (cardsRes.data || [])
    .filter((c: any) => wsIds.includes(c.lists?.boards?.workspace_id))
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      board_id: c.lists?.boards?.id,
      board_name: c.lists?.boards?.name,
      board_background: c.lists?.boards?.background,
    }))

  const comments = (commentsRes.data || [])
    .filter((c: any) => wsIds.includes(c.cards?.lists?.boards?.workspace_id))
    .map((c: any) => ({
      id: c.id,
      text: c.text,
      card_id: c.card_id,
      card_name: c.cards?.name,
      board_id: c.cards?.lists?.boards?.id,
      board_name: c.cards?.lists?.boards?.name,
      created_at: c.created_at,
    }))

  return {
    boards: boardsRes.data || [],
    cards,
    comments,
  }
}
