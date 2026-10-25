-- Suporte a pause/resume no timer
-- paused_at: quando não-null, timer está pausado
-- paused_seconds: tempo acumulado de pausas anteriores
alter table time_entries add column paused_at timestamptz;
alter table time_entries add column paused_seconds integer not null default 0;
