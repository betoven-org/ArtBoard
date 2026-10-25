export type Workspace = {
  id: string
  name: string
  slug: string
  owner_id: string
  created_at: string
}

export type Board = {
  id: string
  workspace_id: string
  name: string
  background: string
  closed: boolean
  created_at: string
}

export type List = {
  id: string
  board_id: string
  name: string
  position: number
  closed: boolean
  created_at: string
}

export type Card = {
  id: string
  list_id: string
  name: string
  description: string | null
  position: number
  due_date: string | null
  due_complete: boolean
  closed: boolean
  cover_color: string | null
  cover_image: string | null
  estimated_hours: number | null
  priority: 'critical' | 'high' | 'medium' | 'low' | null
  card_type: 'task' | 'bug' | 'feature' | 'epic' | 'story' | 'improvement' | null
  sprint_id: string | null
  epic_id: string | null
  story_points: number | null
  created_at: string
  labels?: Label[]
  card_labels?: { label_id: string }[]
  checklists?: Checklist[]
  comments?: Comment[]
  card_members?: CardMember[]
}

export type Label = {
  id: string
  board_id: string
  name: string
  color: string
}

export type CardLabel = {
  card_id: string
  label_id: string
}

export type Checklist = {
  id: string
  card_id: string
  name: string
  position: number
  items?: ChecklistItem[]
}

export type ChecklistItem = {
  id: string
  checklist_id: string
  name: string
  checked: boolean
  position: number
}

export type BoardMember = {
  board_id: string
  user_id: string
  role: 'admin' | 'member' | 'observer'
}

export type CardMember = {
  card_id: string
  user_id: string
}

export type Comment = {
  id: string
  card_id: string
  user_id: string
  text: string
  created_at: string
}

export type Sprint = {
  id: string
  board_id: string
  name: string
  goal: string | null
  start_date: string | null
  end_date: string | null
  status: 'planning' | 'active' | 'completed'
  created_at: string
}

export type Attachment = {
  id: string
  card_id: string
  url: string
  name: string
  created_at: string
}

export type ListWithCards = List & {
  cards: Card[]
}

export type BoardWithLists = Board & {
  lists: ListWithCards[]
}
