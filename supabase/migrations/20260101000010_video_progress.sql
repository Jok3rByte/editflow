-- EditFlow — 0010: medidor de % de avance de edición
--
-- El editor actualiza manualmente qué tan avanzado va su edición (10% a
-- 100%, en pasos de 10). El medidor solo "corre" (y se puede editar)
-- mientras el video está en estado "edicion" — en cualquier otro estado
-- queda congelado. progreso_inicio marca desde cuándo entró a edición, para
-- poder calcular después alertas de "lleva mucho tiempo con % bajo".

alter table videos add column progreso integer not null default 10 check (progreso between 10 and 100);
alter table videos add column progreso_inicio timestamptz;

-- Arranca (o reinicia) el cronómetro y el % cada vez que un video ENTRA a
-- "edicion" — coherente con la regla "mientras está en pendiente, revisión
-- o aprobado este medidor no suma".
create or replace function set_video_progreso_inicio() returns trigger as $$
begin
  if tg_op = 'UPDATE' and new.status = 'edicion' and old.status is distinct from 'edicion' then
    new.progreso_inicio = now();
    new.progreso = 10;
  end if;
  return new;
end $$ language plpgsql;

create trigger trg_video_progreso_inicio before update on videos
for each row execute function set_video_progreso_inicio();
