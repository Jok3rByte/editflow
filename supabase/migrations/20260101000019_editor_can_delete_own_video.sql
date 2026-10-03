-- EditFlow — 0019: el editor puede eliminar sus propios videos
--
-- Antes solo owner/admin podían eliminar videos. Ahora el editor también,
-- pero únicamente los videos donde él es el encargado (editor_id). owner y
-- admin siguen pudiendo eliminar cualquiera.

drop policy if exists videos_delete on videos;
create policy videos_delete on videos for delete
  using (
    org_role(organization_id) in ('owner', 'admin')
    or (org_role(organization_id) = 'editor' and editor_id = current_membership_id(organization_id))
  );
