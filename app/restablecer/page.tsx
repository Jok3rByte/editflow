import Link from "next/link";
import Image from "next/image";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata = {
  title: "Restablecer contraseña",
  robots: NOINDEX_ROBOTS,
};

export default function RestablecerPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Image src="/logo-mark.png" alt="" width={28} height={28} className="size-7 object-contain" />
        EditFlow
      </Link>

      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-semibold tracking-tight">Restablecer contraseña</h1>
        <p className="mt-1 mb-8 text-center text-sm text-muted-foreground">
          Crea tu nueva contraseña para volver a entrar.
        </p>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
