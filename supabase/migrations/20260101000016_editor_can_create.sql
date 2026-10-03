-- EditFlow — 0016: los editores también pueden crear videos y clientes
--
-- Antes solo owner/admin podían insertar videos y clientes. Ahora el editor
-- también puede crear (seguir sin poder eliminar). Editar clientes y
-- eliminar sigue siendo owner/admin.

drop policy if exists videos_insert on videos;
create policy videos_insert on videos for insert
  with check (org_role(organization_id) in ('owner', 'admin', 'editor'));

drop policy if exists clients_insert on clients;
create policy clients_insert on clients for insert
  with check (org_role(organization_id) in ('owner', 'admin', 'editor'));

-- Crear un cliente nuevo también lo activa en el período (client_periods).
drop policy if exists client_periods_insert on client_periods;
create policy client_periods_insert on client_periods for insert
  with check (org_role(organization_id) in ('owner', 'admin', 'editor'));
