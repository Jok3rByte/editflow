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
