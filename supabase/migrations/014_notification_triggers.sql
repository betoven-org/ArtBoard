-- Trigger: notificar quando card muda de lista
create or replace function notify_card_moved()
returns trigger as $$
declare
  member_id uuid;
  card_name text;
  board_id_val uuid;
  old_list_name text;
  new_list_name text;
begin
  if OLD.list_id = NEW.list_id then return NEW; end if;

  select name into card_name from cards where id = NEW.id;
  select l.board_id, l.name into board_id_val, new_list_name from lists l where l.id = NEW.list_id;
  select name into old_list_name from lists where id = OLD.list_id;

  for member_id in
    select user_id from card_members where card_id = NEW.id
  loop
    insert into notifications (user_id, type, card_id, board_id, message)
    values (member_id, 'assignment', NEW.id, board_id_val,
      'Card "' || card_name || '" movido de ' || old_list_name || ' para ' || new_list_name);
  end loop;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_card_moved
  after update of list_id on cards
  for each row execute function notify_card_moved();

-- Trigger: notificar quando due_date esta proximo (24h)
-- Usa pg_cron ou pode ser chamado via Edge Function periodicamente
-- Aqui criamos a funcao que pode ser invocada via cron job
create or replace function notify_due_date_soon()
returns void as $$
declare
  r record;
  member_id uuid;
begin
  for r in
    select c.id as card_id, c.name as card_name, l.board_id
    from cards c
    join lists l on l.id = c.list_id
    where c.due_date is not null
      and c.due_complete = false
      and c.closed = false
      and c.due_date between now() and now() + interval '24 hours'
      and not exists (
        select 1 from notifications n
        where n.card_id = c.id
          and n.type = 'due_date'
          and n.created_at > now() - interval '24 hours'
      )
  loop
    for member_id in
      select user_id from card_members where card_id = r.card_id
    loop
      insert into notifications (user_id, type, card_id, board_id, message)
      values (member_id, 'due_date', r.card_id, r.board_id,
        'Card "' || r.card_name || '" vence em menos de 24 horas');
    end loop;
  end loop;
end;
$$ language plpgsql security definer;

-- Funcao para deletar notificacoes antigas (mais de 30 dias)
create or replace function cleanup_old_notifications()
returns void as $$
begin
  delete from notifications where created_at < now() - interval '30 days';
end;
$$ language plpgsql security definer;
