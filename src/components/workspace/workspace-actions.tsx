'use client'

import { useState } from 'react'
import { LayoutGrid, Users, Settings, X, Trash2 } from 'lucide-react'
import { getWorkspaceMembers, inviteWorkspaceMember, removeWorkspaceMember } from '@/lib/actions/workspace-member'
import { updateWorkspace, deleteWorkspace } from '@/lib/actions/workspace'
import { updateMemberRole } from '@/lib/actions/roles'
import { useRouter } from 'next/navigation'

export function WorkspaceActions({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const [showMembers, setShowMembers] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [name, setName] = useState(workspaceName)
  const router = useRouter()

  async function openMembers() {
    setShowMembers(true)
    setError('')
    setSuccess('')
    try {
      const data = await getWorkspaceMembers(workspaceId)
      setMembers(data)
    } catch {
      setMembers([])
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const result = await inviteWorkspaceMember(workspaceId, email.trim())
      setSuccess(`${result.email} adicionado!`)
      setEmail('')
      setMembers(await getWorkspaceMembers(workspaceId))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('Remover este membro do workspace?')) return
    try {
      await removeWorkspaceMember(workspaceId, userId)
      setMembers((prev) => prev.filter((m) => m.user_id !== userId))
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleChangeRole(userId: string, newRole: string) {
    try {
      await updateMemberRole('workspace', workspaceId, userId, newRole)
      setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, role: newRole } : m))
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleRename() {
    if (!name.trim() || name === workspaceName) return
    try {
      await updateWorkspace(workspaceId, { name: name.trim() })
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDelete() {
    if (!confirm(`Tem certeza que deseja deletar o workspace "${workspaceName}"? Todos os boards serao removidos.`)) return
    try {
      await deleteWorkspace(workspaceId)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    }
  }

  function scrollToWorkspace() {
    const el = document.getElementById(`workspace-${workspaceId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={scrollToWorkspace}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#B6C2CF] hover:text-[#579DFF] rounded transition-colors duration-150"
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="hidden sm:inline">Quadros</span>
        </button>
        <button
          onClick={openMembers}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#B6C2CF] hover:text-[#579DFF] rounded transition-colors duration-150"
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Membros</span>
        </button>
        <button
          onClick={() => { setShowSettings(true); setError(''); setName(workspaceName) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#B6C2CF] hover:text-[#579DFF] rounded transition-colors duration-150"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Configuracoes</span>
        </button>
      </div>

      {/* Modal de Membros */}
      {showMembers && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[100]" onClick={() => setShowMembers(false)} />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-xl shadow-2xl"
              style={{ backgroundColor: '#282E33', border: '1px solid rgba(166, 197, 226, 0.16)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(166, 197, 226, 0.16)' }}>
                <h3 className="text-base font-semibold text-[#DEE4EA]">Membros - {workspaceName}</h3>
                <button onClick={() => setShowMembers(false)} className="p-1 hover:bg-[#A1BDD914] rounded transition-colors">
                  <X className="w-4 h-4 text-[#9FADBC]" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Convidar */}
                <form onSubmit={handleInvite} className="flex gap-2">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email do membro..."
                    type="email"
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm bg-[#22272B] text-[#B6C2CF] placeholder-[#8C9BAB] focus:outline-none focus:ring-1 focus:ring-[#579DFF] border-none"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2.5 bg-[#579DFF] text-[#1D2125] text-sm font-semibold rounded-lg hover:bg-[#85B8FF] disabled:opacity-50 shrink-0 transition-colors"
                  >
                    {loading ? '...' : 'Convidar'}
                  </button>
                </form>

                {error && <p className="text-xs text-[#F87168]">{error}</p>}
                {success && <p className="text-xs text-[#7EE2B8]">{success}</p>}

                {/* Lista de membros */}
                {members.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-[#9FADBC] uppercase mb-2 block">
                      Membros ({members.length})
                    </label>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {members.map((member) => {
                        const displayName = member.name || member.email || 'Usuario'
                        const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                        return (
                          <div
                            key={member.user_id}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#22272B]"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#579DFF] flex items-center justify-center text-xs font-bold text-[#1D2125]">
                                {initials}
                              </div>
                              <div>
                                <p className="text-sm text-[#DEE4EA] truncate max-w-[180px]">{displayName}</p>
                                <p className="text-xs text-[#8C9BAB]">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={member.role}
                                onChange={(e) => handleChangeRole(member.user_id, e.target.value)}
                                className="text-xs bg-[#1D2125] text-[#B6C2CF] rounded px-2 py-1 border-none focus:outline-none focus:ring-1 focus:ring-[#579DFF]"
                              >
                                <option value="admin">Admin</option>
                                <option value="member">Membro</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(member.user_id)}
                                className="p-1 rounded hover:bg-[#F8716820] transition-colors"
                                title="Remover membro"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-[#9FADBC] hover:text-[#F87168]" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {members.length === 0 && (
                  <p className="text-xs text-[#738496] text-center py-2">Nenhum membro encontrado</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de Configuracoes */}
      {showSettings && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[100]" onClick={() => setShowSettings(false)} />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-xl shadow-2xl"
              style={{ backgroundColor: '#282E33', border: '1px solid rgba(166, 197, 226, 0.16)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(166, 197, 226, 0.16)' }}>
                <h3 className="text-base font-semibold text-[#DEE4EA]">Configuracoes - {workspaceName}</h3>
                <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-[#A1BDD914] rounded transition-colors">
                  <X className="w-4 h-4 text-[#9FADBC]" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {error && <p className="text-xs text-[#F87168]">{error}</p>}

                {/* Renomear */}
                <div>
                  <label className="text-xs font-semibold text-[#9FADBC] uppercase mb-1.5 block">
                    Nome do workspace
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-lg text-sm bg-[#22272B] text-[#B6C2CF] placeholder-[#8C9BAB] focus:outline-none focus:ring-1 focus:ring-[#579DFF] border-none"
                    />
                    <button
                      onClick={handleRename}
                      disabled={!name.trim() || name === workspaceName}
                      className="px-4 py-2.5 bg-[#579DFF] text-[#1D2125] text-sm font-semibold rounded-lg hover:bg-[#85B8FF] disabled:opacity-50 shrink-0 transition-colors"
                    >
                      Salvar
                    </button>
                  </div>
                </div>

                {/* Zona de perigo */}
                <div className="pt-3" style={{ borderTop: '1px solid rgba(166, 197, 226, 0.16)' }}>
                  <label className="text-xs font-semibold text-[#F87168] uppercase mb-2 block">
                    Zona de perigo
                  </label>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#F87168] bg-[#F8716815] hover:bg-[#F8716830] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Deletar workspace
                  </button>
                  <p className="text-[11px] text-[#738496] mt-2 text-center">
                    Todos os boards e dados serao removidos permanentemente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
