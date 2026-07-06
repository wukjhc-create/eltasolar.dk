-- Valgfrit testdata: 4 hold og 8 medarbejdere (som i eksemplet).
-- Kør efter schema.sql hvis du vil starte med noget at se på.

insert into teams (name, color, sort_order) values
  ('Hold 1', '#2563eb', 1),
  ('Hold 2', '#16a34a', 2),
  ('Hold 3', '#9333ea', 3),
  ('Hold 4', '#ea580c', 4);

insert into employees (name, role, team_id, sort_order)
select v.name, v.role, t.id, v.sort_order
from (values
  ('Tomme',   'Montør', 'Hold 1', 1),
  ('Ole',     'Montør', 'Hold 1', 2),
  ('Carsten', 'Montør', 'Hold 2', 3),
  ('Mike',    'Montør', 'Hold 2', 4),
  ('Anders',  'Montør', 'Hold 3', 5),
  ('Lars',    'Montør', 'Hold 3', 6),
  ('Mikkel',  'Montør', 'Hold 4', 7),
  ('Henrik',  'Montør', 'Hold 4', 8)
) as v(name, role, team_name, sort_order)
join teams t on t.name = v.team_name;
