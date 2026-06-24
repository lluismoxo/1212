-- 1212 · Semillas idempotentes: roles + niveles 1..9
-- Datos de niveles tomados de LEVELS[] del prototipo (index.html).

insert into public.roles (key, label) values
  ('visitor','Visitante'),
  ('user','Usuario'),
  ('moderator','Moderador'),
  ('admin','Administrador')
on conflict (key) do nothing;

insert into public.levels (n, name, description, aura, colors, threshold) values
  (1,'Aprendiz',     'El primer paso. La piedra aún en bruto.',           '#8B3FE6','{"deep":"#160F26","mid":"#241738","light":"#3C2A5E","edge":"#6A4FB0","glow":"#8B3FE6"}',0),
  (2,'Acompañante',  'Caminas con constancia. La forma emerge.',          '#3F63E6','{"deep":"#0C1626","mid":"#142540","light":"#22416E","edge":"#4F74E6","glow":"#3F63E6"}',100),
  (3,'Maestro',      'Dominas tu disciplina. La gema toma color.',        '#2FB98A','{"deep":"#0A211B","mid":"#103229","light":"#1A5141","edge":"#2FB98A","glow":"#2FB98A"}',300),
  (4,'Guardián',     'Proteges tu progreso. La luz crece.',               '#FF4FA8','{"deep":"#2A0F22","mid":"#451631","light":"#7C2A57","edge":"#FF4FA8","glow":"#FF4FA8"}',600),
  (5,'Vidente',      'Ves más allá. Brillo y claridad.',                  '#2FE0D2','{"deep":"#0C2F3A","mid":"#134E5C","light":"#21788C","edge":"#2FE0D2","glow":"#2FE0D2"}',1000),
  (6,'Arquitecto',   'Construyes tu propio camino. Energía pura.',        '#4F9BFF','{"deep":"#15334C","mid":"#28567B","light":"#4787BE","edge":"#4F9BFF","glow":"#4F9BFF"}',1500),
  (7,'Soberano',     'Dueño de tu evolución. Casi pulido.',               '#9FB2D0','{"deep":"#34415A","mid":"#566A8C","light":"#869CC0","edge":"#B0C4E0","glow":"#9FB2D0"}',2100),
  (8,'Iluminado',    'Resplandor sereno. La perfección se acerca.',       '#6FE6FF','{"deep":"#6A6A80","mid":"#9696AE","light":"#C6C6D8","edge":"#E6E6F0","glow":"#6FE6FF"}',2800),
  (9,'Grado Supremo','La cima. Cristal puro de luz y oro.',               '#E6C77A','{"deep":"#9A8748","mid":"#D0AE5A","light":"#F2DC90","edge":"#FFF6D6","glow":"#E6C77A"}',3600)
on conflict (n) do update set
  name = excluded.name, description = excluded.description,
  aura = excluded.aura, colors = excluded.colors, threshold = excluded.threshold;
