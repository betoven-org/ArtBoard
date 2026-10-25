'use server'

import { createClient } from '@/lib/supabase/server'

async function getUserId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autenticado')
  return { supabase, userId: user.id }
}

export async function startTimer(cardId: string) {
  const { supabase, userId } = await getUserId()

  // Parar timers ativos
  const { data: active } = await supabase
    .from('time_entries').select('id, started_at').eq('user_id', userId).is('stopped_at', null)

  if (active && active.length > 0) {
    const now = new Date().toISOString()
    for (const entry of active) {
      const duration = Math.floor((Date.now() - new Date(entry.started_at).getTime()) / 1000)
      await supabase.from('time_entries').update({ stopped_at: now, duration_seconds: duration }).eq('id', entry.id)
    }
  }

  const { data: cardData } = await supabase
    .from('cards').select('list_id, lists(board_id, boards(workspace_id))').eq('id', cardId).single()

  const { data, error } = await supabase.from('time_entries').insert({
    card_id: cardId, user_id: userId,
    board_id: (cardData as any)?.lists?.board_id || null,
    workspace_id: (cardData as any)?.lists?.boards?.workspace_id || null,
  }).select().single()

  if (error) throw new Error(error.message)
  return data
}

export async function pauseTimer(cardId: string) {
  const { supabase, userId } = await getUserId()
  const { data: active } = await supabase
    .from('time_entries').select('id')
    .eq('card_id', cardId).eq('user_id', userId).is('stopped_at', null).is('paused_at', null).maybeSingle()
  if (!active) return null
  await supabase.from('time_entries').update({ paused_at: new Date().toISOString() }).eq('id', active.id)
  return active.id
}

export async function resumeTimer(cardId: string) {
  const { supabase, userId } = await getUserId()
  const { data: paused } = await supabase
    .from('time_entries').select('id, paused_at, paused_seconds')
    .eq('card_id', cardId).eq('user_id', userId).is('stopped_at', null).not('paused_at', 'is', null).maybeSingle()
  if (!paused || !paused.paused_at) return null

  const pausedDuration = Math.floor((Date.now() - new Date(paused.paused_at).getTime()) / 1000)
  await supabase.from('time_entries')
    .update({ paused_at: null, paused_seconds: (paused.paused_seconds || 0) + pausedDuration }).eq('id', paused.id)
  return paused.id
}

export async function stopTimer(cardId: string) {
  const { supabase, userId } = await getUserId()
  const { data: active } = await supabase
    .from('time_entries').select('id, started_at, paused_at, paused_seconds')
    .eq('card_id', cardId).eq('user_id', userId).is('stopped_at', null).maybeSingle()
  if (!active) return null

  let totalPaused = active.paused_seconds || 0
  if (active.paused_at) totalPaused += Math.floor((Date.now() - new Date(active.paused_at).getTime()) / 1000)

  const duration = Math.floor((Date.now() - new Date(active.started_at).getTime()) / 1000) - totalPaused

  await supabase.from('time_entries').update({
    stopped_at: new Date().toISOString(), duration_seconds: Math.max(0, duration), paused_at: null,
  }).eq('id', active.id)

  return Math.max(0, duration)
}

export async function getActiveTimer() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('time_entries').select('id, card_id, started_at')
    .eq('user_id', user.id).is('stopped_at', null).maybeSingle()
  return data
}

export async function getCardTimeEntries(cardId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('time_entries').select('*').eq('card_id', cardId)
    .not('stopped_at', 'is', null).order('started_at', { ascending: false })
  return data || []
}

export async function getMonthlyTimesheet(year: number, month: number, workspaceId?: string, userId?: string) {
  const supabase = await createClient()
  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

  let query = supabase.from('time_entries')
    .select(`id, card_id, user_id, board_id, workspace_id, description, started_at, stopped_at, duration_seconds, cards(name, lists(name, boards(name, workspace_id)))`)
    .not('stopped_at', 'is', null).gte('started_at', startDate).lte('started_at', endDate)
    .order('started_at', { ascending: false })

  if (workspaceId) query = query.eq('workspace_id', workspaceId)
  if (userId) query = query.eq('user_id', userId)

  const { data } = await query
  return data || []
}

export async function getWorkspaceTimesheetUsers(workspaceId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('time_entries').select('user_id').eq('workspace_id', workspaceId).not('stopped_at', 'is', null)

  const userIds = [...new Set((data || []).map((e: any) => e.user_id))]
  const { data: { users } } = await supabase.auth.admin.listUsers()
  return userIds.map((id) => {
    const u = users?.find((usr) => usr.id === id)
    return { id, name: u?.user_metadata?.full_name || u?.email?.split('@')[0] || 'Usuario', email: u?.email || '' }
  })
}

export async function updateTimeEntry(entryId: string, startedAt: string, stoppedAt: string, description?: string) {
  const supabase = await createClient()
  const start = new Date(startedAt)
  const stop = new Date(stoppedAt)
  const duration = Math.floor((stop.getTime() - start.getTime()) / 1000)
  if (duration <= 0) throw new Error('Horario de fim deve ser depois do inicio')

  const { error } = await supabase.from('time_entries').update({
    started_at: start.toISOString(), stopped_at: stop.toISOString(),
    duration_seconds: duration, description: description ?? null,
  }).eq('id', entryId)
  if (error) throw new Error(error.message)
}

export async function deleteTimeEntry(entryId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('time_entries').delete().eq('id', entryId)
  if (error) throw new Error(error.message)
}

export async function addManualTimeEntry(cardId: string, startedAt: string, stoppedAt: string, description?: string) {
  const { supabase, userId } = await getUserId()
  const start = new Date(startedAt)
  const stop = new Date(stoppedAt)
  const duration = Math.floor((stop.getTime() - start.getTime()) / 1000)
  if (duration <= 0) throw new Error('Horario de fim deve ser depois do inicio')

  const { data: cardData } = await supabase
    .from('cards').select('list_id, lists(board_id, boards(workspace_id))').eq('id', cardId).single()

  const { data, error } = await supabase.from('time_entries').insert({
    card_id: cardId, user_id: userId,
    board_id: (cardData as any)?.lists?.board_id || null,
    workspace_id: (cardData as any)?.lists?.boards?.workspace_id || null,
    started_at: start.toISOString(), stopped_at: stop.toISOString(),
    duration_seconds: duration, description: description || null,
  }).select().single()
  if (error) throw new Error(error.message)
  return data
}
