'use server'

import { getOrgContext, audit, requireRole } from '@/lib/org-context'
import { revalidatePath } from 'next/cache'

function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'ab_'
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function getApiKeys() {
  const { supabase, orgId } = await getOrgContext()

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, org_id, user_id, name, key_prefix, permissions, scopes, expires_at, last_used_at, remaining_calls, is_active, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function createApiKey(name: string, scopes: string[] = []) {
  await requireRole('admin')
  const { supabase, orgId, userId } = await getOrgContext()

  const key = generateKey()
  const keyHash = await hashKey(key)
  const keyPrefix = key.slice(0, 7)

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      org_id: orgId,
      user_id: userId,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes,
      permissions: {},
    })
    .select('id, name, key_prefix, created_at')
    .single()

  if (error) throw new Error(error.message)

  await audit('create', 'api_key', data.id, { name })
  revalidatePath('/')

  // Retorna a key completa apenas na criação
  return { ...data, key }
}

export async function revokeApiKey(keyId: string) {
  await requireRole('admin')
  const { supabase, orgId } = await getOrgContext()

  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', keyId)
    .eq('org_id', orgId)

  if (error) throw new Error(error.message)

  await audit('revoke', 'api_key', keyId)
  revalidatePath('/')
}

export async function deleteApiKey(keyId: string) {
  await requireRole('admin')
  const { supabase, orgId } = await getOrgContext()

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId)
    .eq('org_id', orgId)

  if (error) throw new Error(error.message)

  await audit('delete', 'api_key', keyId)
  revalidatePath('/')
}

/**
 * Valida API key e retorna contexto.
 * Usar em API routes (/api/*).
 */
export async function validateApiKey(key: string) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const keyHash = await hashKey(key)

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, org_id, user_id, permissions, scopes, expires_at, remaining_calls, is_active')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single()

  if (error || !data) return null

  // Check expiração
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  // Check remaining calls
  if (data.remaining_calls !== null && data.remaining_calls <= 0) return null

  // Update last_used e decrementa remaining
  await supabase
    .from('api_keys')
    .update({
      last_used_at: new Date().toISOString(),
      ...(data.remaining_calls !== null ? { remaining_calls: data.remaining_calls - 1 } : {}),
    })
    .eq('id', data.id)

  return {
    orgId: data.org_id,
    userId: data.user_id,
    permissions: data.permissions,
    scopes: data.scopes,
  }
}
