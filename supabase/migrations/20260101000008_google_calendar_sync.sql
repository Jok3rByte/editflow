-- EditFlow — 0008: sincronización inversa (Google Calendar -> EditFlow)
--
-- Un evento creado directo en Google Calendar (o por Siri, "Hey Siri, agrega
-- un evento y pon Flow...") se importa a EditFlow solo si el título o la
-- descripción contiene la palabra clave "Flow" — así cualquier otro evento
-- personal del propietario no contamina el calendario del equipo.

-- syncToken de la API de Calendar para traer solo lo que cambió desde la
-- última corrida del cron, en vez de recorrer todo el calendario cada vez.
alter table google_oauth_tokens add column calendar_sync_token text;

-- Evita duplicar un evento si el cron corre dos veces sobre el mismo
-- cambio, o si el evento ya existía porque se creó desde la propia app
-- (createCalendarEvent ya guarda su google_event_id). Un unique constraint
-- normal alcanza: Postgres no compara NULLs entre sí, así que los eventos
-- creados solo en la app (sin google_event_id) no chocan entre ellos — y a
-- diferencia de un índice parcial, sirve directo como target de ON
-- CONFLICT en el upsert de supabase-js.
alter table calendar_events add constraint calendar_events_google_event_id_key unique (google_event_id);
