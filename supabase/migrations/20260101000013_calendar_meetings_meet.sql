-- EditFlow — 0013: reuniones con invitados + enlace de Google Meet
--
-- Cuando un evento tiene invitados (correos) y/o se pide un Meet, se crea UN
-- solo evento en el calendario del creador con todos como asistentes y un
-- enlace de Google Meet, y Google manda la invitación a cada correo
-- (sendUpdates=all). A diferencia del espejo por-miembro, acá hay un único
-- evento "organizado" por el creador: el link de Meet se guarda en la
-- columna existente meeting_url, y acá guardamos de qué miembro es el token
-- organizador, para poder editar/borrar ese evento en Google después.

alter table calendar_events
  add column google_organizer_membership_id uuid references memberships(id) on delete set null;
