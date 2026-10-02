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
