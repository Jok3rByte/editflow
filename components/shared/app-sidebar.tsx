"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LineChart,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell, type NotificacionRow } from "@/components/app/notification-bell";
import type { ActiveOrganization } from "@/lib/period/resolve";

const MODULOS = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/clientes", label: "Clientes", icon: Users },
  { href: "/app/monitoreo", label: "Monitoreo", icon: ClipboardList },
  { href: "/app/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/app/metricas", label: "Métricas", icon: LineChart },
];

const SOPORTE = [
  { href: "/app/equipo", label: "Equipo", icon: UsersRound },
  { href: "/app/configuracion", label: "Configuración", icon: Settings },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function AppSidebar({
  organization,
  memberName,
  membershipId,
  notificaciones,
}: {
  organization: ActiveOrganization;
  memberName: string;
  membershipId: string;
  notificaciones: NotificacionRow[];
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="EditFlow" className="size-7 shrink-0 object-contain" />
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">EditFlow</span>
            <span className="truncate text-xs text-muted-foreground">{organization.name}</span>
          </div>
          <div className="ml-auto group-data-[collapsible=icon]:hidden">
            <NotificationBell membershipId={membershipId} initial={notificaciones} />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MODULOS.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(href)} tooltip={label}>
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Soporte</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SOPORTE.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(href)} tooltip={label}>
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{initials(memberName)}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm group-data-[collapsible=icon]:hidden">
            {memberName}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
