-- EditFlow — 0023: marcar cuándo avanzó por última vez el % de un video
--
-- Para alertar cuando un video lleva más de 1 hora en edición sin que su %
-- avance, guardamos progreso_actualizado: la hora del último cambio de %. El
-- front compara contra "ahora" y, si pasó más de 1 hora, suena la alerta.

alter table videos add column if not exists progreso_actualizado timestamptz;

create or replace function set_video_progreso_inicio() returns trigger as $$
begin
  if tg_op = 'UPDATE' then
    if new.status = 'edicion' and old.status is distinct from 'edicion' then
      new.progreso_inicio = now();
      new.progreso = 10;
      new.progreso_actualizado = now();
    elsif new.status = 'en_revision' and old.status is distinct from 'en_revision' then
      new.progreso = 100;
      if new.progreso_inicio is not null then
        new.edicion_segundos = greatest(0, extract(epoch from (now() - new.progreso_inicio))::int);
      end if;
    end if;
    -- Cada vez que cambia el %, se refresca la marca de "último avance".
    if new.progreso is distinct from old.progreso then
      new.progreso_actualizado = now();
    end if;
  end if;
  return new;
end $$ language plpgsql;
