-- EditFlow — 0020: Realtime en notifications (notificaciones en vivo)
--
-- Para que al asignarle un evento a un miembro le llegue una notificación en
-- tiempo real (toast), la tabla notifications debe estar en la publicación de
-- Realtime. RLS ya limita a que cada quien solo reciba las suyas.

do $$
begin
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
  alter table public.notifications replica identity full;
end $$;
