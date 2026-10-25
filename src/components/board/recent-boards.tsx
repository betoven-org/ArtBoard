'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'

interface BoardInfo {
  id: string
  name: string
  background: string
}

const STORAGE_KEY = 'artboard-recent-boards'

export function RecentBoards({ allBoards }: { allBoards: BoardInfo[] }) {
  const [recentBoards, setRecentBoards] = useState<BoardInfo[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return

      const parsed: unknown[] = JSON.parse(stored)
      const boardMap = new Map(allBoards.map((b) => [b.id, b]))

      const boards = parsed
        .map((item: unknown) => {
          // Suporta formato objeto { id, name, background } e fallback string (id)
          const id = typeof item === 'string' ? item : (item as BoardInfo)?.id
          if (!id) return null
          return boardMap.get(id) || (typeof item === 'object' && item && 'name' in item ? item as BoardInfo : null)
        })
        .filter((b): b is BoardInfo => b !== null && !!b.id && !!b.name)

      setRecentBoards(boards.slice(0, 4))
    } catch {
      // localStorage indisponível ou dados corrompidos
    }
  }, [allBoards])

  if (recentBoards.length === 0) return null

  return (
    <section className="mb-8">
      <h3 className="flex items-center gap-2 text-base font-bold text-[#DEE4EA] mb-4">
        <Clock className="w-5 h-5 text-[#9FADBC]" />
        Visualizado recentemente
      </h3>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}
      >
        {recentBoards.map((board) => (
          <Link
            key={board.id}
            href={`/board/${board.id}`}
            className="group/card relative h-24 rounded-lg overflow-hidden transition-all duration-200"
          >
            <div
              className="absolute inset-0 rounded-lg"
              style={{ backgroundColor: board.background }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/20 transition-colors duration-200 rounded-lg" />
            <span className="relative z-10 block text-sm font-bold text-white drop-shadow-sm absolute bottom-0 left-0 right-0 p-2">
              {board.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
