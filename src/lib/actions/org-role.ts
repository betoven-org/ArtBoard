'use server'

import { getOrgContext, audit, requireRole } from '@/lib/org-context'
import { revalidatePath } from 'next/cache'

export async function getOrgRoles() {
  const { supabase, orgId } = await getOrgContext()

  const { data, error } = await supabase
    .from('org_roles')
    .select('*')
    .eq('org_id', orgId)
    .order('is_default', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function createOrgRole(name: string, permissions: Record<string, string[]>) {
  await requireRole('admin')
  const { supabase, orgId } = await getOrgContext()

  const { data, error } = await supabase
    .from('org_roles')
    .insert({ org_id: orgId, name, permissions })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('Já existe um role com esse nome')
    throw new Error(error.message)
  }

  await audit('create', 'org_role', data.id, { name, permissions })
  revalidatePath('/')
  return data
}

export async function updateOrgRole(roleId: string, updates: { name?: string; permissions?: Record<string, string[]> }) {
  await requireRole('admin')
  const { supabase, orgId } = await getOrgContext()

  // Não permitir editar roles default
  const { data: role } = await supabase
    .from('org_roles')
    .select('is_default')
    .eq('id', roleId)
    .eq('org_id', orgId)
    .single()

  if (role?.is_default) throw new Error('Roles padrão não podem ser editadas')

  const { error } = await supabase
    .from('org_roles')
    .update(updates)
    .eq('id', roleId)
    .eq('org_id', orgId)

  if (error) throw new Error(error.message)

  await audit('update', 'org_role', roleId, updates)
  revalidatePath('/')
}

export async function deleteOrgRole(roleId: string) {
  await requireRole('admin')
  const { supabase, orgId } = await getOrgContext()

  const { data: role } = await supabase
    .from('org_roles')
    .select('is_default')
    .eq('id', roleId)
    .eq('org_id', orgId)
    .single()

  if (role?.is_default) throw new Error('Roles padrão não podem ser deletadas')

  const { error } = await supabase
    .from('org_roles')
    .delete()
    .eq('id', roleId)
    .eq('org_id', orgId)

  if (error) throw new Error(error.message)

  await audit('delete', 'org_role', roleId)
  revalidatePath('/')
}
