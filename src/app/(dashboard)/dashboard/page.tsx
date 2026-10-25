import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardView } from '@/components/dashboard/dashboard-view'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: workspaces } = await supabase.from('workspaces').select('id, name').order('created_at')

  // Time entries das ultimas 4 semanas
  const fourWeeksAgo = new Date()
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('id, user_id, board_id, workspace_id, duration_seconds, started_at, cards(name, lists(name, boards(name)))')
    .not('stopped_at', 'is', null)
    .gte('started_at', fourWeeksAgo.toISOString())
    .order('started_at', { ascending: false })

  // Cards com due_date atrasado
  const { data: overdueCards } = await supabase
    .from('cards')
    .select('id, name, due_date, due_complete, list_id, lists(name, board_id, boards(name))')
    .eq('closed', false)
    .eq('due_complete', false)
    .lt('due_date', new Date().toISOString())
    .not('due_date', 'is', null)

  // Cards sem responsavel
  const { data: allCards } = await supabase
    .from('cards')
    .select('id, name, list_id, card_members(user_id), lists(name, boards(name))')
    .eq('closed', false)
    .limit(100)

  const unassignedCards = (allCards || []).filter((c: any) => !c.card_members || c.card_members.length === 0)

  // Buscar nomes dos usuarios para resolver UUIDs
  const userIds = [...new Set((timeEntries || []).map((e: any) => e.user_id))]
  const userMap: Record<string, string> = {}
  if (userIds.length > 0) {
    try {
      const { data: { users } } = await supabase.auth.admin.listUsers()
      for (const uid of userIds) {
        const u = users?.find((usr) => usr.id === uid)
        userMap[uid] = u?.user_metadata?.full_name || u?.email?.split('@')[0] || 'Usuario'
      }
    } catch {
      // fallback: sem nomes
    }
  }

  return (
    <DashboardView
      timeEntries={(timeEntries || []) as any[]}
      overdueCards={(overdueCards || []) as any[]}
      unassignedCards={unassignedCards as any[]}
      workspaces={workspaces || []}
      userNames={userMap}
    />
  )
}
