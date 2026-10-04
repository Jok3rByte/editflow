-- EditFlow — 0024: el rol "viewer" (Estratega en la interfaz) puede crear y
-- editar clientes/briefs, y activarlos en el periodo — todo lo demás
-- (videos, calendario, equipo, periodos) sigue siendo solo lectura para él.
-- No se le da delete: borrar un cliente sigue siendo solo de owner/admin.
-- clients_insert/client_periods_insert ya incluían a 'editor' desde la
-- migración 0016 — se preserva ese permiso, solo se suma 'viewer'.

drop policy if exists clients_insert on clients;
create policy clients_insert on clients for insert
  with check (org_role(organization_id) in ('owner','admin','editor','viewer'));

drop policy if exists clients_update on clients;
create policy clients_update on clients for update
  using (org_role(organization_id) in ('owner','admin','viewer'));

drop policy if exists client_periods_insert on client_periods;
create policy client_periods_insert on client_periods for insert
  with check (org_role(organization_id) in ('owner','admin','editor','viewer'));

drop policy if exists client_periods_update on client_periods;
create policy client_periods_update on client_periods for update
  using (org_role(organization_id) in ('owner','admin','viewer'));
