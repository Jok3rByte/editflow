-- EditFlow — 0011: flag de opt-in para el resumen diario por correo

alter table memberships
  add column notify_daily_digest boolean not null default true;
