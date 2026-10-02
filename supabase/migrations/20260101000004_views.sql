-- EditFlow — 0004: vistas (motor de cálculo automático)

-- ===== 5.B RESUMEN GENERAL — por cliente Y periodo =====
create or replace view v_client_summary as
select
  cp.period_id,
  p.label                as periodo,
  cp.organization_id,
  c.id                   as client_id,
  c.name                 as cliente,
  cp.strategist          as encargado,
  cp.monthly_goal        as meta_mensual,
  count(v.id)                                                  as total_videos,
  count(*) filter (where v.status = 'pendiente')               as pendientes,
  count(*) filter (where v.status = 'edicion')                 as en_edicion,
  count(*) filter (where v.status = 'en_revision')             as en_revision,
  count(*) filter (where v.status in ('aprobado','entregado')) as finalizados,
  round(100.0 * count(*) filter (where v.status in ('aprobado','entregado'))
        / nullif(count(v.id),0), 1)                            as porcentaje_avance,
  round(100.0 * count(*) filter (where v.status in ('aprobado','entregado'))
        / nullif(cp.monthly_goal,0), 1)                        as porcentaje_alcance_meta,
  count(*) filter (where v.due_date < current_date
        and v.status not in ('aprobado','entregado','cancelado')) as atrasados,
  max(v.delivered_at)                                          as ultima_entrega
from client_periods cp
join clients c on c.id = cp.client_id
join periods p on p.id = cp.period_id
left join videos v on v.client_id = cp.client_id and v.period_id = cp.period_id
where cp.active
group by cp.id, c.id, p.label;
alter view v_client_summary set (security_invoker = on);

-- ===== 5.C PRODUCTIVIDAD — por editor Y periodo =====
create or replace view v_editor_productivity as
select
  v.period_id,
  p.label            as periodo,
  m.organization_id,
  m.id               as editor_id,
  m.full_name        as editor,
  m.email,
  count(v.id)                                                  as videos_asignados,
  count(*) filter (where v.status in ('aprobado','entregado')) as entregados,
  count(*) filter (where v.status = 'edicion')                 as en_curso,
  count(*) filter (where v.status = 'en_revision')             as en_revision,
  count(*) filter (where v.due_date < current_date
        and v.status not in ('aprobado','entregado','cancelado')) as atrasados,
  count(*) filter (where v.delivered_at <= v.due_date)         as entregados_a_tiempo,
  round(100.0 * count(*) filter (where v.delivered_at <= v.due_date)
        / nullif(count(*) filter (where v.status in ('aprobado','entregado')),0), 1)
                                                               as cumplimiento_pct,
  round(avg(v.delivered_at - v.start_date)::numeric, 1)        as dias_promedio_edicion,
  round(avg(v.revision_count)::numeric, 2)                     as revisiones_promedio,
  count(distinct v.client_id)                                  as clientes_atendidos
from memberships m
join videos v  on v.editor_id = m.id
join periods p on p.id = v.period_id
group by v.period_id, p.label, m.id, m.organization_id, m.full_name, m.email;
alter view v_editor_productivity set (security_invoker = on);

-- ===== KPIs del dashboard, por periodo =====
create or replace view v_period_kpis as
select
  p.id as period_id, p.organization_id, p.label, p.status,
  count(v.id)                                                  as total_videos,
  count(*) filter (where v.status in ('aprobado','entregado')) as entregados,
  count(*) filter (where v.status = 'edicion')                 as en_edicion,
  count(*) filter (where v.status = 'en_revision')             as en_revision,
  count(*) filter (where v.status = 'pendiente')               as pendientes,
  count(*) filter (where v.due_date < current_date
        and v.status not in ('aprobado','entregado','cancelado')) as atrasados,
  (select count(*) from client_periods cp where cp.period_id = p.id and cp.active) as clientes_activos,
  (select coalesce(sum(cp.monthly_goal),0) from client_periods cp
     where cp.period_id = p.id and cp.active)                  as meta_total,
  round(100.0 * count(*) filter (where v.status in ('aprobado','entregado'))
        / nullif((select sum(cp.monthly_goal) from client_periods cp
                  where cp.period_id = p.id and cp.active),0), 1) as cumplimiento_global
from periods p
left join videos v on v.period_id = p.id
group by p.id;
alter view v_period_kpis set (security_invoker = on);

-- ===== MÉTRICAS — serie histórica cliente × mes (multi-periodo) =====
create or replace view v_client_month_series as
select
  cs.organization_id, cs.client_id, cs.cliente,
  p.year, p.month, p.label as periodo,
  to_char(make_date(p.year,p.month,1),'YYYY-MM') as month_key,
  cs.meta_mensual, cs.total_videos, cs.finalizados,
  cs.pendientes + cs.en_edicion + cs.en_revision as no_finalizados,
  cs.porcentaje_alcance_meta,
  (select count(*) from calendar_events e
     where e.client_id = cs.client_id and e.period_id = p.id)  as eventos,
  (select count(*) from calendar_events e
     where e.client_id = cs.client_id and e.period_id = p.id
       and e.type = 'reunion')                                 as reuniones,
  (select round(avg(v.delivered_at - v.start_date)::numeric,1) from videos v
     where v.client_id = cs.client_id and v.period_id = p.id)   as dias_promedio_edicion,
  (select coalesce(sum(v.revision_count),0) from videos v
     where v.client_id = cs.client_id and v.period_id = p.id)   as total_revisiones
from v_client_summary cs
join periods p on p.id = cs.period_id;
alter view v_client_month_series set (security_invoker = on);

-- ===== MÉTRICAS — serie histórica editor × mes =====
create or replace view v_editor_month_series as
select ep.organization_id, ep.editor_id, ep.editor,
       p.year, p.month, p.label as periodo,
       to_char(make_date(p.year,p.month,1),'YYYY-MM') as month_key,
       ep.videos_asignados, ep.entregados, ep.cumplimiento_pct,
       ep.dias_promedio_edicion, ep.revisiones_promedio
from v_editor_productivity ep
join periods p on p.id = ep.period_id;
alter view v_editor_month_series set (security_invoker = on);

-- ===== Evento virtual de entrega — todo video con due_date aparece en el calendario =====
create or replace view v_calendar_events_full as
select
  ('delivery-' || v.id::text)         as id,
  v.organization_id,
  v.period_id,
  v.title                             as title,
  'Entrega de ' || v.title            as description,
  'entrega'::event_type               as type,
  v.client_id,
  v.id                                as video_id,
  (v.due_date::timestamptz)           as start_at,
  (v.due_date::timestamptz + interval '1 hour') as end_at,
  true                                 as all_day,
  null::text                          as location,
  null::text                          as meeting_url,
  null::text                          as recurrence_rule,
  '#10B981'                           as color,
  true                                 as is_virtual
from videos v
where v.due_date is not null and v.status not in ('cancelado')
union all
select
  e.id::text, e.organization_id, e.period_id, e.title, e.description, e.type,
  e.client_id, e.video_id, e.start_at, e.end_at, e.all_day, e.location, e.meeting_url,
  e.recurrence_rule, e.color, false as is_virtual
from calendar_events e;
alter view v_calendar_events_full set (security_invoker = on);
