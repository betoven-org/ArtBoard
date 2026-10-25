'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { createBoard } from '@/lib/actions/board'
import { useRouter } from 'next/navigation'

const BACKGROUNDS = [
  '#0079bf', '#d29034', '#519839', '#b04632',
  '#89609e', '#cd5a91', '#4bbf6b', '#00aecc',
]

export function CreateBoardButton({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [bg, setBg] = useState(BACKGROUNDS[0])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const board = await createBoard(workspaceId, name.trim(), bg)
    router.push(`/board/${board.id}`)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="h-24 rounded-lg bg-[#A1BDD916] hover:bg-[#A1BDD926] flex items-center justify-center text-[#B6C2CF] hover:text-[#DEE4EA] transition-all duration-200 text-sm font-medium border border-dashed border-[#A6C5E229] hover:border-[#A6C5E240]"
      >
        <Plus className="w-5 h-5 mr-1" />
        Criar board
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form
        onSubmit={handleCreate}
        className="bg-[#282E33] rounded-xl p-6 w-full max-w-sm border border-[#A6C5E229]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[#DEE4EA] font-semibold mb-4">Criar board</h3>

        <div
          className="h-28 rounded-lg mb-4 flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: bg }}
        >
          <span className="text-white/70 text-sm">Preview</span>
        </div>

        <div className="flex gap-1.5 mb-4">
          {BACKGROUNDS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setBg(color)}
              className={`w-8 h-6 rounded transition-all ${
                bg === color ? 'ring-1 ring-[#579DFF] ring-offset-2 ring-offset-[#282E33]' : 'hover:opacity-80'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do board"
          className="w-full bg-[#22272B] text-[#B6C2CF] rounded-lg px-3 py-2 text-sm placeholder-[#8C9BAB] focus:outline-none focus:border-[#579DFF] border border-[rgba(166,197,226,0.2)] mb-4 transition-colors duration-150"
        />

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-3 py-1.5 text-sm text-[#9FADBC] hover:text-[#DEE4EA] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="px-4 py-1.5 bg-[#579DFF] text-[#1D2125] font-semibold rounded-lg text-sm hover:bg-[#85B8FF] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </form>
    </div>
  )
}
