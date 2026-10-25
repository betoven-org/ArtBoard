-- Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('mention', 'due_date', 'assignment', 'comment')),
  card_id uuid references cards(id) on delete cascade,
  board_id uuid references boards(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id, read, created_at desc);

alter table notifications enable row level security;

create policy "notification_owner" on notifications
  for all using (user_id = auth.uid());

alter publication supabase_realtime add table notifications;

-- Trigger: notificar quando alguém comenta num card onde sou membro
create or replace function notify_card_comment()
returns trigger as $$
declare
  member_id uuid;
  card_name text;
  board_id_val uuid;
begin
  select c.name, l.board_id into card_name, board_id_val
  from cards c join lists l on l.id = c.list_id
  where c.id = NEW.card_id;

  for member_id in
    select user_id from card_members where card_id = NEW.card_id and user_id != NEW.user_id
  loop
    insert into notifications (user_id, type, card_id, board_id, message)
    values (member_id, 'comment', NEW.card_id, board_id_val,
      'Novo comentário no card "' || card_name || '"');
  end loop;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_comment_created
  after insert on comments
  for each row execute function notify_card_comment();

-- Trigger: notificar quando sou adicionado a um card
create or replace function notify_card_assignment()
returns trigger as $$
declare
  card_name text;
  board_id_val uuid;
begin
  select c.name, l.board_id into card_name, board_id_val
  from cards c join lists l on l.id = c.list_id
  where c.id = NEW.card_id;

  insert into notifications (user_id, type, card_id, board_id, message)
  values (NEW.user_id, 'assignment', NEW.card_id, board_id_val,
    'Você foi adicionado ao card "' || card_name || '"');

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_card_member_added
  after insert on card_members
  for each row execute function notify_card_assignment();
