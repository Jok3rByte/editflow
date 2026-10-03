import Link from "next/link";
import Image from "next/image";
import { AccountForm } from "@/components/auth/account-form";

export default async function CrearEspacioPage({
  searchParams,
}: PageProps<"/crear-espacio">) {
  const params = await searchParams;
  const modo = params.modo === "acceso" ? "acceso" : "iniciar";
  const next = typeof params.next === "string" ? params.next : "/crear-espacio/espacio";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Image src="/logo-mark.png" alt="" width={28} height={28} className="size-7 object-contain" />
        EditFlow
      </Link>

      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-semibold tracking-tight">
          {modo === "acceso" ? "Ingresa a tu espacio" : "Crea tu espacio"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {modo === "acceso"
            ? "Usa el mismo correo con el que te registraste."
            : "Empieza con tu nombre y tu correo. El resto toma un minuto."}
        </p>

        <div className="mt-8">
          <AccountForm next={next} modo={modo} />
        </div>

        {params.error === "auth" && (
          <div className="mt-4 text-center text-sm text-danger">
            <p>El enlace no es válido o ya expiró. Solicita uno nuevo.</p>
            {typeof params.error_detail === "string" && (
              <p className="mt-1 text-xs text-muted-foreground">{params.error_detail}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
