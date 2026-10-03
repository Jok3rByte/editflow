// Tipos manuales que reflejan supabase/migrations/*.sql.
// Cuando exista un proyecto Supabase conectado, regenera este archivo con:
//   npx supabase gen types typescript --project-id <ref> > types/database.types.ts
// y revisa que no haya divergido de las migraciones locales.

export type MemberRole = "owner" | "admin" | "editor" | "viewer";
export type VideoStatus =
  | "pendiente"
  | "edicion"
  | "en_revision"
  | "aprobado"
  | "entregado"
  | "cancelado";
export type VideoPriority = "baja" | "media" | "alta" | "urgente";
export type EventType = "reunion" | "grabacion" | "entrega" | "clase" | "evento" | "otro";
export type ClientStatus = "activo" | "pausado" | "finalizado";
export type InvitationStatus = "pendiente" | "aceptada" | "expirada" | "revocada";
export type PeriodStatus = "abierto" | "cerrado";

type Relationships = [];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_email: string;
          logo_url: string | null;
          timezone: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["organizations"]["Row"]> & {
          name: string;
          slug: string;
          owner_email: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
        Relationships: Relationships;
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: MemberRole;
          full_name: string | null;
          email: string;
          avatar_url: string | null;
          active: boolean;
          notify_calendar: boolean;
          notify_assignments: boolean;
          notify_weekly_digest: boolean;
          notify_daily_digest: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["memberships"]["Row"]> & {
          organization_id: string;
          user_id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["memberships"]["Row"]>;
        Relationships: Relationships;
      };
      invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: MemberRole;
          token: string;
          status: InvitationStatus;
          invited_by: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["invitations"]["Row"]> & {
          organization_id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["invitations"]["Row"]>;
        Relationships: Relationships;
      };
      periods: {
        Row: {
          id: string;
          organization_id: string;
          year: number;
          month: number;
          label: string;
          status: PeriodStatus;
          opened_by: string | null;
          opened_at: string;
          closed_at: string | null;
          notes: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["periods"]["Row"]> & {
          organization_id: string;
          year: number;
          month: number;
          label: string;
        };
        Update: Partial<Database["public"]["Tables"]["periods"]["Row"]>;
        Relationships: Relationships;
      };
      period_snapshots: {
        Row: {
          id: string;
          period_id: string;
          client_summary: unknown;
          editor_productivity: unknown;
          kpis: unknown;
          generated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["period_snapshots"]["Row"]> & {
          period_id: string;
          client_summary: unknown;
          editor_productivity: unknown;
          kpis: unknown;
        };
        Update: Partial<Database["public"]["Tables"]["period_snapshots"]["Row"]>;
        Relationships: Relationships;
      };
      clients: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          brand_name: string | null;
          industry: string | null;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          website: string | null;
          social_links: Record<string, string> | null;
          brand_description: string | null;
          target_audience: string | null;
          tone_of_voice: string | null;
          objectives: string | null;
          content_pillars: string[] | null;
          reference_links: string[] | null;
          brand_colors: string[] | null;
          fonts: string | null;
          do_not_do: string | null;
          delivery_formats: string[] | null;
          default_monthly_goal: number;
          default_strategist: string | null;
          default_editor_id: string | null;
          start_date: string | null;
          status: ClientStatus;
          assets_drive_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["clients"]["Row"]> & {
          organization_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Row"]>;
        Relationships: Relationships;
      };
      client_periods: {
        Row: {
          id: string;
          organization_id: string;
          period_id: string;
          client_id: string;
          monthly_goal: number;
          strategist: string | null;
          editor_id: string | null;
          active: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["client_periods"]["Row"]> & {
          organization_id: string;
          period_id: string;
          client_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["client_periods"]["Row"]>;
        Relationships: Relationships;
      };
      videos: {
        Row: {
          id: string;
          organization_id: string;
          period_id: string;
          seq: number;
          client_id: string;
          title: string;
          editor_id: string | null;
          editor_name_raw: string | null;
          start_date: string | null;
          due_date: string | null;
          delivered_at: string | null;
          status: VideoStatus;
          priority: VideoPriority;
          progreso: number;
          progreso_inicio: string | null;
          strategist: string | null;
          observations: string | null;
          processed_link: string | null;
          revision_count: number;
          format: string | null;
          duration_seconds: number | null;
          carried_from_video_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["videos"]["Row"]> & {
          organization_id: string;
          period_id: string;
          client_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["videos"]["Row"]>;
        Relationships: Relationships;
      };
      video_status_history: {
        Row: {
          id: string;
          video_id: string;
          from_status: VideoStatus | null;
          to_status: VideoStatus;
          changed_by: string | null;
          changed_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: Relationships;
      };
      calendar_events: {
        Row: {
          id: string;
          organization_id: string;
          period_id: string | null;
          title: string;
          description: string | null;
          type: EventType;
          client_id: string | null;
          video_id: string | null;
          start_at: string;
          end_at: string;
          all_day: boolean;
          location: string | null;
          meeting_url: string | null;
          recurrence_rule: string | null;
          color: string | null;
          created_by: string | null;
          google_event_id: string | null;
          google_html_link: string | null;
          google_organizer_membership_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["calendar_events"]["Row"]> & {
          organization_id: string;
          title: string;
          start_at: string;
          end_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["calendar_events"]["Row"]>;
        Relationships: Relationships;
      };
      event_attendees: {
        Row: {
          id: string;
          event_id: string;
          membership_id: string | null;
          email: string;
          notify: boolean;
          response: string | null;
          google_event_id: string | null;
          google_html_link: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["event_attendees"]["Row"]> & {
          event_id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_attendees"]["Row"]>;
        Relationships: Relationships;
      };
      event_reminders: {
        Row: {
          id: string;
          event_id: string;
          minutes_before: number;
          sent_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["event_reminders"]["Row"]> & {
          event_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_reminders"]["Row"]>;
        Relationships: Relationships;
      };
      google_oauth_tokens: {
        Row: {
          id: string;
          organization_id: string;
          membership_id: string;
          google_email: string;
          access_token: string;
          refresh_token: string | null;
          expires_at: string;
          scope: string;
          calendar_sync_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["google_oauth_tokens"]["Row"]> & {
          organization_id: string;
          membership_id: string;
          google_email: string;
          access_token: string;
          expires_at: string;
          scope: string;
        };
        Update: Partial<Database["public"]["Tables"]["google_oauth_tokens"]["Row"]>;
        Relationships: Relationships;
      };
      notifications: {
        Row: {
          id: string;
          organization_id: string;
          recipient_email: string;
          membership_id: string | null;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          read_at: string | null;
          email_sent_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          organization_id: string;
          recipient_email: string;
          type: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: Relationships;
      };
    };
    Views: {
      v_client_summary: {
        Row: {
          period_id: string;
          periodo: string;
          organization_id: string;
          client_id: string;
          cliente: string;
          encargado: string | null;
          meta_mensual: number;
          total_videos: number;
          pendientes: number;
          en_edicion: number;
          en_revision: number;
          finalizados: number;
          porcentaje_avance: number | null;
          porcentaje_alcance_meta: number | null;
          atrasados: number;
          ultima_entrega: string | null;
        };
        Relationships: Relationships;
      };
      v_editor_productivity: {
        Row: {
          period_id: string;
          periodo: string;
          organization_id: string;
          editor_id: string;
          editor: string | null;
          email: string;
          videos_asignados: number;
          entregados: number;
          en_curso: number;
          en_revision: number;
          atrasados: number;
          entregados_a_tiempo: number;
          cumplimiento_pct: number | null;
          dias_promedio_edicion: number | null;
          revisiones_promedio: number | null;
          clientes_atendidos: number;
        };
        Relationships: Relationships;
      };
      v_period_kpis: {
        Row: {
          period_id: string;
          organization_id: string;
          label: string;
          status: PeriodStatus;
          total_videos: number;
          entregados: number;
          en_edicion: number;
          en_revision: number;
          pendientes: number;
          atrasados: number;
          clientes_activos: number;
          meta_total: number;
          cumplimiento_global: number | null;
        };
        Relationships: Relationships;
      };
      v_client_month_series: {
        Row: {
          organization_id: string;
          client_id: string;
          cliente: string;
          year: number;
          month: number;
          periodo: string;
          month_key: string;
          meta_mensual: number;
          total_videos: number;
          finalizados: number;
          no_finalizados: number;
          porcentaje_alcance_meta: number | null;
          eventos: number;
          reuniones: number;
          dias_promedio_edicion: number | null;
          total_revisiones: number;
        };
        Relationships: Relationships;
      };
      v_editor_month_series: {
        Row: {
          organization_id: string;
          editor_id: string;
          editor: string | null;
          year: number;
          month: number;
          periodo: string;
          month_key: string;
          videos_asignados: number;
          entregados: number;
          cumplimiento_pct: number | null;
          dias_promedio_edicion: number | null;
          revisiones_promedio: number | null;
        };
        Relationships: Relationships;
      };
      v_calendar_events_full: {
        Row: {
          id: string;
          organization_id: string;
          period_id: string | null;
          title: string;
          description: string | null;
          type: EventType;
          client_id: string | null;
          video_id: string | null;
          start_at: string;
          end_at: string;
          all_day: boolean;
          location: string | null;
          meeting_url: string | null;
          recurrence_rule: string | null;
          color: string | null;
          is_virtual: boolean;
        };
        Relationships: Relationships;
      };
    };
    Functions: {
      create_organization_with_owner: {
        Args: {
          p_name: string;
          p_slug: string;
          p_owner_email: string;
          p_timezone: string;
          p_full_name: string;
        };
        Returns: string;
      };
      open_period: {
        Args: {
          p_org: string;
          p_year: number;
          p_month: number;
          p_client_ids?: string[];
          p_goals?: number[];
        };
        Returns: string;
      };
      carry_over_video: {
        Args: { p_video_id: string; p_target_period_id: string };
        Returns: string;
      };
      close_period: {
        Args: { p_period_id: string };
        Returns: undefined;
      };
      reopen_period: {
        Args: { p_period_id: string };
        Returns: undefined;
      };
      delete_empty_period: {
        Args: { p_period_id: string };
        Returns: undefined;
      };
      get_invitation: {
        Args: { p_token: string };
        Returns: {
          organization_name: string;
          email: string;
          role: MemberRole;
          status: InvitationStatus;
          expires_at: string;
        }[];
      };
      get_my_pending_invitations: {
        Args: Record<string, never>;
        Returns: {
          token: string;
          organization_name: string;
          role: MemberRole;
          expires_at: string;
        }[];
      };
      accept_invitation: {
        Args: { p_token: string; p_full_name: string };
        Returns: string;
      };
    };
    Enums: {
      member_role: MemberRole;
      video_status: VideoStatus;
      video_priority: VideoPriority;
      event_type: EventType;
      client_status: ClientStatus;
      invitation_status: InvitationStatus;
      period_status: PeriodStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
