import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getMonthlyTimesheet, getWorkspaceTimesheetUsers } from '@/lib/actions/timesheet'
import { TimesheetView } from '@/components/timesheet/timesheet-view'

export const dynamic = 'force-dynamic'

export default async function TimesheetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const now = new Date()

  // Buscar workspaces do user
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name')
    .order('created_at', { ascending: true })

  const entries = await getMonthlyTimesheet(now.getFullYear(), now.getMonth() + 1)

  // Buscar usuarios de todos os workspaces do user (pra filtro)
  const allUsers: Array<{ id: string; name: string; email: string }> = []
  for (const ws of workspaces || []) {
    const users = await getWorkspaceTimesheetUsers(ws.id)
    for (const u of users) {
      if (!allUsers.find((x) => x.id === u.id)) allUsers.push(u)
    }
  }

  return (
    <TimesheetView
      initialEntries={entries}
      workspaces={(workspaces || []).map((w) => ({ id: w.id, name: w.name }))}
      users={allUsers}
      currentUserId={user.id}
    />
  )
}
