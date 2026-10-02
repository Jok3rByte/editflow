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
