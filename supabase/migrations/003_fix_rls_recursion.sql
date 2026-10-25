-- Fix: board_members policy recursion
-- O problema é que board_members_select consulta board_members, causando loop infinito

drop policy if exists "board_members_select" on board_members;
drop policy if exists "board_members_manage" on board_members;

-- Selecionar: o próprio user vê suas memberships, ou é owner do workspace
create policy "board_members_select" on board_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from boards b
      join workspaces w on w.id = b.workspace_id
      where b.id = board_members.board_id and w.owner_id = auth.uid()
    )
  );

-- Inserir: apenas owner do workspace ou admin do board pode adicionar membros
-- Usa subquery direta sem self-reference circular
create policy "board_members_insert" on board_members
  for insert with check (
    exists (
      select 1 from boards b
      join workspaces w on w.id = b.workspace_id
      where b.id = board_members.board_id and w.owner_id = auth.uid()
    )
  );

create policy "board_members_delete" on board_members
  for delete using (
    exists (
      select 1 from boards b
      join workspaces w on w.id = b.workspace_id
      where b.id = board_members.board_id and w.owner_id = auth.uid()
    )
  );

-- Fix: boards select também pode ter recursão via board_members
drop policy if exists "board_member_select" on boards;

create policy "board_member_select" on boards
  for select using (
    exists (
      select 1 from workspaces where id = workspace_id and owner_id = auth.uid()
    )
    or id in (select bm.board_id from board_members bm where bm.user_id = auth.uid())
  );

-- Fix: lists policy - evitar join com board_members que pode causar recursão
drop policy if exists "list_board_member" on lists;

create policy "list_board_member" on lists
  for all using (
    exists (
      select 1 from boards b
      join workspaces w on w.id = b.workspace_id
      where b.id = lists.board_id and w.owner_id = auth.uid()
    )
    or lists.board_id in (select bm.board_id from board_members bm where bm.user_id = auth.uid())
  );

-- Fix: cards policy
drop policy if exists "card_board_member" on cards;

create policy "card_board_member" on cards
  for all using (
    exists (
      select 1 from lists l
      join boards b on b.id = l.board_id
      join workspaces w on w.id = b.workspace_id
      where l.id = cards.list_id and w.owner_id = auth.uid()
    )
    or exists (
      select 1 from lists l
      where l.id = cards.list_id
      and l.board_id in (select bm.board_id from board_members bm where bm.user_id = auth.uid())
    )
  );

-- Fix: labels
drop policy if exists "label_board_member" on labels;

create policy "label_board_member" on labels
  for all using (
    exists (
      select 1 from boards b
      join workspaces w on w.id = b.workspace_id
      where b.id = labels.board_id and w.owner_id = auth.uid()
    )
    or labels.board_id in (select bm.board_id from board_members bm where bm.user_id = auth.uid())
  );

-- Fix: card_labels
drop policy if exists "card_label_access" on card_labels;

create policy "card_label_access" on card_labels
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      where c.id = card_labels.card_id
      and l.board_id in (select bm.board_id from board_members bm where bm.user_id = auth.uid())
    )
  );

-- Fix: checklists
drop policy if exists "checklist_access" on checklists;

create policy "checklist_access" on checklists
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      where c.id = checklists.card_id
      and l.board_id in (select bm.board_id from board_members bm where bm.user_id = auth.uid())
    )
  );

-- Fix: checklist_items
drop policy if exists "checklist_item_access" on checklist_items;

create policy "checklist_item_access" on checklist_items
  for all using (
    exists (
      select 1 from checklists cl
      join cards c on c.id = cl.card_id
      join lists l on l.id = c.list_id
      where cl.id = checklist_items.checklist_id
      and l.board_id in (select bm.board_id from board_members bm where bm.user_id = auth.uid())
    )
  );

-- Fix: card_members
drop policy if exists "card_member_access" on card_members;

create policy "card_member_access" on card_members
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      where c.id = card_members.card_id
      and l.board_id in (select bm.board_id from board_members bm where bm.user_id = auth.uid())
    )
  );

-- Fix: comments
drop policy if exists "comment_access" on comments;

create policy "comment_access" on comments
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      where c.id = comments.card_id
      and l.board_id in (select bm.board_id from board_members bm where bm.user_id = auth.uid())
    )
  );

-- Fix: attachments
drop policy if exists "attachment_access" on attachments;

create policy "attachment_access" on attachments
  for all using (
    exists (
      select 1 from cards c
      join lists l on l.id = c.list_id
      where c.id = attachments.card_id
      and l.board_id in (select bm.board_id from board_members bm where bm.user_id = auth.uid())
    )
  );
