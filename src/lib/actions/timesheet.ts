'use server'

import { createClient } from '@/lib/supabase/server'

export async function startTimer(cardId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autenticado')

  // Parar qualquer timer ativo do user
  const { data: active } = await supabase
    .from('time_entries')
    .select('id, started_at')
    .eq('user_id', user.id)
    .is('stopped_at', null)

  if (active && active.length > 0) {
    for (const entry of active) {
      const duration = Math.floor((Date.now() - new Date(entry.started_at).getTime()) / 1000)
      await supabase
        .from('time_entries')
        .update({ stopped_at: new Date().toISOString(), duration_seconds: duration })
        .eq('id', entry.id)
    }
  }

  // Buscar board_id e workspace_id do card
  const { data: cardData } = await supabase
    .from('cards')
    .select('list_id, lists(board_id, boards(workspace_id))')
    .eq('id', cardId)
    .single()

  const boardId = (cardData as any)?.lists?.board_id || null
  const workspaceId = (cardData as any)?.lists?.boards?.workspace_id || null

  // Criar novo timer com contexto completo
  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      card_id: cardId,
      user_id: user.id,
      board_id: boardId,
      workspace_id: workspaceId,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function pauseTimer(cardId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autenticado')

  const { data: active } = await supabase
    .from('time_entries')
    .select('id, started_at, paused_seconds, paused_at')
    .eq('card_id', cardId)
    .eq('user_id', user.id)
    .is('stopped_at', null)
    .is('paused_at', null)
    .maybeSingle()

  if (!active) return null

  await supabase
    .from('time_entries')
    .update({ paused_at: new Date().toISOString() })
    .eq('id', active.id)

  return active.id
}

export async function resumeTimer(cardId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autenticado')

  const { data: paused } = await supabase
    .from('time_entries')
    .select('id, paused_at, paused_seconds')
    .eq('card_id', cardId)
    .eq('user_id', user.id)
    .is('stopped_at', null)
    .not('paused_at', 'is', null)
    .maybeSingle()

  if (!paused || !paused.paused_at) return null

  // Acumular tempo pausado
  const pausedDuration = Math.floor((Date.now() - new Date(paused.paused_at).getTime()) / 1000)
  const totalPaused = (paused.paused_seconds || 0) + pausedDuration

  await supabase
    .from('time_entries')
    .update({ paused_at: null, paused_seconds: totalPaused })
    .eq('id', paused.id)

  return paused.id
}

export async function stopTimer(cardId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autenticado')

  const { data: active } = await supabase
    .from('time_entries')
    .select('id, started_at, paused_at, paused_seconds')
    .eq('card_id', cardId)
    .eq('user_id', user.id)
    .is('stopped_at', null)
    .maybeSingle()

  if (!active) return null

  // Calcular duração total = (agora - inicio) - tempo pausado total
  let totalPaused = active.paused_seconds || 0
  // Se está pausado agora, adicionar esse período de pausa
  if (active.paused_at) {
    totalPaused += Math.floor((Date.now() - new Date(active.paused_at).getTime()) / 1000)
  }

  const totalElapsed = Math.floor((Date.now() - new Date(active.started_at).getTime()) / 1000)
  const duration = totalElapsed - totalPaused

  const { error } = await supabase
    .from('time_entries')
    .update({
      stopped_at: new Date().toISOString(),
      duration_seconds: Math.max(0, duration),
      paused_at: null,
    })
    .eq('id', active.id)

  if (error) throw new Error(error.message)
  return Math.max(0, duration)
}

export async function getActiveTimer() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('time_entries')
    .select('id, card_id, started_at')
    .eq('user_id', user.id)
    .is('stopped_at', null)
    .maybeSingle()

  return data
}

export async function getCardTimeEntries(cardId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('time_entries')
    .select('*')
    .eq('card_id', cardId)
    .not('stopped_at', 'is', null)
    .order('started_at', { ascending: false })

  return data || []
}

// Timesheet mensal — filtra por workspace e opcionalmente por user
export async function getMonthlyTimesheet(
  year: number,
  month: number,
  workspaceId?: string,
  userId?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

  let query = supabase
    .from('time_entries')
    .select(`
      id,
      card_id,
      user_id,
      board_id,
      workspace_id,
      description,
      started_at,
      stopped_at,
      duration_seconds,
      cards(name, lists(name, boards(name, workspace_id)))
    `)
    .not('stopped_at', 'is', null)
    .gte('started_at', startDate)
    .lte('started_at', endDate)
    .order('started_at', { ascending: false })

  // Se é owner do workspace, pode ver entries de todos os membros
  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  }

  // Filtrar por user específico (ou próprio)
  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data } = await query
  return data || []
}

// Listar usuarios com horas no workspace (pra dropdown de filtro)
export async function getWorkspaceTimesheetUsers(workspaceId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('time_entries')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .not('stopped_at', 'is', null)

  // Deduplicate user IDs
  const userIds = [...new Set((data || []).map((e: any) => e.user_id))]

  // Buscar nomes
  const { data: { users } } = await supabase.auth.admin.listUsers()
  return userIds.map((id) => {
    const u = users?.find((usr) => usr.id === id)
    return {
      id,
      name: u?.user_metadata?.full_name || u?.email?.split('@')[0] || 'Usuario',
      email: u?.email || '',
    }
  })
}

export async function updateTimeEntry(entryId: string, startedAt: string, stoppedAt: string, description?: string) {
  const supabase = await createClient()
  const start = new Date(startedAt)
  const stop = new Date(stoppedAt)
  const duration = Math.floor((stop.getTime() - start.getTime()) / 1000)
  if (duration <= 0) throw new Error('Horario de fim deve ser depois do inicio')

  const { error } = await supabase
    .from('time_entries')
    .update({
      started_at: start.toISOString(),
      stopped_at: stop.toISOString(),
      duration_seconds: duration,
      description: description ?? null,
    })
    .eq('id', entryId)

  if (error) throw new Error(error.message)
}

export async function deleteTimeEntry(entryId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', entryId)

  if (error) throw new Error(error.message)
}

// Registro manual de tempo
export async function addManualTimeEntry(
  cardId: string,
  startedAt: string,
  stoppedAt: string,
  description?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autenticado')

  const start = new Date(startedAt)
  const stop = new Date(stoppedAt)
  const duration = Math.floor((stop.getTime() - start.getTime()) / 1000)

  if (duration <= 0) throw new Error('Horario de fim deve ser depois do inicio')

  // Buscar contexto
  const { data: cardData } = await supabase
    .from('cards')
    .select('list_id, lists(board_id, boards(workspace_id))')
    .eq('id', cardId)
    .single()

  const boardId = (cardData as any)?.lists?.board_id || null
  const workspaceId = (cardData as any)?.lists?.boards?.workspace_id || null

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      card_id: cardId,
      user_id: user.id,
      board_id: boardId,
      workspace_id: workspaceId,
      started_at: start.toISOString(),
      stopped_at: stop.toISOString(),
      duration_seconds: duration,
      description: description || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}
