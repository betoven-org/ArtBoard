alter table cards add column priority text check (priority in ('critical', 'high', 'medium', 'low'));
create index idx_cards_priority on cards(priority);
