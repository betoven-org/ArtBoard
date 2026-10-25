'use server'
import { createClient } from '@/lib/supabase/server'

// Roles: owner (workspace owner), admin, member, guest
// Owner = workspaces.owner_id
// Admin = workspace_members.role='admin' ou board_members.role='admin'
// Member = workspace_members.role='member' ou board_members.role='member'
// Guest = board_members.role='guest' (só visualizar + comentar)

export async function getUserRole(workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Check if owner
  const { data: ws } = await supabase.from('workspaces').select('owner_id').eq('id', workspaceId).single()
  if (ws?.owner_id === user.id) return 'owner'

  // Check workspace membership
  const { data: wm } = await supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle()
  return wm?.role || null
}

export async function getBoardRole(boardId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: bm } = await supabase.from('board_members').select('role').eq('board_id', boardId).eq('user_id', user.id).maybeSingle()
  return bm?.role || null
}

export async function updateMemberRole(type: 'workspace' | 'board', entityId: string, userId: string, newRole: string) {
  const supabase = await createClient()
  const table = type === 'workspace' ? 'workspace_members' : 'board_members'
  const idField = type === 'workspace' ? 'workspace_id' : 'board_id'

  const { error } = await supabase.from(table).update({ role: newRole }).eq(idField, entityId).eq('user_id', userId)
  if (error) throw new Error(error.message)
}
