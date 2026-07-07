-- Version 27: Nyhedstavle (opslag der ruller i bunden af tavlen)
-- Koer denne EN gang i Supabase -> SQL Editor -> New query -> Run

create table if not exists news (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  breaking boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table news enable row level security;
