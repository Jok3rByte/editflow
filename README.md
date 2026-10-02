# EditFlow

Control de editores de video para agencias y productoras — todo el trabajo operativo
(clientes, monitoreo, calendario, métricas) organizado por **periodos mensuales**: cada
mes arranca en cero y el histórico queda congelado y consultable.

Stack: Next.js 15 (App Router) · TypeScript estricto · Tailwind v4 · shadcn/ui ·
Supabase (Postgres + Auth + Realtime) · TanStack Query/Table · Recharts · FullCalendar ·
Resend + React Email · Vercel Cron.

## 1. Requisitos

- Node.js 20+
- Un proyecto Supabase (gratis en [supabase.com](https://supabase.com)) — no se puede
  probar la app sin uno, porque **todo** dato sale de la base de datos.
- Supabase CLI (`npm i -g supabase` o `npx supabase`) para aplicar las migraciones.

## 2. Configurar el proyecto Supabase

```bash
npx supabase login
npx supabase link --project-ref <tu-project-ref>
npx supabase db push        # aplica supabase/migrations/*.sql
npx supabase db seed        # carga supabase/seed.sql (datos de ejemplo, sección 13)
```

`supabase/seed.sql` reproduce el Google Sheet real de "Productora Lean": 4 miembros,
4 clientes, un periodo OCTUBRE 2025 cerrado con sus videos, y NOVIEMBRE 2025 abierto
y vacío (para comprobar que un mes nuevo arranca en cero). Los usuarios de prueba
(contraseña `editflow-dev`, solo para desarrollo local) son:

| Rol    | Correo                        |
|--------|--------------------------------|
| owner  | lean@correo.com                |
| editor | zax@productoralean.com         |
| editor | lian@productoralean.com        |
| editor | diego@productoralean.com       |

En Supabase Auth habilita **Email (magic link)** y opcionalmente **Google OAuth**.

Regenera los tipos cuando cambien las migraciones:

```bash
npx supabase gen types typescript --project-id <tu-project-ref> > types/database.types.ts
```

## 3. Variables de entorno

```bash
cp .env.example .env.local
```

Completa `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
`SUPABASE_SERVICE_ROLE_KEY` desde el panel de tu proyecto Supabase (Settings → API).
`CRON_SECRET` es cualquier cadena aleatoria que también configurarás en Vercel para
proteger las rutas `/api/cron/*`. `RESEND_API_KEY` sale de [resend.com](https://resend.com).

## 4. Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## 5. Verificación (por fase)

```bash
npm run build
npm run lint
```

Criterio de la Fase 1: con el seed cargado,
`select * from v_client_summary where period_id = '50000000-0000-0000-0000-000000000001'`
(OCTUBRE 2025) debe devolver los 4 clientes con sus videos; la misma vista para
NOVIEMBRE 2025 (`...002`) debe devolver `total_videos = 0` en todas las filas.

## 6. Despliegue en Vercel

1. Importa el repositorio en Vercel (plan Hobby).
2. Configura las mismas variables de entorno de `.env.example`, con los valores reales
   de producción (incluye `NEXT_PUBLIC_APP_URL` con el dominio final).
3. `npm run build` debe pasar sin errores antes de cada deploy.

### Cron jobs (servicio externo, no el cron nativo de Vercel)

En el plan Hobby, Vercel solo permite 2 cron jobs y como máximo 1 ejecución al día cada
uno — no alcanza para los recordatorios cada 5 min. Por eso `vercel.json` no declara
ningún cron: las 5 rutas de `/api/cron/*` se disparan desde un servicio externo gratuito
como [cron-job.org](https://cron-job.org), con método `GET`, el header
`Authorization: Bearer <CRON_SECRET>` (el mismo valor que la variable de entorno), y
esta frecuencia:

| Ruta                               | Frecuencia         |
|-------------------------------------|--------------------|
| `/api/cron/sync-google-calendar`    | cada 10 minutos    |
| `/api/cron/reminders`               | cada 5 minutos     |
| `/api/cron/daily-digest`            | cada hora          |
| `/api/cron/weekly-digest`           | cada hora          |
| `/api/cron/month-close-reminder`    | 1 vez al día       |

Las rutas de resumen diario/semanal/cierre de mes se pueden llamar más seguido que su
cadencia real porque cada una decide internamente si ya es la hora (según la zona
horaria de cada organización) y evita reenviar el mismo día.

Si en algún momento se pasa a Vercel Pro, estos 5 jobs se pueden volver a declarar en
`vercel.json` con el cron nativo, sin cambiar nada del código de las rutas.

## 7. Estructura

Ver la sección 11 del brief original (`app/`, `components/`, `lib/`, `emails/`,
`supabase/migrations/`, `types/`) — la carpeta ya está creada siguiendo ese mapa.
