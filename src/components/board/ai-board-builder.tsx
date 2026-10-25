'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, X, Loader2 } from 'lucide-react'

export function AIBoardBuilder({
  workspaceId,
  onClose,
}: {
  workspaceId: string
  onClose: () => void
}) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/ai-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim(), workspaceId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao gerar board')
        setLoading(false)
        return
      }

      router.push(`/board/${data.boardId}`)
      router.refresh()
    } catch {
      setError('Erro de conexão')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={onClose}>
      <div
        className="rounded-xl w-full max-w-[480px] shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#282E33' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(166, 197, 226, 0.16)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: '#579DFF' }} />
            <h3 className="font-semibold" style={{ color: '#DEE4EA', fontSize: 18 }}>AI Board Builder</h3>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-[#A1BDD914]"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6 }}
          >
            <X className="w-5 h-5" style={{ color: '#9FADBC' }} />
          </button>
        </div>

        <form onSubmit={handleGenerate} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#DEE4EA' }}>
              Descreva seu projeto
            </label>
            <textarea
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: App de delivery com funcionalidades de catálogo, pedidos, pagamento e rastreamento..."
              rows={4}
              className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#579DFF] resize-none border-none"
              style={{ backgroundColor: '#22272B', color: '#B6C2CF' }}
            />
          </div>

          <div className="rounded-lg p-3" style={{ backgroundColor: '#A1BDD914' }}>
            <p className="text-xs" style={{ color: '#9FADBC' }}>
              O AI Board Builder usa Claude para criar automaticamente um board completo
              com listas e cards organizados baseado na sua descrição de projeto.
            </p>
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#F87168' }}>{error}</p>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm transition-colors"
              style={{ color: '#9FADBC' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!description.trim() || loading}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-all"
              style={{ backgroundColor: '#579DFF', color: '#1D2125' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar Board
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
