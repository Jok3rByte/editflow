"use client";

import Link from "next/link";
import { openCookieBanner } from "@/components/shared/cookie-banner";

const LEGAL_ITEMS = [
  { href: "/privacidad", label: "Política de Privacidad" },
  { href: "/privacidad#tratamiento-datos", label: "Tratamiento de Datos Personales" },
  { href: "/privacidad#cookies", label: "Cookies" },
  { href: "/terminos", label: "Condiciones del Servicio" },
] as const;

export function LegalLinks() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:text-sm">
      {LEGAL_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="transition-colors hover:text-foreground hover:underline underline-offset-4"
        >
          {item.label}
        </Link>
      ))}
      <button
        type="button"
        onClick={openCookieBanner}
        className="cursor-pointer transition-colors hover:text-foreground hover:underline underline-offset-4"
      >
        Configurar cookies
      </button>
    </div>
  );
}
