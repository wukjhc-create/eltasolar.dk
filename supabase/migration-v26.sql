-- Version 26: Tilbagekoersler som logbog (haendelser med dato)
-- Koer denne EN gang i Supabase -> SQL Editor -> New query -> Run

create table if not exists returns (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,
  title text,
  reason text not null default 'Andet',
  date date not null default ((now() at time zone 'Europe/Copenhagen')::date),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists returns_date_idx on returns (date);
create index if not exists returns_order_idx on returns (order_number);

alter table returns enable row level security;
