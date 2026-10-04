import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Política de Privacidad — EditFlow" };

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="mb-10 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Image src="/logo-mark.png" alt="" width={28} height={28} className="size-7 object-contain" />
        EditFlow
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Política de Privacidad</h1>
      <p className="mt-1 text-sm text-muted-foreground">Última actualización: octubre de 2026.</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-semibold text-foreground">1. Qué es EditFlow</h2>
          <p className="mt-2">
            EditFlow es una herramienta de gestión para agencias y productoras de video: organiza
            clientes, videos, calendario y métricas de equipo por periodos mensuales. La operan
            Lian Films Studio y sus desarrolladores.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">2. Qué datos recopilamos</h2>
          <p className="mt-2">Al usar EditFlow guardamos:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Datos de cuenta: nombre, correo, foto de perfil (si inicias sesión con Google).</li>
            <li>
              Datos que tú o tu equipo ingresan: clientes, briefs, videos, estados de edición,
              eventos de calendario, mensajes de invitación.
            </li>
            <li>
              Si conectas tu cuenta de Google: el token de acceso/actualización de OAuth, necesario
              para operar en tu nombre (ver sección 3).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            3. Uso de los datos de Google (Calendar y Gmail)
          </h2>
          <p className="mt-2">
            EditFlow pide permiso explícito de Google para dos cosas, siempre con tu
            consentimiento y siempre en tu propia cuenta de Google (nunca en una ajena):
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Google Calendar</strong> (
              <code className="text-xs">calendar.events</code>): lee los eventos de tu calendario
              que contienen la palabra clave &quot;Flow&quot; en el título o la descripción, y los
              refleja dentro de EditFlow (reuniones, grabaciones, entregas). También crea/actualiza
              eventos en tu calendario cuando programas algo desde EditFlow. No leemos ni
              modificamos ningún otro evento de tu calendario.
            </li>
            <li>
              <strong className="text-foreground">Gmail</strong> (
              <code className="text-xs">gmail.send</code>): nos permite mandar, desde tu propia
              bandeja de salida, los correos que tú generas dentro de la app — invitaciones a tu
              equipo, recordatorios de eventos y resúmenes de actividad. EditFlow nunca lee tu
              bandeja de entrada ni tus correos existentes: este permiso solo sirve para enviar, no
              para leer.
            </li>
          </ul>
          <p className="mt-2">
            El uso que hace EditFlow de los datos recibidos de las APIs de Google cumple con la{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Política de Datos de Usuario de los Servicios de API de Google
            </a>
            , incluidos los requisitos de Uso Limitado.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">4. Dónde se guardan los datos</h2>
          <p className="mt-2">
            Toda la información vive en una base de datos de Supabase (Postgres) dedicada a esta
            aplicación, con acceso restringido por los permisos de cada usuario dentro de su
            organización. Los tokens de Google se guardan cifrados en tránsito y en reposo, y solo
            los usa el servidor de EditFlow para hacer las llamadas descritas en la sección 3.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">5. Con quién compartimos datos</h2>
          <p className="mt-2">
            No vendemos ni compartimos tus datos con terceros para publicidad. Los únicos
            proveedores que procesan datos en nuestro nombre son: Supabase (base de datos y
            autenticación), Vercel (hosting), Resend (envío de correo transaccional) y Google
            (Calendar/Gmail, solo con tu conexión explícita).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">6. Tus controles</h2>
          <p className="mt-2">
            Puedes desconectar tu cuenta de Google en cualquier momento desde
            Configuración → Google Calendar + Gmail → Desconectar. Esto revoca el acceso y borra el
            token guardado. Puedes pedir la eliminación completa de tu cuenta y tus datos
            escribiendo a <a href="mailto:lianproductor@gmail.com" className="text-primary underline-offset-2 hover:underline">lianproductor@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">7. Contacto</h2>
          <p className="mt-2">
            Preguntas sobre esta política: <a href="mailto:lianproductor@gmail.com" className="text-primary underline-offset-2 hover:underline">lianproductor@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
