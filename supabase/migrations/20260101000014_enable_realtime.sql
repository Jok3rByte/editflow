-- EditFlow — 0014: habilitar Realtime en las tablas de la organización
--
-- Para que un cambio de cualquier miembro (agregar/editar/eliminar) se
-- refleje en vivo en la pantalla de los demás, estas tablas se agregan a la
-- publicación supabase_realtime. replica identity full hace que los eventos
-- de UPDATE/DELETE incluyan organization_id, necesario para el filtro por
-- organización de la suscripción. RLS sigue aplicando: cada quien solo
-- recibe los cambios que su rol puede ver.

do $$
declare t text;
begin
  foreach t in array array[
    'videos',
    'calendar_events',
    'clients',
    'client_periods',
    'memberships',
    'invitations',
    'periods'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
    execute format('alter table public.%I replica identity full', t);
  end loop;
end $$;
