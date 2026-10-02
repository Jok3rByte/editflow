import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyOrganizations } from "@/lib/actions/organizations";
import { getMyPendingInvitations } from "@/lib/actions/invitations";
import { WorkspaceForm } from "@/components/auth/workspace-form";
import { AutoAcceptInvitation } from "@/components/auth/auto-accept-invitation";
import { AcceptInvitationButton } from "@/components/auth/accept-invitation-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  editor: "Editor",
  viewer: "Solo lectura",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        EditFlow
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

export default async function CrearEspacioPasoDosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/crear-espacio");
  }

  const organizations = await getMyOrganizations();

  if (organizations.length > 0) {
    return (
      <Shell>
        <h1 className="text-center text-2xl font-semibold tracking-tight">Elige tu espacio</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Ya perteneces a {organizations.length === 1 ? "un espacio" : "estos espacios"}.
        </p>
        <div className="mt-6 space-y-2">
          {organizations.map((org) => (
            <Button key={org.id} variant="outline" className="w-full justify-between" asChild>
              <Link href="/app/dashboard">
                {org.name}
                <span className="text-xs capitalize text-muted-foreground">{org.role}</span>
              </Link>
            </Button>
          ))}
        </div>
      </Shell>
    );
  }

  // Sin espacios propios todavía: si alguien te invitó, entras directo a ese
  // espacio con solo tu correo — no hace falta el link de invitación ni crear
  // tu propio espacio primero.
  const invitaciones = await getMyPendingInvitations();

  if (invitaciones.length === 1) {
    const inv = invitaciones[0];
    return (
      <Shell>
        <h1 className="text-center text-2xl font-semibold tracking-tight">
          Te invitaron a {inv.organizationName}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Como <Badge variant="secondary">{ROLE_LABELS[inv.role]}</Badge>
        </p>
        <div className="mt-8">
          <AutoAcceptInvitation token={inv.token} organizationName={inv.organizationName} />
        </div>
      </Shell>
    );
  }

  if (invitaciones.length > 1) {
    return (
      <Shell>
        <h1 className="text-center text-2xl font-semibold tracking-tight">
          Tienes varias invitaciones
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Elige a cuál espacio quieres entrar.
        </p>
        <div className="mt-6 space-y-3">
          {invitaciones.map((inv) => (
            <div key={inv.token} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{inv.organizationName}</span>
                <Badge variant="secondary">{ROLE_LABELS[inv.role]}</Badge>
              </div>
              <div className="mt-2">
                <AcceptInvitationButton token={inv.token} />
              </div>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-center text-2xl font-semibold tracking-tight">Crea tu espacio</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        Este será el lugar donde controles a todo tu equipo de edición.
      </p>
      <div className="mt-8">
        <WorkspaceForm />
      </div>
    </Shell>
  );
}
