-- EditFlow — 0021: perfil de usuario (bio, teléfono) + storage de fotos
--
-- Cada usuario puede editar su propio perfil: nombre con el que aparece en la
-- app, foto, biografía y teléfono. El nombre y la foto se guardan en
-- memberships (full_name, avatar_url ya existían); se agregan bio y phone. La
-- foto se sube a un bucket público 'avatars' en Storage, en una carpeta por
-- usuario.

alter table memberships add column if not exists bio text;
alter table memberships add column if not exists phone text;

-- Bucket público para las fotos de perfil.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Cualquiera puede VER las fotos (bucket público); cada usuario solo puede
-- subir/reemplazar en su propia carpeta (prefijo = su user id).
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
