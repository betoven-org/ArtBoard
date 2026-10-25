'use client'

import { useState, useEffect } from 'react'
import { getOrgActivityFeed } from '@/lib/actions/activity-feed'

type AuditLog = {
  id: string
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown>
  created_at: string
  user_id: string
}

const ACTION_COLORS: Record<string, string> = {
  create: '#4BCF6B',
  update: '#579DFF',
  delete: '#EF5C48',
  duplicate: '#9F8FEF',
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}m atras`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atras`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ontem'
  if (days < 30) return `${days}d atras`
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function truncateId(id: string | null): string {
  if (!id) return '-'
  return id.slice(0, 8)
}

export function ActivityFeed({ logs: initialLogs }: { logs?: AuditLog[] }) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs || [])
  const [loading, setLoading] = useState(!initialLogs)

  useEffect(() => {
    if (initialLogs) return
    getOrgActivityFeed(30)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [initialLogs])

  if (loading) {
    return (
      <div style={{ color: '#8C9BAB', padding: '24px', textAlign: 'center', fontSize: 14 }}>
        Carregando atividades...
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div style={{ color: '#8C9BAB', padding: '24px', textAlign: 'center', fontSize: 14 }}>
        Nenhuma atividade registrada.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {logs.map((log) => {
        const badgeColor = ACTION_COLORS[log.action] || '#8C9BAB'
        const detailsStr = log.details && Object.keys(log.details).length > 0
          ? JSON.stringify(log.details).slice(0, 80)
          : null

        return (
          <div
            key={log.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 8,
              background: '#22272B',
              borderBottom: '1px solid rgba(166, 197, 226, 0.08)',
            }}
          >
            {/* Timeline dot */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: badgeColor,
                marginTop: 6,
                flexShrink: 0,
              }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Header: badge + target + timestamp */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '1px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#1D2125',
                    background: badgeColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  {log.action}
                </span>
                <span style={{ color: '#B6C2CF', fontSize: 13 }}>
                  {log.target_type}
                </span>
                <span style={{ color: '#8C9BAB', fontSize: 12, fontFamily: 'monospace' }}>
                  {truncateId(log.target_id)}
                </span>
                <span style={{ color: '#8C9BAB', fontSize: 12, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  {relativeTime(log.created_at)}
                </span>
              </div>

              {/* Details preview */}
              {detailsStr && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: '#8C9BAB',
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {detailsStr}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
