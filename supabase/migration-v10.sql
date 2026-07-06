-- Version 10: Tilbagekoersler taeller altid med i statistikken
-- Koer denne EN gang i Supabase -> SQL Editor -> New query -> Run

alter table tasks add column if not exists was_returned boolean not null default false;
