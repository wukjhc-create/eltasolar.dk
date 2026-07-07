-- Version 35: Fag-opdeling (EL / Montage) paa tilbagekoersler
-- Koer denne EN gang i Supabase -> SQL Editor -> New query -> Run

alter table returns add column if not exists fag text; -- 'el' eller 'montage'
