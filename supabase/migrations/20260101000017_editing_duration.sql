-- EditFlow — 0017: medir cuánto duró la edición y cerrar el avance al 100%
--
-- Cuando un video pasa a "en_revision", su medidor de avance salta a 100% y
-- se calcula automáticamente cuánto tardó la edición: desde que entró a
-- "edicion" (progreso_inicio) hasta este momento, guardado en segundos. Con
-- eso Métricas muestra horas/días/segundos por video sin cálculos a mano.

alter table videos add column edicion_segundos integer;

create or replace function set_video_progreso_inicio() returns trigger as $$
begin
  if tg_op = 'UPDATE' then
    -- Entra a edición: arranca el cronómetro y el medidor en 10%.
    if new.status = 'edicion' and old.status is distinct from 'edicion' then
      new.progreso_inicio = now();
      new.progreso = 10;
    -- Entra a revisión: medidor al 100% y se mide la duración de la edición.
    elsif new.status = 'en_revision' and old.status is distinct from 'en_revision' then
      new.progreso = 100;
      if new.progreso_inicio is not null then
        new.edicion_segundos = greatest(0, extract(epoch from (now() - new.progreso_inicio))::int);
      end if;
    end if;
  end if;
  return new;
end $$ language plpgsql;
