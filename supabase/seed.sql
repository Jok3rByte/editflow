-- EditFlow — datos semilla (sección 13 del brief)
-- Se ejecuta con `supabase db reset` (rol superuser: se salta RLS).
-- Reproduce el Google Sheet real de Productora Lean para poder verificar
-- los criterios de aceptación de la Fase 1 sin depender de la UI.

-- ============ USUARIOS (auth.users + identities) ============
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'lean@correo.com', crypt('editflow-dev', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Lean Productor"}', false, false),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'zax@productoralean.com', crypt('editflow-dev', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Zax"}', false, false),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   'lian@productoralean.com', crypt('editflow-dev', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Lian"}', false, false),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated',
   'diego@productoralean.com', crypt('editflow-dev', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Diego"}', false, false);

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id
) values
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '{"sub":"10000000-0000-0000-0000-000000000001","email":"lean@correo.com"}', 'email', now(), now(), now(), gen_random_uuid()),
  ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   '{"sub":"10000000-0000-0000-0000-000000000002","email":"zax@productoralean.com"}', 'email', now(), now(), now(), gen_random_uuid()),
  ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003',
   '{"sub":"10000000-0000-0000-0000-000000000003","email":"lian@productoralean.com"}', 'email', now(), now(), now(), gen_random_uuid()),
  ('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004',
   '{"sub":"10000000-0000-0000-0000-000000000004","email":"diego@productoralean.com"}', 'email', now(), now(), now(), gen_random_uuid());

-- ============ ORGANIZACIÓN ============
insert into organizations (id, name, slug, owner_email, timezone)
values ('20000000-0000-0000-0000-000000000001', 'Productora Lean', 'productora-lean', 'lean@correo.com', 'America/Bogota');

insert into memberships (id, organization_id, user_id, role, full_name, email) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner',  'Lean Productor', 'lean@correo.com'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'editor', 'Zax',            'zax@productoralean.com'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'editor', 'Lian',           'lian@productoralean.com'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'editor', 'Diego',          'diego@productoralean.com');

-- ============ CLIENTES (ficha maestra) ============
insert into clients (id, organization_id, name, default_monthly_goal, default_strategist, status, start_date) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Caicedo',              12, 'Productora', 'activo', '2025-10-01'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Editor Pro',            8, 'Productora', 'activo', '2025-10-01'),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Cantaso Studio',       10, 'Productora', 'activo', '2025-10-01'),
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'Informativo Burrito',  20, 'Productora', 'activo', '2025-10-01');

-- ============ PERIODOS ============
-- Octubre 2025: cerrado, con historial completo.
insert into periods (id, organization_id, year, month, label, status, opened_by, opened_at, closed_at)
values ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 2025, 10, 'OCTUBRE 2025', 'abierto', '10000000-0000-0000-0000-000000000001', '2025-10-01', null);

-- Noviembre 2025: abierto, arranca en cero (mismos clientes, mismas metas, cero videos).
insert into periods (id, organization_id, year, month, label, status, opened_by, opened_at)
values ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 2025, 11, 'NOVIEMBRE 2025', 'abierto', '10000000-0000-0000-0000-000000000001', '2025-11-01');

insert into client_periods (organization_id, period_id, client_id, monthly_goal, strategist, editor_id) values
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 12, 'Productora', null),
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002',  8, 'Productora', null),
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 10, 'Productora', null),
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 20, 'Productora', null),
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 12, 'Productora', null),
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002',  8, 'Productora', null),
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003', 10, 'Productora', null),
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000004', 20, 'Productora', null);

-- ============ VIDEOS — OCTUBRE 2025 ============
-- (Noviembre queda intencionalmente vacío: demuestra que el mes nuevo arranca en cero.)
insert into videos (
  organization_id, period_id, client_id, title, editor_id, start_date, due_date, status, strategist, processed_link
) values
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   'Reel Campus Caicedo', '30000000-0000-0000-0000-000000000002', '2025-10-01', '2025-10-02', 'aprobado', 'Productora', null),
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002',
   'Reel pack editor pro', '30000000-0000-0000-0000-000000000002', '2025-10-02', '2025-10-02', 'aprobado', 'Productora', 'https://f.io/IyZiGO-k'),
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003',
   'Comercial Chivo Loco', '30000000-0000-0000-0000-000000000003', '2025-10-03', '2025-10-08', 'en_revision', 'Productora', null),
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   'Acueducto banco y mar', '30000000-0000-0000-0000-000000000004', '2025-10-03', '2025-10-04', 'edicion', 'Productora', null),
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004',
   'Reel 1', null, '2025-10-01', '2025-10-01', 'pendiente', 'Productora', null),
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004',
   'Reel 2', null, '2025-10-01', '2025-10-01', 'pendiente', 'Productora', null);

-- ============ CALENDARIO — ejemplos ============
insert into calendar_events (id, organization_id, title, description, type, client_id, start_at, end_at, created_by) values
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Reunión mensual Cantaso Studio', 'Revisión de contenido y resultados del mes.', 'reunion',
   '40000000-0000-0000-0000-000000000003', '2025-11-05 15:00:00-05', '2025-11-05 16:00:00-05', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
   'Grabación Caicedo — Campus', 'Jornada de grabación en sede principal.', 'grabacion',
   '40000000-0000-0000-0000-000000000001', '2025-11-10 09:00:00-05', '2025-11-10 13:00:00-05', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
   'Entrega Editor Pro — pack reels', 'Entrega final del paquete de reels acordado.', 'entrega',
   '40000000-0000-0000-0000-000000000002', '2025-11-14 12:00:00-05', '2025-11-14 12:30:00-05', '10000000-0000-0000-0000-000000000001');

insert into event_attendees (event_id, membership_id, email) values
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'lian@productoralean.com'),
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000004', 'diego@productoralean.com'),
  ('60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'zax@productoralean.com');

-- ============ CIERRE DE OCTUBRE (snapshot inmutable) ============
-- Se hace por inserción directa (el seed corre fuera de una sesión autenticada,
-- así que close_period() no puede resolver auth.uid()/org_role()).
insert into period_snapshots (period_id, client_summary, editor_productivity, kpis)
select
  '50000000-0000-0000-0000-000000000001',
  coalesce((select jsonb_agg(to_jsonb(cs)) from v_client_summary cs where cs.period_id = '50000000-0000-0000-0000-000000000001'), '[]'::jsonb),
  coalesce((select jsonb_agg(to_jsonb(ep)) from v_editor_productivity ep where ep.period_id = '50000000-0000-0000-0000-000000000001'), '[]'::jsonb),
  coalesce((select to_jsonb(k) from v_period_kpis k where k.period_id = '50000000-0000-0000-0000-000000000001'), '{}'::jsonb);

update periods set status = 'cerrado', closed_at = '2025-11-01 08:00:00-05'
where id = '50000000-0000-0000-0000-000000000001';
