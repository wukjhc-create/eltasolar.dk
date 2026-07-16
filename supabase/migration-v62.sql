-- Version 62: ELTA Standard - slides til informationstavlen
-- Koer denne EN gang i Supabase -> SQL Editor -> New query -> Run

create table if not exists info_slides (
  id bigint generated always as identity primary key,
  title text not null,
  subtitle text,
  body text,
  bullet_points text,          -- et punkt pr. linje
  footer_text text,
  category text default 'Generel information',
  image_url text,
  icon text,                   -- emoji eller kort tekst
  background_type text default 'solskin',  -- solskin | blaek | solgul | groen | gradient_sol | gradient_blaek | billede
  background_image_url text,
  text_color text default 'moerk',         -- moerk | lys
  text_alignment text default 'venstre',   -- venstre | center
  display_duration int,        -- sekunder; tom = standardtiden
  sort_order int default 0,
  priority int default 1,      -- 1 = normal, 2 = vigtig (vises dobbelt saa ofte)
  is_active boolean default true,
  start_date date,
  end_date date,
  weekdays text,               -- fx "1,2,3,4,5"; tom = alle dage
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

-- Eksempel-slides til test (kan redigeres/slettes i admin)
insert into info_slides (title, subtitle, bullet_points, footer_text, category, icon, background_type, text_color, sort_order, priority) values
('DET ER DE SIDSTE 5 %, DER GØR FORSKELLEN',
 'Hos ELTA Solar skal det håndværksmæssige være 110 % i orden.',
 'Tagkroge sidder korrekt og er kontrolleret
Panelerne ligger lige uden tænder eller højdeforskelle
Afstandene mellem panelerne er ens
Skinnerne er afsluttet pænt
Kabelkanaler sidder lige og er skåret pænt
Kabler er fastgjort og beskyttet korrekt
Anlægget er testet før aflevering
Der er ryddet op efter arbejdet',
 'Vi afleverer kun arbejde, vi selv ville være stolte af at få monteret.',
 'Kvalitet', '☀️', 'solskin', 'moerk', 1, 2),
('ELEKTRIKERENS ARBEJDE ER VORES VISITKORT',
 null,
 'Tavlen er opbygget pænt og overskueligt
Ledninger er oplagt korrekt
Klemmer er spændt med korrekt moment
Beskyttelsesudstyr er korrekt dimensioneret
Kabler og komponenter er mærket
Målinger er udført og dokumenteret
Smartmeter, inverter og kommunikation virker
App og overvågning er kontrolleret
Kunden har fået en gennemgang',
 'Det, der ikke kan ses, skal stadig være udført korrekt.',
 'Elektriker', '⚡', 'blaek', 'lys', 2, 1),
('SIKKERHED FØRST – HVER GANG',
 'Ingen opgave er så vigtig, at den skal koste en skade.',
 'Faldsikring er på, når du er på taget
Stiger er sikret og står korrekt
Afdækning og afspærring er på plads
Værnemidler bruges – hver gang
Spændingsløst arbejde kontrolleres altid
Meld nærved-ulykker, så vi kan lære af dem',
 'Vi passer på hinanden – alle skal helskindet hjem.',
 'Sikkerhed', '🦺', 'solgul', 'moerk', 3, 2);
