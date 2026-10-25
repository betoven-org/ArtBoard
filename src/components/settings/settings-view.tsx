'use client'

import { useState } from 'react'
import { Building2, Users, Shield, Key, ScrollText, CreditCard, Plus, Trash2, Copy, Check } from 'lucide-react'
import { createApiKey, revokeApiKey } from '@/lib/actions/api-key'
import { createOrgRole, updateOrgRole, deleteOrgRole } from '@/lib/actions/org-role'
import { updateOrganization } from '@/lib/actions/organization'

const PERMISSION_RESOURCES = ['workspaces', 'boards', 'members', 'settings', 'billing'] as const
const PERMISSION_ACTIONS = ['read', 'create', 'update', 'delete', '*'] as const

const C = {
  bg: '#1D2125', surface: '#22272B', border: '#A6C5E229',
  text: '#B6C2CF', heading: '#DEE4EA', accent: '#579DFF',
  muted: '#8C9BAB', danger: '#F87168', success: '#4BCE97',
  inputBg: '#282E33', cardBg: '#282E33',
}

type Tab = 'general' | 'members' | 'roles' | 'api-keys' | 'audit' | 'plans'

export function SettingsView({ org, members, plans, roles, apiKeys, auditLogs, userRole, usage }: {
  org: any
  members: any[]
  plans: any[]
  roles: any[]
  apiKeys: any[]
  auditLogs: any[]
  userRole: string
  usage: { members: number; workspaces: number }
}) {
  const [tab, setTab] = useState<Tab>('general')
  const [orgName, setOrgName] = useState(org?.name || '')
  const [saving, setSaving] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [editPerms, setEditPerms] = useState<Record<string, string[]>>({})
  const [savingRole, setSavingRole] = useState(false)
  const isAdmin = userRole === 'owner' || userRole === 'admin'

  const currentPlan = plans.find(p => p.id === org?.plan) || plans[0]

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'general', label: 'Geral', icon: Building2 },
    { id: 'members', label: 'Membros', icon: Users },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'api-keys', label: 'API Keys', icon: Key },
    { id: 'audit', label: 'Audit Log', icon: ScrollText },
    { id: 'plans', label: 'Planos', icon: CreditCard },
  ]

  async function handleSaveOrg() {
    if (!orgName.trim() || !org) return
    setSaving(true)
    await updateOrganization(org.id, { name: orgName.trim() })
    setSaving(false)
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault()
    if (!newKeyName.trim()) return
    const result = await createApiKey(newKeyName.trim())
    setCreatedKey(result.key)
    setNewKeyName('')
  }

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault()
    if (!newRoleName.trim()) return
    await createOrgRole(newRoleName.trim(), { workspaces: ['read'], boards: ['read'] })
    setNewRoleName('')
    window.location.reload()
  }

  return (
    <div style={{ background: C.bg, minHeight: '100%', padding: 32, borderRadius: 12 }}>
      <h1 style={{ color: C.heading, fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
        Configurações
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, borderRadius: '6px 6px 0 0',
              background: tab === t.id ? C.surface : 'transparent',
              color: tab === t.id ? C.accent : C.muted,
              borderBottom: tab === t.id ? `2px solid ${C.accent}` : '2px solid transparent',
            }}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === 'general' && (
        <div style={{ maxWidth: 500 }}>
          <label style={{ display: 'block', color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
            Nome da organização
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              disabled={!isAdmin}
              style={{
                flex: 1, background: C.inputBg, color: C.heading, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '10px 12px', fontSize: 14, outline: 'none',
              }}
            />
            {isAdmin && (
              <button
                onClick={handleSaveOrg}
                disabled={saving}
                style={{
                  background: C.accent, color: C.bg, border: 'none', borderRadius: 6,
                  padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            )}
          </div>

          <div style={{ marginTop: 24, padding: 16, background: C.cardBg, borderRadius: 8, border: `1px solid ${C.border}` }}>
            <p style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>Uso atual</p>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <p style={{ color: C.heading, fontSize: 20, fontWeight: 700 }}>{usage.members}</p>
                <p style={{ color: C.muted, fontSize: 12 }}>/ {currentPlan?.max_members === -1 ? '∞' : currentPlan?.max_members} membros</p>
              </div>
              <div>
                <p style={{ color: C.heading, fontSize: 20, fontWeight: 700 }}>{usage.workspaces}</p>
                <p style={{ color: C.muted, fontSize: 12 }}>/ {currentPlan?.max_workspaces === -1 ? '∞' : currentPlan?.max_workspaces} projetos</p>
              </div>
            </div>
          </div>

          <p style={{ color: C.muted, fontSize: 12, marginTop: 16 }}>
            Plano: <span style={{ color: C.accent, fontWeight: 600 }}>{currentPlan?.name}</span>
          </p>
        </div>
      )}

      {/* Members */}
      {tab === 'members' && (
        <div>
          <p style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
            Membros ({members.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {members.map(m => (
              <div key={m.user_id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                background: C.cardBg, borderRadius: 8, border: `1px solid ${C.border}`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: C.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: C.bg, flexShrink: 0,
                }}>
                  {(m.user_id || '').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: C.heading, fontSize: 14, fontWeight: 500 }}>{m.user_id.slice(0, 8)}...</p>
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: m.role === 'owner' ? '#579DFF20' : m.role === 'admin' ? '#9F8FEF20' : '#A1BDD914',
                  color: m.role === 'owner' ? C.accent : m.role === 'admin' ? '#9F8FEF' : C.muted,
                }}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roles */}
      {tab === 'roles' && (
        <div>
          <p style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
            Roles da organização
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            {roles.map(r => (
              <div key={r.id}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  background: editingRole === r.id ? C.surface : C.cardBg,
                  borderRadius: editingRole === r.id ? '8px 8px 0 0' : 8,
                  border: `1px solid ${editingRole === r.id ? C.accent : C.border}`,
                  borderBottom: editingRole === r.id ? 'none' : undefined,
                }}>
                  <Shield size={14} color={r.is_default ? C.accent : '#9F8FEF'} />
                  <span style={{ flex: 1, color: C.heading, fontSize: 14, fontWeight: 500 }}>{r.name}</span>
                  {r.is_default && <span style={{ fontSize: 11, color: C.muted }}>padrão</span>}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (editingRole === r.id) { setEditingRole(null) } else {
                          setEditingRole(r.id)
                          setEditPerms(r.permissions || {})
                        }
                      }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: editingRole === r.id ? C.accent : C.muted,
                        fontSize: 12, padding: '4px 8px',
                      }}
                    >
                      {editingRole === r.id ? 'Fechar' : 'Editar'}
                    </button>
                  )}
                  {!r.is_default && isAdmin && (
                    <button
                      onClick={async () => { await deleteOrgRole(r.id); window.location.reload() }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger, padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Permission editor */}
                {editingRole === r.id && (
                  <div style={{
                    padding: 16, background: C.surface,
                    border: `1px solid ${C.accent}`, borderTop: 'none',
                    borderRadius: '0 0 8px 8px',
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '4px 8px', color: C.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                            Recurso
                          </th>
                          {PERMISSION_ACTIONS.map(a => (
                            <th key={a} style={{ textAlign: 'center', padding: '4px 6px', color: C.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                              {a === '*' ? 'Tudo' : a === 'read' ? 'Ver' : a === 'create' ? 'Criar' : a === 'update' ? 'Editar' : 'Deletar'}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {PERMISSION_RESOURCES.map(resource => {
                          const perms = editPerms[resource] || []
                          const hasAll = perms.includes('*')
                          return (
                            <tr key={resource}>
                              <td style={{ padding: '6px 8px', color: C.text, fontSize: 13, fontWeight: 500 }}>
                                {resource === 'workspaces' ? 'Projetos' : resource === 'boards' ? 'Boards' : resource === 'members' ? 'Membros' : resource === 'settings' ? 'Config' : 'Billing'}
                              </td>
                              {PERMISSION_ACTIONS.map(action => {
                                const checked = hasAll || perms.includes(action)
                                return (
                                  <td key={action} style={{ textAlign: 'center', padding: '6px' }}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={r.is_default}
                                      onChange={() => {
                                        const current = editPerms[resource] || []
                                        let next: string[]
                                        if (action === '*') {
                                          next = checked ? [] : ['*']
                                        } else if (checked) {
                                          next = current.filter(a => a !== action && a !== '*')
                                        } else {
                                          next = [...current.filter(a => a !== '*'), action]
                                        }
                                        setEditPerms({ ...editPerms, [resource]: next })
                                      }}
                                      style={{ cursor: r.is_default ? 'not-allowed' : 'pointer', accentColor: C.accent }}
                                    />
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {!r.is_default && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
                        <button
                          onClick={() => setEditingRole(null)}
                          style={{
                            background: 'transparent', border: `1px solid ${C.border}`,
                            color: C.text, borderRadius: 6, padding: '6px 14px',
                            fontSize: 12, cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          disabled={savingRole}
                          onClick={async () => {
                            setSavingRole(true)
                            await updateOrgRole(r.id, { permissions: editPerms })
                            setSavingRole(false)
                            setEditingRole(null)
                            window.location.reload()
                          }}
                          style={{
                            background: C.accent, color: C.bg, border: 'none', borderRadius: 6,
                            padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            opacity: savingRole ? 0.5 : 1,
                          }}
                        >
                          {savingRole ? 'Salvando...' : 'Salvar permissões'}
                        </button>
                      </div>
                    )}
                    {r.is_default && (
                      <p style={{ color: C.muted, fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                        Roles padrão são somente leitura
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {isAdmin && (
            <form onSubmit={handleCreateRole} style={{ display: 'flex', gap: 8 }}>
              <input
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                placeholder="Nome do novo role..."
                style={{
                  flex: 1, background: C.inputBg, color: C.heading, border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: '8px 12px', fontSize: 13, outline: 'none',
                }}
              />
              <button type="submit" style={{
                background: C.accent, color: C.bg, border: 'none', borderRadius: 6,
                padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Plus size={14} /> Criar
              </button>
            </form>
          )}
        </div>
      )}

      {/* API Keys */}
      {tab === 'api-keys' && (
        <div>
          {createdKey && (
            <div style={{
              padding: 16, background: '#4BCE9720', border: '1px solid #4BCE97',
              borderRadius: 8, marginBottom: 16,
            }}>
              <p style={{ color: C.success, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Chave criada! Copie agora — ela não será exibida novamente.
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{
                  flex: 1, background: C.bg, color: C.heading, padding: '8px 12px',
                  borderRadius: 4, fontSize: 12, wordBreak: 'break-all',
                }}>
                  {createdKey}
                </code>
                <button
                  onClick={() => { navigator.clipboard.writeText(createdKey); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? C.success : C.muted, padding: 6 }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          )}

          <p style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
            Chaves de API ({apiKeys.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            {apiKeys.map(k => (
              <div key={k.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                background: C.cardBg, borderRadius: 8, border: `1px solid ${C.border}`,
                opacity: k.is_active ? 1 : 0.5,
              }}>
                <Key size={14} color={k.is_active ? C.accent : C.muted} />
                <span style={{ flex: 1, color: C.heading, fontSize: 14, fontWeight: 500 }}>{k.name}</span>
                <code style={{ fontSize: 12, color: C.muted }}>{k.key_prefix}...</code>
                {k.last_used_at && (
                  <span style={{ fontSize: 11, color: C.muted }}>
                    Último uso: {new Date(k.last_used_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
                <span style={{
                  padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: k.is_active ? '#4BCE9720' : '#F8716820',
                  color: k.is_active ? C.success : C.danger,
                }}>
                  {k.is_active ? 'ativa' : 'revogada'}
                </span>
                {k.is_active && isAdmin && (
                  <button
                    onClick={async () => { await revokeApiKey(k.id); window.location.reload() }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger, fontSize: 12, padding: '4px 8px' }}
                  >
                    Revogar
                  </button>
                )}
              </div>
            ))}
            {apiKeys.length === 0 && (
              <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 20 }}>Nenhuma chave criada</p>
            )}
          </div>
          {isAdmin && (
            <form onSubmit={handleCreateKey} style={{ display: 'flex', gap: 8 }}>
              <input
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="Nome da chave..."
                style={{
                  flex: 1, background: C.inputBg, color: C.heading, border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: '8px 12px', fontSize: 13, outline: 'none',
                }}
              />
              <button type="submit" style={{
                background: C.accent, color: C.bg, border: 'none', borderRadius: 6,
                padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Plus size={14} /> Criar chave
              </button>
            </form>
          )}
        </div>
      )}

      {/* Audit Log */}
      {tab === 'audit' && (
        <div>
          <p style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
            Últimas ações
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {auditLogs.map(log => (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                borderRadius: 6, fontSize: 13,
              }} className="hover:bg-[#A1BDD914]">
                <span style={{ color: C.muted, fontSize: 11, width: 130, flexShrink: 0 }}>
                  {new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{
                  padding: '1px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600,
                  background: log.action === 'create' ? '#4BCE9720' : log.action === 'delete' ? '#F8716820' : '#579DFF20',
                  color: log.action === 'create' ? C.success : log.action === 'delete' ? C.danger : C.accent,
                }}>
                  {log.action}
                </span>
                <span style={{ color: C.text }}>{log.target_type}</span>
                {log.target_id && (
                  <code style={{ color: C.muted, fontSize: 11 }}>{log.target_id.slice(0, 8)}</code>
                )}
                {log.details && Object.keys(log.details).length > 0 && (
                  <span style={{ color: C.muted, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                    {JSON.stringify(log.details)}
                  </span>
                )}
              </div>
            ))}
            {auditLogs.length === 0 && (
              <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 20 }}>Nenhuma ação registrada</p>
            )}
          </div>
        </div>
      )}

      {/* Plans */}
      {tab === 'plans' && (
        <div>
          <p style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 16 }}>
            Planos disponíveis
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {plans.map(plan => {
              const isCurrent = plan.id === org?.plan
              return (
                <div key={plan.id} style={{
                  padding: 20, borderRadius: 12,
                  background: C.cardBg,
                  border: `1px solid ${isCurrent ? C.accent : C.border}`,
                  position: 'relative',
                }}>
                  {isCurrent && (
                    <span style={{
                      position: 'absolute', top: 12, right: 12,
                      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: C.accent, color: C.bg, textTransform: 'uppercase',
                    }}>
                      atual
                    </span>
                  )}
                  <h3 style={{ color: C.heading, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                    {plan.name}
                  </h3>
                  <p style={{ color: C.accent, fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
                    {plan.price_monthly === 0 ? 'Grátis' : `R$ ${(plan.price_monthly / 100).toFixed(0)}`}
                    {plan.price_monthly > 0 && <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>/mês</span>}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: C.text }}>
                    <span>{plan.max_members === -1 ? 'Membros ilimitados' : `${plan.max_members} membros`}</span>
                    <span>{plan.max_workspaces === -1 ? 'Projetos ilimitados' : `${plan.max_workspaces} projetos`}</span>
                    <span>{plan.max_boards_per_workspace === -1 ? 'Boards ilimitados' : `${plan.max_boards_per_workspace} boards/projeto`}</span>
                    <span>{plan.max_storage_mb === -1 ? 'Storage ilimitado' : `${plan.max_storage_mb}MB storage`}</span>
                  </div>
                  {!isCurrent && plan.price_monthly > 0 && (
                    <button style={{
                      marginTop: 12, width: '100%', padding: '8px 0', border: `1px solid ${C.accent}`,
                      background: 'transparent', color: C.accent, borderRadius: 6,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                      Fazer upgrade
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
