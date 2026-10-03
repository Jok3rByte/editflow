"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { signOutAction, updateProfile } from "@/lib/actions/auth";

// Países principales (LatAm + España/EE.UU.) con bandera e indicativo.
const PAISES = [
  { name: "Colombia", code: "+57", flag: "🇨🇴" },
  { name: "México", code: "+52", flag: "🇲🇽" },
  { name: "Estados Unidos", code: "+1", flag: "🇺🇸" },
  { name: "España", code: "+34", flag: "🇪🇸" },
  { name: "Argentina", code: "+54", flag: "🇦🇷" },
  { name: "Perú", code: "+51", flag: "🇵🇪" },
  { name: "Chile", code: "+56", flag: "🇨🇱" },
  { name: "Ecuador", code: "+593", flag: "🇪🇨" },
  { name: "Venezuela", code: "+58", flag: "🇻🇪" },
  { name: "Guatemala", code: "+502", flag: "🇬🇹" },
  { name: "Costa Rica", code: "+506", flag: "🇨🇷" },
  { name: "Panamá", code: "+507", flag: "🇵🇦" },
  { name: "Bolivia", code: "+591", flag: "🇧🇴" },
  { name: "Uruguay", code: "+598", flag: "🇺🇾" },
  { name: "Paraguay", code: "+595", flag: "🇵🇾" },
  { name: "Rep. Dominicana", code: "+1809", flag: "🇩🇴" },
  { name: "El Salvador", code: "+503", flag: "🇸🇻" },
  { name: "Honduras", code: "+504", flag: "🇭🇳" },
  { name: "Nicaragua", code: "+505", flag: "🇳🇮" },
];

function paisPorNombre(nombre: string) {
  return PAISES.find((p) => p.name === nombre) ?? PAISES[0];
}

function parsePhone(phone: string | null): { pais: string; numero: string } {
  if (!phone) return { pais: "Colombia", numero: "" };
  const porLargo = [...PAISES].sort((a, b) => b.code.length - a.code.length);
  const m = porLargo.find((p) => phone.startsWith(p.code));
  if (m) return { pais: m.name, numero: phone.slice(m.code.length).trim() };
  return { pais: "Colombia", numero: phone };
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProfileSettings({
  userId,
  email,
  fullName,
  avatarUrl,
  bio,
  phone,
}: {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const telParsed = parsePhone(phone);
  const [nombre, setNombre] = useState(fullName);
  const [paisTel, setPaisTel] = useState(telParsed.pais);
  const [numeroTel, setNumeroTel] = useState(telParsed.numero);
  const [biografia, setBiografia] = useState(bio ?? "");
  const [foto, setFoto] = useState<string | null>(avatarUrl);
  const [subiendo, setSubiendo] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen.");
      return;
    }
    setSubiendo(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setFoto(data.publicUrl);
      toast.success("Foto cargada — recuerda guardar.");
    } catch (err) {
      toast.error("No se pudo subir la foto", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubiendo(false);
    }
  }

  function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    const numeroLimpio = numeroTel.trim();
    const telefonoFinal = numeroLimpio ? `${paisPorNombre(paisTel).code} ${numeroLimpio}` : null;
    startTransition(async () => {
      const result = await updateProfile({
        fullName: nombre,
        avatarUrl: foto,
        bio: biografia,
        phone: telefonoFinal,
      });
      if (result.ok) {
        toast.success("Perfil actualizado");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleGuardar} className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative"
          title="Cambiar foto"
        >
          <Avatar className="size-16">
            {foto && <AvatarImage src={foto} alt={nombre} />}
            <AvatarFallback className="text-lg">{initials(nombre || email)}</AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-5 text-white" />
          </span>
        </button>
        <div>
          <p className="text-sm font-medium">Foto de perfil</p>
          <p className="text-xs text-muted-foreground">{subiendo ? "Subiendo…" : "Clic en la foto para cambiarla"}</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="perfil-nombre">Usuario *</Label>
          <Input
            id="perfil-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="perfil-telefono">Teléfono</Label>
          <div className="flex gap-2">
            <Select value={paisTel} onValueChange={setPaisTel}>
              <SelectTrigger className="w-28 shrink-0">
                <SelectValue>
                  <span className="flex items-center gap-1">
                    <span>{paisPorNombre(paisTel).flag}</span>
                    <span className="text-xs">{paisPorNombre(paisTel).code}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAISES.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    <span className="flex items-center gap-2">
                      <span>{p.flag}</span>
                      <span>{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.code}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              id="perfil-telefono"
              value={numeroTel}
              onChange={(e) => setNumeroTel(e.target.value)}
              placeholder="300 000 0000"
              type="tel"
              inputMode="tel"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="perfil-bio">Biografía (opcional)</Label>
        <Textarea
          id="perfil-bio"
          value={biografia}
          onChange={(e) => setBiografia(e.target.value)}
          placeholder="Cuéntale al equipo algo sobre ti"
          rows={3}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Correo: <span className="text-foreground">{email}</span> (no se puede cambiar)
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button type="submit" disabled={isPending || subiendo}>
          Guardar perfil
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => startTransition(() => signOutAction())}
          className="text-danger hover:text-danger"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </Button>
      </div>
    </form>
  );
}
