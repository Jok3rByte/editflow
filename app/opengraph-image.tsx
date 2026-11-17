import { ImageResponse } from "next/og";

export const alt = "EditFlow — Control de editores de video para agencias y productoras";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          backgroundColor: "#09090b",
          backgroundImage:
            "linear-gradient(135deg, rgba(124, 58, 237, 0.32) 0%, rgba(9, 9, 11, 0) 52%, rgba(6, 182, 212, 0.22) 100%)",
          color: "#fafafa",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              backgroundColor: "#7c3aed",
              backgroundImage: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            E
          </div>
          <span style={{ fontSize: "30px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            EditFlow
          </span>
          <span
            style={{
              marginLeft: "12px",
              padding: "6px 14px",
              borderRadius: "999px",
              border: "1px solid rgba(167, 139, 250, 0.45)",
              background: "rgba(124, 58, 237, 0.16)",
              color: "#c4b5fd",
              fontSize: "18px",
              fontWeight: 500,
            }}
          >
            Para productoras y agencias
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "960px" }}>
          <div
            style={{
              fontSize: "62px",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
            }}
          >
            Una sola plataforma para todo tu equipo de edición
          </div>
          <div style={{ fontSize: "26px", lineHeight: 1.4, color: "#a1a1aa" }}>
            Clientes, monitoreo de videos, Google Calendar y métricas mensuales por periodo — sin
            hojas de cálculo manuales.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            paddingTop: "24px",
            fontSize: "20px",
            color: "#d4d4d8",
          }}
        >
          <span>Clientes · Monitoreo · Calendario · Métricas</span>
          <span style={{ color: "#a78bfa", fontWeight: 600 }}>editflow</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
