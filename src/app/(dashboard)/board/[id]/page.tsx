import { getBoardWithLists } from '@/lib/actions/board'
import { isStarred } from '@/lib/actions/star'
import { BoardView } from '@/components/board/board-view'
import { notFound } from 'next/navigation'
export const dynamic = 'force-dynamic'

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const [board, starred] = await Promise.all([
      getBoardWithLists(id),
      isStarred(id),
    ])
    return <BoardView board={board} labels={board.labels} initialStarred={starred} />
  } catch {
    notFound()
  }
}
