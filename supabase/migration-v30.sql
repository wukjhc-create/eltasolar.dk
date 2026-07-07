-- Version 30: Tre nyhedskanaler (Breaking, Opslagstavlen, Ros & fejring)
-- Koer denne EN gang i Supabase -> SQL Editor -> New query -> Run

alter table news add column if not exists category text not null default 'opslag';
update news set category = 'breaking' where breaking = true and category = 'opslag';
