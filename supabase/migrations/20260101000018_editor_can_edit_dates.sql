-- EditFlow — 0018: el editor también puede editar las fechas de un video
--
-- Antes el trigger enforce_editor_video_columns bloqueaba a los editores en
-- start_date y due_date. Ahora un editor puede ajustar las fechas de inicio y
-- entrega de sus videos (además de estado, avance, observaciones y link).
-- Sigue sin poder cambiar cliente, título, estratega, prioridad, seq, período
-- ni reasignar el video a otra persona.

create or replace function enforce_editor_video_columns() returns trigger as $$
declare rol member_role;
begin
  rol := org_role(new.organization_id);
  if rol = 'editor' then
    if new.editor_id is distinct from old.editor_id
       and old.editor_id is distinct from current_membership_id(new.organization_id) then
      raise exception 'No tienes permiso para reasignar este video.';
    end if;
    if new.client_id is distinct from old.client_id
       or new.title is distinct from old.title
       or new.strategist is distinct from old.strategist
       or new.priority is distinct from old.priority
       or new.seq is distinct from old.seq
       or new.period_id is distinct from old.period_id then
      raise exception 'Como editor solo puedes modificar estado, avance, fechas, observaciones y el link procesado.';
    end if;
  end if;
  return new;
end $$ language plpgsql;
