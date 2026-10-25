'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, LayoutGrid, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type SearchResult = {
  id: string
  name: string
  description: string | null
  list_name: string
  board_name: string
  board_id: string
  board_background: string
}

type BoardResult = {
  id: string
  name: string
  background: string
}

type RecentBoard = { id: string; name: string; background: string }

export function SearchBar() {
  const [focused, setFocused] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [boardResults, setBoardResults] = useState<BoardResult[]>([])
  const [loading, setLoading] = useState(false)
  const [recentBoards, setRecentBoards] = useState<RecentBoard[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Carregar boards recentes ao focar
  useEffect(() => {
    if (focused) {
      try {
        const stored = JSON.parse(localStorage.getItem('artboard-recent-boards') || '[]')
        setRecentBoards(stored)
      } catch {
        setRecentBoards([])
      }
    }
  }, [focused])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setBoardResults([])
      return
    }

    const timeout = setTimeout(async () => {
      setLoading(true)

      const [cardsRes, boardsRes] = await Promise.all([
        supabase
          .from('cards')
          .select(`
            id,
            name,
            description,
            lists(name, boards(id, name, background))
          `)
          .eq('closed', false)
          .or(`name.ilike.%25${query}%25,description.ilike.%25${query}%25`)
          .limit(10),
        supabase
          .from('boards')
          .select('id, name, background')
          .eq('closed', false)
          .ilike('name', `%${query}%`)
          .limit(5),
      ])

      const mapped = (cardsRes.data || []).map((card: any) => ({
        id: card.id,
        name: card.name,
        description: card.description,
        list_name: card.lists?.name || '',
        board_name: card.lists?.boards?.name || '',
        board_id: card.lists?.boards?.id || '',
        board_background: card.lists?.boards?.background || '#579DFF',
      }))

      setResults(mapped.filter((r: SearchResult) => r.board_id))
      setBoardResults(boardsRes.data || [])
      setLoading(false)
    }, 300)

    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur()
        setFocused(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const showResults = focused && query.trim().length > 0
  const showRecent = focused && !query.trim() && recentBoards.length > 0

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex items-center gap-2 rounded-md transition-all duration-200 ${
          focused
            ? 'w-[400px]'
            : 'w-[240px]'
        }`}
        style={{
          background: focused ? '#22272B' : 'rgba(255,255,255,0.15)',
          border: focused ? '1px solid #579DFF' : '1px solid transparent',
        }}
      >
        <Search className={`w-4 h-4 ml-2.5 shrink-0 ${focused ? 'text-[#9FADBC]' : 'text-white/70'}`} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Pesquisar"
          className={`flex-1 text-sm py-1.5 pr-2 bg-transparent focus:outline-none transition-colors duration-150 ${
            focused ? 'text-[#DEE4EA] placeholder-[#6B7C8D]' : 'text-white/70 placeholder-white/50'
          }`}
          style={{ outline: 'none', border: 'none' }}
        />
        {focused && query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus() }}
            className="p-1 mr-1 hover:bg-white/10 rounded"
          >
            <X className="w-3.5 h-3.5 text-[#9FADBC]" />
          </button>
        )}
      </div>

      {/* Boards recentes quando focado sem query */}
      {showRecent && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] w-[360px] rounded-lg z-50 overflow-hidden border border-[rgba(166,197,226,0.16)]"
          style={{
            background: '#282E33',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          } as React.CSSProperties}
        >
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9FADBC' }}>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Boards recentes
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {recentBoards.map((board) => (
              <Link
                key={board.id}
                href={`/board/${board.id}`}
                onClick={() => { setFocused(false); setQuery('') }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#A1BDD914] transition-colors duration-150 border-b border-[#A6C5E229] last:border-0"
              >
                <div
                  className="w-8 h-6 rounded shrink-0"
                  style={{ backgroundColor: board.background, borderRadius: '4px' }}
                />
                <p className="text-sm text-[#DEE4EA] truncate">{board.name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Resultados de busca */}
      {showResults && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] w-[360px] rounded-lg z-50 overflow-hidden border border-[rgba(166,197,226,0.16)]"
          style={{
            background: '#282E33',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          } as React.CSSProperties}
        >
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-[#8C9BAB]">
                Buscando...
              </div>
            ) : boardResults.length === 0 && results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[#8C9BAB]">
                Nenhum resultado encontrado
              </div>
            ) : (
              <>
                {boardResults.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 text-[10px] font-semibold text-[#9FADBC] uppercase">Boards</div>
                    {boardResults.map((board) => (
                      <a
                        key={board.id}
                        href={`/board/${board.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#A1BDD914] transition-colors duration-150 border-b border-[#A6C5E229]"
                      >
                        <div
                          className="w-8 h-6 rounded shrink-0"
                          style={{ backgroundColor: board.background }}
                        />
                        <span className="text-sm text-[#DEE4EA] truncate">{board.name}</span>
                      </a>
                    ))}
                  </>
                )}
                {results.length > 0 && (
                  <div className="px-4 py-1.5 text-[10px] font-semibold text-[#9FADBC] uppercase">Cards</div>
                )}
                {results.map((result) => (
                <a
                  key={result.id}
                  href={`/board/${result.board_id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#A1BDD914] transition-colors duration-150 border-b border-[#A6C5E229] last:border-0"
                >
                  <div
                    className="w-8 h-6 rounded flex items-center justify-center shrink-0"
                    style={{ backgroundColor: result.board_background }}
                  >
                    <LayoutGrid className="w-3 h-3 text-white/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#DEE4EA] truncate">{result.name}</p>
                    <p className="text-xs text-[#8C9BAB] truncate">
                      {result.board_name} &rsaquo; {result.list_name}
                    </p>
                  </div>
                </a>
              ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
