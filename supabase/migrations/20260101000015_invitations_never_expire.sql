-- EditFlow — 0015: las invitaciones nunca caducan y el link es reutilizable
--
-- Antes la invitación expiraba a los 7 días y, al aceptarla, el link quedaba
-- inservible (status 'aceptada'). Ahora el link nunca caduca y la persona
-- puede entrar con él las veces que necesite.

-- 'infinity' = nunca expira. Así los chequeos existentes (expires_at < now(),
-- expires_at > now()) siguen funcionando sin tocarlos: infinity nunca es
-- menor que ahora, y siempre es mayor.
alter table invitations alter column expires_at set default 'infinity';
update invitations set expires_at = 'infinity' where status in ('pendiente', 'aceptada');

-- accept_invitation reutilizable: solo bloquea si fue revocada; aceptar de
-- nuevo re-activa la membresía (idempotente). Se agrega una validación de
-- seguridad: el correo con el que se ingresó debe ser el de la invitación
-- (importante ahora que el link vive para siempre y podría compartirse).
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
  values (inv.organization_id, auth.uid(), inv.role, p_full_name, inv.email)
  on conflict (organization_id, user_id) do update set active = true, role = excluded.role;

  update invitations set status = 'aceptada' where id = inv.id;

  return inv.organization_id;
end $$ language plpgsql security definer;
