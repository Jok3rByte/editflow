-- EditFlow — 0001: extensiones y tipos enumerados
create extension if not exists "pgcrypto";

create type member_role       as enum ('owner','admin','editor','viewer');
create type video_status      as enum ('pendiente','edicion','en_revision','aprobado','entregado','cancelado');
create type video_priority    as enum ('baja','media','alta','urgente');
create type event_type        as enum ('reunion','grabacion','entrega','clase','evento','otro');
create type client_status     as enum ('activo','pausado','finalizado');
create type invitation_status as enum ('pendiente','aceptada','expirada','revocada');
create type period_status     as enum ('abierto','cerrado');
