-- Função helper que bypassa RLS para checar membership
create or replace function is_board_member(p_board_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from board_members where board_id = p_board_id and user_id = p_user_id
  );
$$ language sql security definer stable;

-- Função helper para checar se é owner do workspace do board
create or replace function is_board_owner(p_board_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from boards b
    join workspaces w on w.id = b.workspace_id
    where b.id = p_board_id and w.owner_id = p_user_id
  );
$$ language sql security definer stable;

-- Função helper: dado um workspace_id, checar se é owner
create or replace function is_workspace_owner(p_workspace_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from workspaces where id = p_workspace_id and owner_id = p_user_id
  );
$$ language sql security definer stable;

-- ===========================================
-- Recriar TODAS as policies usando as funções
-- ===========================================

-- BOARDS
drop policy if exists "board_member_select" on boards;
drop policy if exists "board_member_insert" on boards;
drop policy if exists "board_member_update" on boards;
drop policy if exists "board_member_delete" on boards;

create policy "board_select" on boards
  for select using (
    is_workspace_owner(workspace_id, auth.uid())
    or is_board_member(id, auth.uid())
  );

create policy "board_insert" on boards
  for insert with check (
    is_workspace_owner(workspace_id, auth.uid())
  );

create policy "board_update" on boards
  for update using (
    is_workspace_owner(workspace_id, auth.uid())
    or is_board_member(id, auth.uid())
  );

create policy "board_delete" on boards
  for delete using (
    is_workspace_owner(workspace_id, auth.uid())
  );

-- BOARD_MEMBERS
drop policy if exists "board_members_select" on board_members;
drop policy if exists "board_members_insert" on board_members;
drop policy if exists "board_members_delete" on board_members;

create policy "bm_select" on board_members
  for select using (
    user_id = auth.uid()
    or is_board_member(board_id, auth.uid())
    or is_board_owner(board_id, auth.uid())
  );

create policy "bm_insert" on board_members
  for insert with check (
    is_board_owner(board_id, auth.uid())
  );

create policy "bm_delete" on board_members
  for delete using (
    is_board_owner(board_id, auth.uid())
  );

-- LISTS
drop policy if exists "list_board_member" on lists;

create policy "list_access" on lists
  for all using (
    is_board_member(board_id, auth.uid())
    or is_board_owner(board_id, auth.uid())
  );

-- CARDS
drop policy if exists "card_board_member" on cards;

create policy "card_access" on cards
  for all using (
    exists (
      select 1 from lists l where l.id = cards.list_id
      and (is_board_member(l.board_id, auth.uid()) or is_board_owner(l.board_id, auth.uid()))
    )
  );

-- LABELS
drop policy if exists "label_board_member" on labels;

create policy "label_access" on labels
  for all using (
    is_board_member(board_id, auth.uid())
    or is_board_owner(board_id, auth.uid())
  );

-- CARD_LABELS
drop policy if exists "card_label_access" on card_labels;

create policy "card_label_access" on card_labels
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      where c.id = card_labels.card_id
      and (is_board_member(l.board_id, auth.uid()) or is_board_owner(l.board_id, auth.uid()))
    )
  );

-- CHECKLISTS
drop policy if exists "checklist_access" on checklists;

create policy "checklist_access" on checklists
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      where c.id = checklists.card_id
      and (is_board_member(l.board_id, auth.uid()) or is_board_owner(l.board_id, auth.uid()))
    )
  );

-- CHECKLIST_ITEMS
drop policy if exists "checklist_item_access" on checklist_items;

create policy "checklist_item_access" on checklist_items
  for all using (
    exists (
      select 1 from checklists cl
      join cards c on c.id = cl.card_id
      join lists l on l.id = c.list_id
      where cl.id = checklist_items.checklist_id
      and (is_board_member(l.board_id, auth.uid()) or is_board_owner(l.board_id, auth.uid()))
    )
  );

-- CARD_MEMBERS
drop policy if exists "card_member_access" on card_members;

create policy "card_member_access" on card_members
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      where c.id = card_members.card_id
      and (is_board_member(l.board_id, auth.uid()) or is_board_owner(l.board_id, auth.uid()))
    )
  );

-- COMMENTS
drop policy if exists "comment_access" on comments;

create policy "comment_access" on comments
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      where c.id = comments.card_id
      and (is_board_member(l.board_id, auth.uid()) or is_board_owner(l.board_id, auth.uid()))
    )
  );

-- ATTACHMENTS
drop policy if exists "attachment_access" on attachments;

create policy "attachment_access" on attachments
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      where c.id = attachments.card_id
      and (is_board_member(l.board_id, auth.uid()) or is_board_owner(l.board_id, auth.uid()))
    )
  );
