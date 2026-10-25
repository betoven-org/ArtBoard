'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, LayoutGrid, MessageSquare, Columns } from 'lucide-react'
import Link from 'next/link'
import { globalSearch } from '@/lib/actions/search'

type SearchResults = {
  boards: Array<{ id: string; name: string; background: string }>
  cards: Array<{ id: string; name: string; description: string | null; board_id: string; board_name: string; board_background: string }>
  comments: Array<{ id: string; text: string; card_id: string; card_name: string; board_id: string; board_name: string }>
}

const EMPTY: SearchResults = { boards: [], cards: [], comments: [] }

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Cmd+K para abrir
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
        setResults(EMPTY)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const doSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) {
      setResults(EMPTY)
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await globalSearch(q)
        setResults(res)
      } catch {
        setResults(EMPTY)
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  function handleChange(value: string) {
    setQuery(value)
    doSearch(value)
  }

  function close() {
    setOpen(false)
    setQuery('')
    setResults(EMPTY)
  }

  const hasResults = results.boards.length > 0 || results.cards.length > 0 || results.comments.length > 0
  const showEmpty = query.trim().length >= 2 && !loading && !hasResults

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors"
        style={{ background: 'rgba(255,255,255,0.1)', color: '#9FADBC' }}
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Busca global</span>
        <kbd
          className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#8C9BAB' }}
        >
          Cmd+K
        </kbd>
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex items-start justify-center pt-[15vh]"
      style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }}
      onClick={close}
    >
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{
          background: '#282E33',
          border: '1px solid rgba(166, 197, 226, 0.16)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(166, 197, 226, 0.12)' }}>
          <Search className="w-5 h-5 shrink-0" style={{ color: '#579DFF' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Buscar boards, cards, comentarios..."
            className="flex-1 text-sm bg-transparent focus:outline-none"
            style={{ color: '#DEE4EA' }}
          />
          {query && (
            <button onClick={() => handleChange('')} className="p-1 hover:bg-white/10 rounded">
              <X className="w-4 h-4" style={{ color: '#8C9BAB' }} />
            </button>
          )}
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#8C9BAB' }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: '#8C9BAB' }}>
              Buscando...
            </div>
          )}

          {showEmpty && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: '#8C9BAB' }}>
              Nenhum resultado encontrado
            </div>
          )}

          {!loading && hasResults && (
            <>
              {/* Boards */}
              {results.boards.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9FADBC' }}>
                    Boards
                  </div>
                  {results.boards.map((board) => (
                    <Link
                      key={board.id}
                      href={`/board/${board.id}`}
                      onClick={close}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                      style={{ color: '#DEE4EA' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#A1BDD914')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="w-8 h-6 rounded shrink-0" style={{ backgroundColor: board.background }} />
                      <span className="text-sm truncate">{board.name}</span>
                      <Columns className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: '#8C9BAB' }} />
                    </Link>
                  ))}
                </div>
              )}

              {/* Cards */}
              {results.cards.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9FADBC' }}>
                    Cards
                  </div>
                  {results.cards.map((card) => (
                    <Link
                      key={card.id}
                      href={`/board/${card.board_id}`}
                      onClick={close}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#A1BDD914')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div
                        className="w-8 h-6 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: card.board_background || '#579DFF' }}
                      >
                        <LayoutGrid className="w-3 h-3 text-white/80" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: '#DEE4EA' }}>{card.name}</p>
                        <p className="text-xs truncate" style={{ color: '#8C9BAB' }}>{card.board_name}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Comentarios */}
              {results.comments.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9FADBC' }}>
                    Comentarios
                  </div>
                  {results.comments.map((comment) => (
                    <Link
                      key={comment.id}
                      href={`/board/${comment.board_id}`}
                      onClick={close}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#A1BDD914')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div
                        className="w-8 h-6 rounded flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(87, 157, 255, 0.15)' }}
                      >
                        <MessageSquare className="w-3.5 h-3.5" style={{ color: '#579DFF' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: '#DEE4EA' }}>
                          {comment.text.slice(0, 60)}{comment.text.length > 60 ? '...' : ''}
                        </p>
                        <p className="text-xs truncate" style={{ color: '#8C9BAB' }}>
                          {comment.card_name} &middot; {comment.board_name}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        {!loading && query.trim().length < 2 && (
          <div className="px-4 py-3 text-xs text-center" style={{ color: '#8C9BAB', borderTop: '1px solid rgba(166, 197, 226, 0.08)' }}>
            Digite pelo menos 2 caracteres para buscar
          </div>
        )}
      </div>
    </div>
  )
}
