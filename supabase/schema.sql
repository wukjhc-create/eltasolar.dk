-- Driftstavle: databaseopsætning til Supabase
-- Kør hele filen i Supabase -> SQL Editor -> New query -> Run

create extension if not exists "pgcrypto";

-- HOLD
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#2563eb',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- MEDARBEJDERE
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'Montør',
  team_id uuid references teams(id) on delete set null,
  active boolean not null default true,
  show_on_board boolean not null default true,
  daily_hours numeric not null default 7.5,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- OPGAVER
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  employee_id uuid references employees(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  order_number text,
  title text,
  customer_address text,
  status text not null default 'planlagt'
    check (status in ('planlagt', 'i_gang', 'lukket', 'tilbage')),
  return_reason text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_date_idx on tasks (date);
create index if not exists tasks_employee_idx on tasks (employee_id);
create index if not exists tasks_team_idx on tasks (team_id);

-- FRAVÆR (én række pr. medarbejder pr. dag)
create table if not exists absences (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  hours numeric not null default 7.5,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, date)
);

create index if not exists absences_date_idx on absences (date);

-- INDSTILLINGER (til senere udvidelser)
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text
);

-- Row Level Security: slået til uden policies.
-- Appen bruger kun service role-nøglen på serveren, som går uden om RLS.
-- Det betyder at den offentlige anon-nøgle IKKE kan læse eller skrive data.
alter table teams enable row level security;
alter table employees enable row level security;
alter table tasks enable row level security;
alter table absences enable row level security;
alter table settings enable row level security;
