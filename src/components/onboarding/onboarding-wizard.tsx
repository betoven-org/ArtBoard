'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createWorkspace } from '@/lib/actions/workspace'
import { createBoard, createBoardFromTemplate } from '@/lib/actions/board'
import { inviteOrgMember } from '@/lib/actions/organization'
import { BOARD_TEMPLATES } from '@/lib/templates'

const C = {
  bg: '#1D2125',
  card: '#22272B',
  text: '#B6C2CF',
  heading: '#DEE4EA',
  accent: '#579DFF',
  muted: '#8C9BAB',
  inputBg: '#282E33',
  border: '#A6C5E229',
  danger: '#F87168',
}

export function OnboardingWizard({ orgName, orgId }: { orgName: string; orgId: string }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [workspaceName, setWorkspaceName] = useState('')
  const [boardName, setBoardName] = useState('')
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [emails, setEmails] = useState([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null)
  const [createdBoardId, setCreatedBoardId] = useState<string | null>(null)

  async function handleNext() {
    setError(null)
    setLoading(true)
    try {
      if (step === 0) {
        if (!workspaceName.trim()) { setError('Nome do workspace obrigatorio'); setLoading(false); return }
        const ws = await createWorkspace(workspaceName.trim(), orgId)
        setCreatedWorkspaceId(ws.id)
        setStep(1)
      } else if (step === 1) {
        if (!createdWorkspaceId) { setError('Erro interno'); setLoading(false); return }
        if (templateId) {
          const board = await createBoardFromTemplate(createdWorkspaceId, templateId)
          setCreatedBoardId(board.id)
        } else if (boardName.trim()) {
          const board = await createBoard(createdWorkspaceId, boardName.trim())
          setCreatedBoardId(board.id)
        }
        setStep(2)
      } else if (step === 2) {
        const validEmails = emails.filter(e => e.trim())
        const results = await Promise.allSettled(
          validEmails.map(email => inviteOrgMember(orgId, email.trim(), 'member'))
        )
        const failures = results.filter(r => r.status === 'rejected')
        if (failures.length > 0 && validEmails.length > 0) {
          const msg = (failures[0] as PromiseRejectedResult).reason?.message || 'Erro ao convidar'
          setError(`${failures.length} convite(s) falharam: ${msg}`)
        }
        router.push(createdBoardId ? `/board/${createdBoardId}` : '/')
        router.refresh()
        return
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  function handleBack() {
    setError(null)
    setStep(s => Math.max(0, s - 1))
  }

  const stepTitles = ['Bem-vindo ao ArtBoard', 'Crie seu primeiro board', 'Convide seu time']

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', padding: 32 }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 40, maxWidth: 520, width: '100%', border: `1px solid ${C.border}` }}>
        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, justifyContent: 'center' }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: 40, height: 4, borderRadius: 2,
                background: i <= step ? C.accent : C.border,
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        <h2 style={{ color: C.heading, fontSize: 22, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
          {stepTitles[step]}
        </h2>

        {/* Step 0 */}
        {step === 0 && (
          <div>
            <p style={{ color: C.text, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
              Organizacao: <strong style={{ color: C.heading }}>{orgName}</strong>. Crie seu primeiro workspace para comecar.
            </p>
            <label style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, display: 'block', marginBottom: 6 }}>
              Nome do workspace
            </label>
            <input
              value={workspaceName}
              onChange={e => setWorkspaceName(e.target.value)}
              placeholder="Ex: Marketing, Produto, Desenvolvimento..."
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleNext()}
              style={{
                width: '100%', background: C.inputBg, color: C.heading, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <p style={{ color: C.text, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
              Crie um board vazio ou escolha um template.
            </p>
            <label style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, display: 'block', marginBottom: 6 }}>
              Nome do board (ou escolha um template abaixo)
            </label>
            <input
              value={boardName}
              onChange={e => { setBoardName(e.target.value); setTemplateId(null) }}
              placeholder="Meu primeiro board"
              onKeyDown={e => e.key === 'Enter' && handleNext()}
              style={{
                width: '100%', background: C.inputBg, color: C.heading, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
            <p style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, marginTop: 16, marginBottom: 8 }}>
              Ou use um template
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {BOARD_TEMPLATES.slice(0, 6).map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTemplateId(t.id); setBoardName('') }}
                  style={{
                    background: templateId === t.id ? `${C.accent}20` : C.inputBg,
                    border: `1px solid ${templateId === t.id ? C.accent : C.border}`,
                    borderRadius: 8, padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <p style={{ color: C.heading, fontSize: 13, fontWeight: 600, margin: 0 }}>{t.name}</p>
                  <p style={{ color: C.muted, fontSize: 11, margin: '4px 0 0' }}>{t.lists.length} listas</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <p style={{ color: C.text, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
              Convide membros para sua organizacao (opcional).
            </p>
            {emails.map((email, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  value={email}
                  onChange={e => {
                    const next = [...emails]
                    next[i] = e.target.value
                    setEmails(next)
                  }}
                  placeholder="email@exemplo.com"
                  type="email"
                  style={{
                    flex: 1, background: C.inputBg, color: C.heading, border: `1px solid ${C.border}`,
                    borderRadius: 6, padding: '10px 12px', fontSize: 14, outline: 'none',
                  }}
                />
                {emails.length > 1 && (
                  <button
                    onClick={() => setEmails(emails.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 18, padding: '0 6px' }}
                  >
                    x
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setEmails([...emails, ''])}
              style={{
                background: 'none', border: `1px dashed ${C.border}`, color: C.accent,
                borderRadius: 6, padding: '8px 12px', fontSize: 13, cursor: 'pointer', width: '100%',
              }}
            >
              + Adicionar outro email
            </button>
          </div>
        )}

        {error && (
          <p style={{ color: C.danger, fontSize: 13, marginTop: 12 }}>{error}</p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
          {step > 0 ? (
            <button
              onClick={handleBack}
              disabled={loading}
              style={{
                background: 'transparent', border: `1px solid ${C.border}`, color: C.text,
                borderRadius: 6, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Voltar
            </button>
          ) : <div />}
          <button
            onClick={handleNext}
            disabled={loading}
            style={{
              background: C.accent, color: C.bg, border: 'none', borderRadius: 6,
              padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? 'Aguarde...' : step === 2 ? (emails.some(e => e.trim()) ? 'Convidar e finalizar' : 'Pular e finalizar') : 'Proximo'}
          </button>
        </div>
      </div>
    </div>
  )
}
