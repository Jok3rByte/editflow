-- EditFlow — 0005: cerrar / reabrir periodo (snapshot inmutable)
-- Definidas después de las vistas porque las referencian directamente.

create or replace function close_period(p_period_id uuid) returns void as $$
declare v_org uuid;
begin
  select organization_id into v_org from periods where id = p_period_id;
  if coalesce(org_role(v_org)::text, '') not in ('owner','admin') then
    raise exception 'Solo el propietario o un administrador puede cerrar el mes.';
  end if;

  insert into period_snapshots (period_id, client_summary, editor_productivity, kpis)
  select
    p_period_id,
    coalesce((select jsonb_agg(to_jsonb(cs)) from v_client_summary cs where cs.period_id = p_period_id), '[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(ep)) from v_editor_productivity ep where ep.period_id = p_period_id), '[]'::jsonb),
    coalesce((select to_jsonb(k) from v_period_kpis k where k.period_id = p_period_id), '{}'::jsonb)
  on conflict (period_id) do update
    set client_summary = excluded.client_summary,
        editor_productivity = excluded.editor_productivity,
        kpis = excluded.kpis,
        generated_at = now();

  update periods set status = 'cerrado', closed_at = now() where id = p_period_id;
end $$ language plpgsql security definer;

create or replace function reopen_period(p_period_id uuid) returns void as $$
declare v_org uuid;
begin
  select organization_id into v_org from periods where id = p_period_id;
  if coalesce(org_role(v_org)::text, '') not in ('owner','admin') then
    raise exception 'Solo el propietario o un administrador puede reabrir el mes.';
  end if;

  delete from period_snapshots where period_id = p_period_id;
  update periods set status = 'abierto', closed_at = null where id = p_period_id;
end $$ language plpgsql security definer;

create or replace function delete_empty_period(p_period_id uuid) returns void as $$
declare v_org uuid; v_count int;
begin
  select organization_id into v_org from periods where id = p_period_id;
  if coalesce(org_role(v_org)::text, '') not in ('owner','admin') then
    raise exception 'Solo el propietario o un administrador puede eliminar un mes.';
  end if;

  select count(*) into v_count from videos where period_id = p_period_id;
  if v_count > 0 then
    raise exception 'No puedes eliminar un mes que ya tiene videos registrados.';
  end if;

  delete from client_periods where period_id = p_period_id;
  delete from periods where id = p_period_id;
end $$ language plpgsql security definer;
