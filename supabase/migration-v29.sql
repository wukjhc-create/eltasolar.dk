-- Version 29: Tidsstyring paa nyheder (ugedage + klokkeslaet)
-- Koer denne EN gang i Supabase -> SQL Editor -> New query -> Run

alter table news add column if not exists days text;        -- fx "1,2,3,4,5" (man-soen som 1-7), tom = alle dage
alter table news add column if not exists start_time text;  -- fx "06:00", tom = fra midnat
alter table news add column if not exists stop_time text;   -- fx "09:00", tom = til midnat
