-- EditFlow — 0012: conexión de Google por MIEMBRO (no por organización)
--
-- Antes había una sola conexión por organización (la del propietario) y los
-- invitados recibían los eventos como asistentes. Ahora cada miembro conecta
-- SU propia cuenta de Google (el correo con el que ingresa a la app), y cada
-- evento se escribe en el calendario propio de cada asistente conectado,
-- usando su propio token — así cada quien recibe calendario y notificaciones
-- en su propio correo.

-- La tabla google_oauth_tokens pasa a ser por membership. Está vacía, así que
-- es seguro reestructurarla sin migrar datos.
alter table google_oauth_tokens
  add column membership_id uuid references memberships(id) on delete cascade;

alter table google_oauth_tokens
  drop constraint google_oauth_tokens_organization_id_key;

alter table google_oauth_tokens
  alter column membership_id set not null;

alter table google_oauth_tokens
  add constraint google_oauth_tokens_membership_id_key unique (membership_id);

-- RLS: cada quien gestiona ÚNICAMENTE su propia conexión (su propia fila).
drop policy if exists google_oauth_tokens_select on google_oauth_tokens;
drop policy if exists google_oauth_tokens_insert on google_oauth_tokens;
drop policy if exists google_oauth_tokens_update on google_oauth_tokens;
drop policy if exists google_oauth_tokens_delete on google_oauth_tokens;

create policy google_oauth_tokens_select on google_oauth_tokens for select
  using (membership_id = current_membership_id(organization_id));
create policy google_oauth_tokens_insert on google_oauth_tokens for insert
  with check (membership_id = current_membership_id(organization_id));
create policy google_oauth_tokens_update on google_oauth_tokens for update
  using (membership_id = current_membership_id(organization_id));
create policy google_oauth_tokens_delete on google_oauth_tokens for delete
  using (membership_id = current_membership_id(organization_id));

-- El evento espejo en Google ahora es por asistente: cada asistente conectado
-- tiene su propia copia en su propio calendario, con su propio id de Google.
alter table event_attendees add column google_event_id text;
alter table event_attendees add column google_html_link text;
