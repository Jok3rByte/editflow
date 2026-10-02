-- ============================================================
-- 20260101000001_extensions_and_enums.sql
-- ============================================================
-- EditFlow — 0001: extensiones y tipos enumerados
create extension if not exists "pgcrypto";

create type member_role       as enum ('owner','admin','editor','viewer');
create type video_status      as enum ('pendiente','edicion','en_revision','aprobado','entregado','cancelado');
create type video_priority    as enum ('baja','media','alta','urgente');
create type event_type        as enum ('reunion','grabacion','entrega','clase','evento','otro');
create type client_status     as enum ('activo','pausado','finalizado');
create type invitation_status as enum ('pendiente','aceptada','expirada','revocada');
create type period_status     as enum ('abierto','cerrado');


-- ============================================================
-- 20260101000002_tables.sql
-- ============================================================
-- EditFlow — 0002: tablas base

-- ============ ORGANIZACIONES ============
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  owner_email text not null,
  logo_url text,
  timezone text not null default 'America/Bogota',
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'editor',
  full_name text,
  email text not null,
  avatar_url text,
  active boolean not null default true,
  notify_calendar boolean not null default true,
  notify_assignments boolean not null default true,
  notify_weekly_digest boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role member_role not null default 'editor',
  token text unique not null default encode(gen_random_bytes(24),'hex'),
  status invitation_status not null default 'pendiente',
  invited_by uuid references auth.users(id),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

-- ============ PERIODOS (MESES) ============
create table periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  year  integer not null check (year between 2020 and 2100),
  month integer not null check (month between 1 and 12),
  label text not null,
  status period_status not null default 'abierto',
  opened_by uuid references auth.users(id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  notes text,
  unique (organization_id, year, month)
);
create index on periods (organization_id, year desc, month desc);

create table period_snapshots (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references periods(id) on delete cascade,
  client_summary jsonb not null,
  editor_productivity jsonb not null,
  kpis jsonb not null,
  generated_at timestamptz not null default now(),
  unique (period_id)
);

-- ============ CLIENTES (ficha maestra) ============
create table clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  brand_name text,
  industry text,
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  social_links jsonb default '{}'::jsonb,
  brand_description text,
  target_audience text,
  tone_of_voice text,
  objectives text,
  content_pillars text[],
  reference_links text[],
  brand_colors text[],
  fonts text,
  do_not_do text,
  delivery_formats text[],
  default_monthly_goal integer not null default 0,
  default_strategist text default 'Productora',
  default_editor_id uuid references memberships(id) on delete set null,
  start_date date,
  status client_status not null default 'activo',
  assets_drive_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table client_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  period_id uuid not null references periods(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  monthly_goal integer not null default 0,
  strategist text default 'Productora',
  editor_id uuid references memberships(id) on delete set null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique (period_id, client_id)
);
create index on client_periods (organization_id, period_id);

-- ============ VIDEOS ============
create table videos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  period_id uuid not null references periods(id) on delete cascade,
  seq integer not null,
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  editor_id uuid references memberships(id) on delete set null,
  editor_name_raw text,
  start_date date,
  due_date date,
  delivered_at date,
  status video_status not null default 'pendiente',
  priority video_priority not null default 'media',
  strategist text default 'Productora',
  observations text,
  processed_link text,
  revision_count integer not null default 0,
  format text,
  duration_seconds integer,
  carried_from_video_id uuid references videos(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_id, client_id, seq)
);
create index on videos (organization_id, period_id);
create index on videos (period_id, client_id);
create index on videos (period_id, editor_id);
create index on videos (organization_id, status);

create table video_status_history (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  from_status video_status,
  to_status video_status not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

-- ============ CALENDARIO ============
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  period_id uuid references periods(id) on delete set null,
  title text not null,
  description text,
  type event_type not null default 'reunion',
  client_id uuid references clients(id) on delete set null,
  video_id uuid references videos(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  location text,
  meeting_url text,
  recurrence_rule text,
  color text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on calendar_events (organization_id, start_at);

create table event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references calendar_events(id) on delete cascade,
  membership_id uuid references memberships(id) on delete cascade,
  email text not null,
  notify boolean not null default true,
  response text default 'pendiente',
  unique (event_id, email)
);

create table event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references calendar_events(id) on delete cascade,
  minutes_before integer not null default 60,
  sent_at timestamptz
);

-- ============ NOTIFICACIONES ============
create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  recipient_email text not null,
  membership_id uuid references memberships(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (organization_id, membership_id, read_at);


-- ============================================================
-- 20260101000003_functions_and_triggers.sql
-- ============================================================
-- EditFlow — 0003: funciones y triggers

-- ============ updated_at automático ============
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

create trigger trg_clients_updated_at before update on clients
for each row execute function set_updated_at();

create trigger trg_videos_updated_at before update on videos
for each row execute function set_updated_at();

create trigger trg_events_updated_at before update on calendar_events
for each row execute function set_updated_at();

-- ============ seq correlativo POR CLIENTE Y POR PERIODO ============
create or replace function set_video_seq() returns trigger as $$
begin
  if new.seq is null or new.seq = 0 then
    select coalesce(max(seq),0)+1 into new.seq
    from videos where period_id = new.period_id and client_id = new.client_id;
  end if;
  return new;
end $$ language plpgsql;
create trigger trg_video_seq before insert on videos
for each row execute function set_video_seq();

-- ============ Bloquear escritura en periodos cerrados ============
create or replace function block_closed_period() returns trigger as $$
declare st period_status;
begin
  select status into st from periods where id = coalesce(new.period_id, old.period_id);
  if st = 'cerrado' then
    raise exception 'El mes está cerrado. Reábrelo para poder editarlo.';
  end if;
  return coalesce(new, old);
end $$ language plpgsql;
create trigger trg_videos_closed before insert or update or delete on videos
for each row execute function block_closed_period();

-- ============ Historial de estado + delivered_at + conteo de revisiones ============
create or replace function log_video_status() returns trigger as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into video_status_history (video_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
    if new.status in ('aprobado','entregado') and new.delivered_at is null then
      new.delivered_at = current_date;
    end if;
    if new.status = 'en_revision' then
      new.revision_count = old.revision_count + 1;
    end if;
  end if;
  return new;
end $$ language plpgsql security definer;
create trigger trg_video_status before update on videos
for each row execute function log_video_status();

-- ============ Asignar automáticamente el period_id de un evento según su fecha ============
create or replace function set_event_period() returns trigger as $$
begin
  select id into new.period_id from periods
  where organization_id = new.organization_id
    and year = extract(year from new.start_at)::int
    and month = extract(month from new.start_at)::int;
  return new;
end $$ language plpgsql;
create trigger trg_event_period before insert or update on calendar_events
for each row execute function set_event_period();

-- ============ Helpers de autorización (usados por RLS) ============
create or replace function is_org_member(org uuid) returns boolean as $$
  select exists (select 1 from memberships
    where organization_id = org and user_id = auth.uid() and active);
$$ language sql security definer stable;

create or replace function org_role(org uuid) returns member_role as $$
  select role from memberships
  where organization_id = org and user_id = auth.uid() and active limit 1;
$$ language sql security definer stable;

create or replace function current_membership_id(org uuid) returns uuid as $$
  select id from memberships
  where organization_id = org and user_id = auth.uid() and active limit 1;
$$ language sql security definer stable;

create or replace function event_org_id(p_event_id uuid) returns uuid as $$
  select organization_id from calendar_events where id = p_event_id;
$$ language sql security definer stable;

-- ============ Restringir columnas editables por rol 'editor' en videos ============
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
       or new.start_date is distinct from old.start_date
       or new.due_date is distinct from old.due_date
       or new.strategist is distinct from old.strategist
       or new.priority is distinct from old.priority
       or new.seq is distinct from old.seq
       or new.period_id is distinct from old.period_id then
      raise exception 'Como editor solo puedes modificar estado, observaciones y el link procesado.';
    end if;
  end if;
  return new;
end $$ language plpgsql;
create trigger trg_editor_video_columns before update on videos
for each row execute function enforce_editor_video_columns();

-- ============ Abrir un mes nuevo copiando clientes seleccionados (contadores en cero) ============
create or replace function open_period(
  p_org uuid, p_year int, p_month int,
  p_client_ids uuid[] default '{}',
  p_goals int[] default '{}'
) returns uuid as $$
declare new_period uuid; i int;
begin
  if coalesce(org_role(p_org)::text, '') not in ('owner','admin') then
    raise exception 'Solo el propietario o un administrador puede abrir un mes.';
  end if;

  insert into periods (organization_id, year, month, label, opened_by)
  values (
    p_org, p_year, p_month,
    upper(to_char(make_date(p_year,p_month,1),'TMMonth YYYY')),
    auth.uid()
  )
  returning id into new_period;

  for i in 1 .. coalesce(array_length(p_client_ids,1),0) loop
    insert into client_periods (organization_id, period_id, client_id, monthly_goal, strategist, editor_id)
    select p_org, new_period, c.id,
           coalesce(p_goals[i], c.default_monthly_goal),
           c.default_strategist, c.default_editor_id
    from clients c where c.id = p_client_ids[i];
  end loop;

  return new_period;
end $$ language plpgsql security definer;

-- ============ Crear organización + membresía owner + abrir periodo del mes actual ============
create or replace function create_organization_with_owner(
  p_name text, p_slug text, p_owner_email text, p_timezone text, p_full_name text
) returns uuid as $$
declare new_org uuid; today date;
begin
  insert into organizations (name, slug, owner_email, timezone)
  values (p_name, p_slug, p_owner_email, coalesce(p_timezone, 'America/Bogota'))
  returning id into new_org;

  insert into memberships (organization_id, user_id, role, full_name, email)
  values (new_org, auth.uid(), 'owner', p_full_name, p_owner_email);

  today := (now() at time zone coalesce(p_timezone, 'America/Bogota'))::date;
  perform open_period(new_org, extract(year from today)::int, extract(month from today)::int, '{}', '{}');

  return new_org;
end $$ language plpgsql security definer;

-- ============ Arrastrar videos pendientes de un periodo a otro ============
create or replace function carry_over_video(p_video_id uuid, p_target_period_id uuid) returns uuid as $$
declare v videos%rowtype; new_id uuid; target_label text;
begin
  select * into v from videos where id = p_video_id;
  if coalesce(org_role(v.organization_id)::text, '') not in ('owner','admin') then
    raise exception 'Solo el propietario o un administrador puede arrastrar videos.';
  end if;

  select label into target_label from periods where id = p_target_period_id;

  insert into videos (
    organization_id, period_id, client_id, title, editor_id, editor_name_raw,
    start_date, due_date, status, priority, strategist, observations,
    format, duration_seconds, carried_from_video_id, created_by
  ) values (
    v.organization_id, p_target_period_id, v.client_id, v.title, v.editor_id, v.editor_name_raw,
    current_date, v.due_date, 'pendiente', v.priority, v.strategist, v.observations,
    v.format, v.duration_seconds, v.id, auth.uid()
  ) returning id into new_id;

  update videos
  set status = 'cancelado',
      observations = coalesce(observations || E'\n', '') || 'Trasladado a ' || coalesce(target_label, 'el nuevo mes') || '.'
  where id = p_video_id;

  return new_id;
end $$ language plpgsql security definer;

-- Nota: close_period / reopen_period se definen en 0005, después de las vistas
-- (referencian v_client_summary / v_editor_productivity / v_period_kpis).

-- ============ Invitaciones ============
create or replace function get_invitation(p_token text)
returns table (organization_name text, email text, role member_role, status invitation_status, expires_at timestamptz) as $$
  select o.name, i.email, i.role, i.status, i.expires_at
  from invitations i join organizations o on o.id = i.organization_id
  where i.token = p_token;
$$ language sql security definer stable;

-- Invitaciones pendientes para el correo de la sesión actual (post-login, sin token en la URL).
-- Permite que alguien entre solo con su correo desde el Home y aterrice directo en el
-- espacio al que fue invitado, en vez de pasar por "crear mi propio espacio".
create or replace function get_my_pending_invitations()
returns table (token text, organization_name text, role member_role, expires_at timestamptz) as $$
  select i.token, o.name, i.role, i.expires_at
  from invitations i
  join organizations o on o.id = i.organization_id
  where i.status = 'pendiente'
    and i.expires_at > now()
    and lower(i.email) = lower((select email from auth.users where id = auth.uid()))
  order by i.created_at desc;
$$ language sql security definer stable;

create or replace function accept_invitation(p_token text, p_full_name text) returns uuid as $$
declare inv invitations%rowtype;
begin
  select * into inv from invitations where token = p_token for update;

  if inv.id is null then
    raise exception 'Invitación no encontrada.';
  end if;
  if inv.status <> 'pendiente' then
    raise exception 'Esta invitación ya no está disponible.';
  end if;
  if inv.expires_at < now() then
    update invitations set status = 'expirada' where id = inv.id;
    raise exception 'Esta invitación expiró.';
  end if;

  insert into memberships (organization_id, user_id, role, full_name, email)
  values (inv.organization_id, auth.uid(), inv.role, p_full_name, inv.email)
  on conflict (organization_id, user_id) do update set active = true, role = excluded.role;

  update invitations set status = 'aceptada' where id = inv.id;

  return inv.organization_id;
end $$ language plpgsql security definer;


-- ============================================================
-- 20260101000004_views.sql
-- ============================================================
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


-- ============================================================
-- 20260101000005_period_close.sql
-- ============================================================
-- EditFlow — 0005: cerrar / reabrir periodo (snapshot inmutable)
-- Definidas después de las vistas porque las referencian directamente.

create or replace function close_period(p_period_id uuid) returns void as $$
declare v_org uuid;
begin
  select organization_id into v_org from periods where id = p_period_id;
  if coalesce(org_role(v_org)::text, '') not in ('owner','admin') then
    raise exception 'Solo el propietario o un administrador puede cerrar el mes.';
  end if;

  insert into period_snapshots (period_id, client_summary, editor_productivity, kpis)
  select
    p_period_id,
    coalesce((select jsonb_agg(to_jsonb(cs)) from v_client_summary cs where cs.period_id = p_period_id), '[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(ep)) from v_editor_productivity ep where ep.period_id = p_period_id), '[]'::jsonb),
    coalesce((select to_jsonb(k) from v_period_kpis k where k.period_id = p_period_id), '{}'::jsonb)
  on conflict (period_id) do update
    set client_summary = excluded.client_summary,
        editor_productivity = excluded.editor_productivity,
        kpis = excluded.kpis,
        generated_at = now();

  update periods set status = 'cerrado', closed_at = now() where id = p_period_id;
end $$ language plpgsql security definer;

create or replace function reopen_period(p_period_id uuid) returns void as $$
declare v_org uuid;
begin
  select organization_id into v_org from periods where id = p_period_id;
  if coalesce(org_role(v_org)::text, '') not in ('owner','admin') then
    raise exception 'Solo el propietario o un administrador puede reabrir el mes.';
  end if;

  delete from period_snapshots where period_id = p_period_id;
  update periods set status = 'abierto', closed_at = null where id = p_period_id;
end $$ language plpgsql security definer;

create or replace function delete_empty_period(p_period_id uuid) returns void as $$
declare v_org uuid; v_count int;
begin
  select organization_id into v_org from periods where id = p_period_id;
  if coalesce(org_role(v_org)::text, '') not in ('owner','admin') then
    raise exception 'Solo el propietario o un administrador puede eliminar un mes.';
  end if;

  select count(*) into v_count from videos where period_id = p_period_id;
  if v_count > 0 then
    raise exception 'No puedes eliminar un mes que ya tiene videos registrados.';
  end if;

  delete from client_periods where period_id = p_period_id;
  delete from periods where id = p_period_id;
end $$ language plpgsql security definer;


-- ============================================================
-- 20260101000006_rls_policies.sql
-- ============================================================
-- EditFlow — 0006: Row Level Security en todas las tablas

create or replace function period_org_id(p_period_id uuid) returns uuid as $$
  select organization_id from periods where id = p_period_id;
$$ language sql security definer stable;

alter table organizations       enable row level security;
alter table memberships         enable row level security;
alter table invitations         enable row level security;
alter table periods             enable row level security;
alter table period_snapshots    enable row level security;
alter table clients             enable row level security;
alter table client_periods      enable row level security;
alter table videos              enable row level security;
alter table video_status_history enable row level security;
alter table calendar_events     enable row level security;
alter table event_attendees     enable row level security;
alter table event_reminders     enable row level security;
alter table notifications       enable row level security;

-- ============ organizations ============
-- La creación pasa por create_organization_with_owner() (security definer);
-- no se expone INSERT directo a los clientes.
create policy org_select on organizations for select
  using (is_org_member(id));
create policy org_update on organizations for update
  using (org_role(id) in ('owner','admin'));
create policy org_delete on organizations for delete
  using (org_role(id) = 'owner');

-- ============ memberships ============
create policy memberships_select on memberships for select
  using (is_org_member(organization_id));
create policy memberships_insert on memberships for insert
  with check (org_role(organization_id) in ('owner','admin'));
create policy memberships_update on memberships for update
  using (org_role(organization_id) in ('owner','admin'));
create policy memberships_delete on memberships for delete
  using (org_role(organization_id) in ('owner','admin'));

-- ============ invitations ============
-- La aceptación pasa por accept_invitation()/get_invitation() (security definer).
create policy invitations_select on invitations for select
  using (is_org_member(organization_id));
create policy invitations_insert on invitations for insert
  with check (org_role(organization_id) in ('owner','admin'));
create policy invitations_update on invitations for update
  using (org_role(organization_id) in ('owner','admin'));
create policy invitations_delete on invitations for delete
  using (org_role(organization_id) in ('owner','admin'));

-- ============ periods ============
create policy periods_select on periods for select
  using (is_org_member(organization_id));
create policy periods_insert on periods for insert
  with check (org_role(organization_id) in ('owner','admin'));
create policy periods_update on periods for update
  using (org_role(organization_id) in ('owner','admin'));
create policy periods_delete on periods for delete
  using (org_role(organization_id) in ('owner','admin'));

-- ============ period_snapshots ============
-- Se escriben únicamente vía close_period() (security definer).
create policy period_snapshots_select on period_snapshots for select
  using (is_org_member(period_org_id(period_id)));

-- ============ clients ============
create policy clients_select on clients for select
  using (is_org_member(organization_id));
create policy clients_insert on clients for insert
  with check (org_role(organization_id) in ('owner','admin'));
create policy clients_update on clients for update
  using (org_role(organization_id) in ('owner','admin'));
create policy clients_delete on clients for delete
  using (org_role(organization_id) in ('owner','admin'));

-- ============ client_periods ============
create policy client_periods_select on client_periods for select
  using (is_org_member(organization_id));
create policy client_periods_insert on client_periods for insert
  with check (org_role(organization_id) in ('owner','admin'));
create policy client_periods_update on client_periods for update
  using (org_role(organization_id) in ('owner','admin'));
create policy client_periods_delete on client_periods for delete
  using (org_role(organization_id) in ('owner','admin'));

-- ============ videos ============
-- owner/admin/viewer ven todos los videos de su organización.
create policy videos_select_all on videos for select
  using (is_org_member(organization_id) and org_role(organization_id) in ('owner','admin','viewer'));
-- editor solo ve los videos donde es el encargado.
create policy videos_select_own on videos for select
  using (org_role(organization_id) = 'editor' and editor_id = current_membership_id(organization_id));

create policy videos_insert on videos for insert
  with check (org_role(organization_id) in ('owner','admin'));
create policy videos_delete on videos for delete
  using (org_role(organization_id) in ('owner','admin'));

-- owner/admin editan cualquier fila; editor solo las suyas
-- (la restricción de columnas la aplica el trigger enforce_editor_video_columns).
create policy videos_update on videos for update
  using (
    org_role(organization_id) in ('owner','admin')
    or (org_role(organization_id) = 'editor' and editor_id = current_membership_id(organization_id))
  );

-- ============ video_status_history ============
create policy video_status_history_select on video_status_history for select
  using (is_org_member((select organization_id from videos where videos.id = video_status_history.video_id)));

-- ============ calendar_events ============
create policy events_select_all on calendar_events for select
  using (is_org_member(organization_id) and org_role(organization_id) in ('owner','admin','viewer'));
create policy events_select_attendee on calendar_events for select
  using (
    org_role(organization_id) = 'editor'
    and exists (
      select 1 from event_attendees ea
      where ea.event_id = calendar_events.id
        and (ea.membership_id = current_membership_id(organization_id))
    )
  );
create policy events_insert on calendar_events for insert
  with check (org_role(organization_id) in ('owner','admin'));
create policy events_update on calendar_events for update
  using (org_role(organization_id) in ('owner','admin'));
create policy events_delete on calendar_events for delete
  using (org_role(organization_id) in ('owner','admin'));

-- ============ event_attendees ============
create policy attendees_select on event_attendees for select
  using (is_org_member(event_org_id(event_id)));
create policy attendees_insert on event_attendees for insert
  with check (org_role(event_org_id(event_id)) in ('owner','admin'));
create policy attendees_update on event_attendees for update
  using (
    org_role(event_org_id(event_id)) in ('owner','admin')
    or membership_id = current_membership_id(event_org_id(event_id))
  );
create policy attendees_delete on event_attendees for delete
  using (org_role(event_org_id(event_id)) in ('owner','admin'));

-- ============ event_reminders ============
create policy reminders_select on event_reminders for select
  using (is_org_member(event_org_id(event_id)));
create policy reminders_insert on event_reminders for insert
  with check (org_role(event_org_id(event_id)) in ('owner','admin'));
create policy reminders_update on event_reminders for update
  using (org_role(event_org_id(event_id)) in ('owner','admin'));
create policy reminders_delete on event_reminders for delete
  using (org_role(event_org_id(event_id)) in ('owner','admin'));

-- ============ notifications ============
-- Se insertan desde el servidor (service role) al disparar correos; aquí solo lectura propia.
create policy notifications_select on notifications for select
  using (is_org_member(organization_id) and membership_id = current_membership_id(organization_id));
create policy notifications_update on notifications for update
  using (membership_id = current_membership_id(organization_id));


-- ============================================================
-- 20260101000007_google_calendar.sql
-- ============================================================
-- EditFlow — 0007: conexión de Google Calendar por organización
--
-- Solo el propietario (o un administrador en su nombre) conecta UNA cuenta
-- de Google por organización — esa es la cuenta "remitente": la que crea
-- los eventos en Google Calendar y de la que salen las notificaciones. No
-- hace falta que cada miembro conecte la suya: a los invitados les llega el
-- evento como asistentes (Google Calendar les envía la invitación a
-- cualquier correo, tengan o no cuenta de Google conectada aquí).

create table google_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  google_email text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  scope text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table google_oauth_tokens enable row level security;

-- Solo owner/admin pueden ver o gestionar la conexión de su propia
-- organización. El access_token/refresh_token nunca se leen desde el
-- cliente: los server actions que llaman a la API de Google usan el
-- service role client (bypassa RLS), estas policies son para la UI de
-- "Conectar/Desconectar" en Configuración.
create policy google_oauth_tokens_select on google_oauth_tokens for select
  using (org_role(organization_id) in ('owner', 'admin'));
create policy google_oauth_tokens_insert on google_oauth_tokens for insert
  with check (org_role(organization_id) in ('owner', 'admin'));
create policy google_oauth_tokens_update on google_oauth_tokens for update
  using (org_role(organization_id) in ('owner', 'admin'));
create policy google_oauth_tokens_delete on google_oauth_tokens for delete
  using (org_role(organization_id) in ('owner', 'admin'));

create trigger trg_google_oauth_tokens_updated_at
  before update on google_oauth_tokens
  for each row execute function set_updated_at();

-- Referencia al evento espejo creado en Google Calendar, para poder
-- enlazarlo desde la UI y evitar crearlo dos veces si el evento se edita.
alter table calendar_events add column google_event_id text;
alter table calendar_events add column google_html_link text;


-- ============================================================
-- 20260101000008_google_calendar_sync.sql
-- ============================================================
-- EditFlow — 0008: sincronización inversa (Google Calendar -> EditFlow)
--
-- Un evento creado directo en Google Calendar (o por Siri, "Hey Siri, agrega
-- un evento y pon Flow...") se importa a EditFlow solo si el título o la
-- descripción contiene la palabra clave "Flow" — así cualquier otro evento
-- personal del propietario no contamina el calendario del equipo.

-- syncToken de la API de Calendar para traer solo lo que cambió desde la
-- última corrida del cron, en vez de recorrer todo el calendario cada vez.
alter table google_oauth_tokens add column calendar_sync_token text;

-- Evita duplicar un evento si el cron corre dos veces sobre el mismo
-- cambio, o si el evento ya existía porque se creó desde la propia app
-- (createCalendarEvent ya guarda su google_event_id). Un unique constraint
-- normal alcanza: Postgres no compara NULLs entre sí, así que los eventos
-- creados solo en la app (sin google_event_id) no chocan entre ellos — y a
-- diferencia de un índice parcial, sirve directo como target de ON
-- CONFLICT en el upsert de supabase-js.
alter table calendar_events add constraint calendar_events_google_event_id_key unique (google_event_id);


-- ============================================================
-- 20260101000009_auto_carry_over_pending_videos.sql
-- ============================================================
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



-- ============================================================
-- 20260101000010_video_progress.sql
-- ============================================================
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
