'use server'

import { getOrgContext, audit } from '@/lib/org-context'
import { revalidatePath } from 'next/cache'

export async function getWebhooks(orgId: string) {
  const ctx = await getOrgContext()
  const { data, error } = await ctx.supabase
    .from('webhooks')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function createWebhook(
  orgId: string,
  name: string,
  url: string,
  events: string[],
  secret?: string,
) {
  const ctx = await getOrgContext()

  const { data, error } = await ctx.supabase
    .from('webhooks')
    .insert({
      org_id: orgId,
      name,
      url,
      events,
      secret: secret || null,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await audit('create', 'webhook', data.id, { name, url, events })
  revalidatePath('/settings')
  return data
}

export async function deleteWebhook(webhookId: string) {
  const ctx = await getOrgContext()

  const { error } = await ctx.supabase
    .from('webhooks')
    .delete()
    .eq('id', webhookId)

  if (error) throw new Error(error.message)

  await audit('delete', 'webhook', webhookId)
  revalidatePath('/settings')
}

export async function toggleWebhook(webhookId: string, active: boolean) {
  const ctx = await getOrgContext()

  const { error } = await ctx.supabase
    .from('webhooks')
    .update({ is_active: active })
    .eq('id', webhookId)

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}

export async function fireWebhook(orgId: string, event: string, payload: Record<string, unknown>) {
  const ctx = await getOrgContext()

  const { data: webhooks } = await ctx.supabase
    .from('webhooks')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .contains('events', [event])

  if (!webhooks || webhooks.length === 0) return

  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() })

  await Promise.allSettled(
    webhooks.map(async (wh) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }

      if (wh.secret) {
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(wh.secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign'],
        )
        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
        const hex = Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
        headers['X-Webhook-Signature'] = `sha256=${hex}`
      }

      await fetch(wh.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10000) })
    }),
  )
}
