-- EditFlow — 0009: arrastre automático de videos pendientes al cerrar el mes
--
-- Regla: un video "pendiente", "en edición" o "en revisión" nunca se pierde
-- al cambiar de mes — se traslada solo, sin que nadie tenga que marcarlo a
-- mano, al día 1 del mes que se abre. Solo los videos "aprobados" (o
-- entregados/cancelados) se quedan congelados en el histórico del mes que
-- cierra. Antes esto era opcional (checkbox en el asistente de abrir mes);
-- ahora open_period() lo hace siempre, dentro de la misma transacción que
-- crea el periodo nuevo.

create or replace function open_period(
  p_org uuid, p_year int, p_month int,
  p_client_ids uuid[] default '{}',
  p_goals int[] default '{}'
) returns uuid as $$
declare
  new_period uuid;
  prev_period uuid;
  new_month_start date;
  new_month_label text;
  i int;
begin
  if coalesce(org_role(p_org)::text, '') not in ('owner','admin') then
    raise exception 'Solo el propietario o un administrador puede abrir un mes.';
  end if;

  new_month_start := make_date(p_year, p_month, 1);
  new_month_label := upper(to_char(new_month_start, 'TMMonth YYYY'));

  insert into periods (organization_id, year, month, label, opened_by)
  values (p_org, p_year, p_month, new_month_label, auth.uid())
  returning id into new_period;

  for i in 1 .. coalesce(array_length(p_client_ids,1),0) loop
    insert into client_periods (organization_id, period_id, client_id, monthly_goal, strategist, editor_id)
    select p_org, new_period, c.id,
           coalesce(p_goals[i], c.default_monthly_goal),
           c.default_strategist, c.default_editor_id
    from clients c where c.id = p_client_ids[i];
  end loop;

  -- Arrastre automático desde el periodo más reciente de la organización
  -- (el que está cerrando): todo lo que no llegó a "aprobado" pasa al día 1
  -- de este mes nuevo, sin excepción ni selección manual.
  select id into prev_period
  from periods
  where organization_id = p_org and id <> new_period
  order by year desc, month desc
  limit 1;

  if prev_period is not null then
    with arrastrados as (
      insert into videos (
        organization_id, period_id, client_id, title, editor_id, editor_name_raw,
        start_date, due_date, status, priority, strategist, observations,
        format, duration_seconds, carried_from_video_id, created_by
      )
      select
        v.organization_id, new_period, v.client_id, v.title, v.editor_id, v.editor_name_raw,
        new_month_start, new_month_start, 'pendiente', v.priority, v.strategist, v.observations,
        v.format, v.duration_seconds, v.id, auth.uid()
      from videos v
      where v.period_id = prev_period
        and v.status in ('pendiente','edicion','en_revision')
      returning carried_from_video_id
    )
    update videos
    set status = 'cancelado',
        observations = coalesce(observations || E'\n', '') || 'Trasladado automáticamente a ' || new_month_label || '.'
    where id in (select carried_from_video_id from arrastrados);
  end if;

  return new_period;
end $$ language plpgsql security definer;
