import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

const SYSTEM_PROMPT = `Você é um assistente que cria boards de projeto no estilo ArtBoard.
Dado uma descrição de projeto, gere um board completo com listas e cards organizados.

Responda APENAS com JSON válido no formato:
{
  "name": "Nome do Board",
  "background": "#hex",
  "lists": [
    {
      "name": "Nome da Lista",
      "cards": [
        { "name": "Título do card", "description": "Descrição opcional" }
      ]
    }
  ]
}

Regras:
- Crie entre 3 e 7 listas
- Cada lista deve ter entre 2 e 8 cards relevantes
- Use nomes claros e objetivos
- Inclua descrições úteis nos cards quando relevante
- Backgrounds: #0079bf (azul), #d29034 (laranja), #519839 (verde), #b04632 (vermelho), #89609e (roxo), #cd5a91 (rosa), #00aecc (cyan)
- Adapte a estrutura ao tipo de projeto (dev, marketing, pessoal, etc)`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { description, workspaceId } = await request.json()

  if (!description || !workspaceId) {
    return NextResponse.json({ error: 'Descrição e workspace são obrigatórios' }, { status: 400 })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: description }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Falha ao gerar board' }, { status: 500 })
    }

    const boardData = JSON.parse(jsonMatch[0])

    // Criar board
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .insert({
        workspace_id: workspaceId,
        name: boardData.name,
        background: boardData.background || '#0079bf',
      })
      .select()
      .single()

    if (boardError) throw boardError

    // Criar listas e cards
    for (let i = 0; i < boardData.lists.length; i++) {
      const listData = boardData.lists[i]
      const { data: list, error: listError } = await supabase
        .from('lists')
        .insert({
          board_id: board.id,
          name: listData.name,
          position: (i + 1) * 65536,
        })
        .select()
        .single()

      if (listError) throw listError

      if (listData.cards?.length) {
        const cardsToInsert = listData.cards.map((card: any, j: number) => ({
          list_id: list.id,
          name: card.name,
          description: card.description || null,
          position: (j + 1) * 65536,
        }))

        const { error: cardsError } = await supabase
          .from('cards')
          .insert(cardsToInsert)

        if (cardsError) throw cardsError
      }
    }

    return NextResponse.json({ boardId: board.id })
  } catch (error: any) {
    console.error('AI Board Builder error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar board' },
      { status: 500 }
    )
  }
}
