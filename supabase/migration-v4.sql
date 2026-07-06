-- Version 4: Automatisk synkronisering fra Ordrestyring
-- Koer denne EN gang i Supabase -> SQL Editor -> New query -> Run

-- Kobling mellem tavlens medarbejdere og Ordrestyrings brugere
alter table employees add column if not exists os_user_id int unique;

-- Kobling mellem tavlens opgaver og Ordrestyrings kalender-events
alter table tasks add column if not exists os_identifier text unique;

-- Fravaer kan nu ogsaa komme fra Ordrestyring
alter table absences add column if not exists os_identifier text;
