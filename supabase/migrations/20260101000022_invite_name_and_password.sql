-- EditFlow — 0022: el nombre del invitado lo asigna el owner/admin
--
-- La invitación lleva el nombre con el que la persona aparecerá en la app
-- (lo pone quien invita). El invitado ya no escribe su nombre al entrar, y en
-- su perfil no puede cambiarlo. accept_invitation usa ese nombre.

alter table invitations add column if not exists full_name text;

create or replace function accept_invitation(p_token text, p_full_name text) returns uuid as $$
declare inv invitations%rowtype;
begin
  select * into inv from invitations where token = p_token for update;

  if inv.id is null then
    raise exception 'Invitación no encontrada.';
  end if;
  if inv.status = 'revocada' then
    raise exception 'Esta invitación fue revocada.';
  end if;
  if lower(inv.email) <> lower((select email from auth.users where id = auth.uid())) then
    raise exception 'Esta invitación es para otro correo.';
  end if;

  insert into memberships (organization_id, user_id, role, full_name, email)
  values (
    inv.organization_id, auth.uid(), inv.role,
    coalesce(nullif(inv.full_name, ''), nullif(p_full_name, ''), inv.email),
    inv.email
  )
  on conflict (organization_id, user_id) do update set active = true, role = excluded.role;

  update invitations set status = 'aceptada' where id = inv.id;

  return inv.organization_id;
end $$ language plpgsql security definer;
