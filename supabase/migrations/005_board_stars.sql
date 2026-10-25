create table board_stars (
  board_id uuid not null references boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (board_id, user_id)
);

alter table board_stars enable row level security;

create policy "star_owner" on board_stars
  for all using (user_id = auth.uid());
