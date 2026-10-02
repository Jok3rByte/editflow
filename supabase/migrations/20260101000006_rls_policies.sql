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
