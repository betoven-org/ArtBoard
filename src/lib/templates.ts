export type BoardTemplate = {
  id: string
  name: string
  description: string
  icon: string
  background: string
  lists: Array<{
    name: string
    cards: Array<{ name: string; description?: string }>
  }>
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'project-management',
    name: 'Gestao de Projetos',
    description: 'Organize sprints, tarefas e entregas do seu time',
    icon: 'briefcase',
    background: '#0079bf',
    lists: [
      {
        name: 'Backlog',
        cards: [
          { name: 'Definir escopo do projeto', description: 'Alinhar objetivos e entregaveis com stakeholders' },
          { name: 'Criar cronograma', description: 'Definir marcos e prazos' },
          { name: 'Mapear riscos' },
        ],
      },
      {
        name: 'A Fazer',
        cards: [
          { name: 'Setup do ambiente' },
          { name: 'Documentacao inicial' },
        ],
      },
      {
        name: 'Em Progresso',
        cards: [],
      },
      {
        name: 'Em Revisao',
        cards: [],
      },
      {
        name: 'Concluido',
        cards: [],
      },
    ],
  },
  {
    id: 'kanban-basic',
    name: 'Kanban Basico',
    description: 'Quadro simples com To Do, Doing e Done',
    icon: 'layout',
    background: '#519839',
    lists: [
      {
        name: 'To Do',
        cards: [
          { name: 'Primeira tarefa' },
          { name: 'Segunda tarefa' },
          { name: 'Terceira tarefa' },
        ],
      },
      {
        name: 'Doing',
        cards: [],
      },
      {
        name: 'Done',
        cards: [],
      },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing e Campanhas',
    description: 'Planeje campanhas, conteudo e calendario editorial',
    icon: 'megaphone',
    background: '#cd5a91',
    lists: [
      {
        name: 'Ideias',
        cards: [
          { name: 'Brainstorm de campanhas Q1' },
          { name: 'Pesquisa de concorrentes' },
        ],
      },
      {
        name: 'Planejamento',
        cards: [
          { name: 'Definir buyer personas', description: 'Mapear perfis de cliente ideal' },
          { name: 'Calendario editorial do mes' },
        ],
      },
      {
        name: 'Em Producao',
        cards: [],
      },
      {
        name: 'Aprovacao',
        cards: [],
      },
      {
        name: 'Publicado',
        cards: [],
      },
    ],
  },
  {
    id: 'onboarding',
    name: 'Onboarding',
    description: 'Processo de integracao de novos membros',
    icon: 'user-plus',
    background: '#89609e',
    lists: [
      {
        name: 'Antes do 1o dia',
        cards: [
          { name: 'Enviar kit de boas-vindas' },
          { name: 'Configurar acessos (email, Slack, etc)' },
          { name: 'Preparar estacao de trabalho' },
        ],
      },
      {
        name: 'Semana 1',
        cards: [
          { name: 'Tour pelo escritorio/time' },
          { name: 'Apresentar cultura e valores' },
          { name: 'Reuniao com gestor direto' },
        ],
      },
      {
        name: 'Semana 2-4',
        cards: [
          { name: 'Treinamentos tecnicos' },
          { name: 'Primeiro projeto acompanhado' },
        ],
      },
      {
        name: 'Concluido',
        cards: [],
      },
    ],
  },
  {
    id: 'design-sprint',
    name: 'Design Sprint',
    description: 'Sprint de design em 5 dias',
    icon: 'palette',
    background: '#d29034',
    lists: [
      {
        name: 'Dia 1 - Entender',
        cards: [
          { name: 'Mapear o problema' },
          { name: 'Entrevistas com stakeholders' },
          { name: 'Definir meta do sprint' },
        ],
      },
      {
        name: 'Dia 2 - Divergir',
        cards: [
          { name: 'Crazy 8s' },
          { name: 'Sketches individuais' },
        ],
      },
      {
        name: 'Dia 3 - Decidir',
        cards: [
          { name: 'Votacao dot voting' },
          { name: 'Storyboard da solucao' },
        ],
      },
      {
        name: 'Dia 4 - Prototipar',
        cards: [
          { name: 'Construir prototipo' },
        ],
      },
      {
        name: 'Dia 5 - Testar',
        cards: [
          { name: 'Testes com usuarios' },
          { name: 'Coletar feedbacks' },
          { name: 'Documentar aprendizados' },
        ],
      },
    ],
  },
  {
    id: 'dev-roadmap',
    name: 'Roadmap de Produto',
    description: 'Planeje features e releases do produto',
    icon: 'rocket',
    background: '#7B68EE',
    lists: [
      {
        name: 'Explorar',
        cards: [
          { name: 'Pesquisa de mercado' },
          { name: 'Analise de dados de uso' },
        ],
      },
      {
        name: 'Proximo Quarter',
        cards: [
          { name: 'Feature X - MVP', description: 'Escopo minimo viavel da feature' },
          { name: 'Melhorias de performance' },
        ],
      },
      {
        name: 'Em Desenvolvimento',
        cards: [],
      },
      {
        name: 'Beta / QA',
        cards: [],
      },
      {
        name: 'Lancado',
        cards: [],
      },
    ],
  },
]
