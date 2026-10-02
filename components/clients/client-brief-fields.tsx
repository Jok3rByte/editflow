"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DELIVERY_FORMATS } from "@/lib/validations/client";

export interface ClientBriefDefaults {
  name?: string;
  brandName?: string;
  industry?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  brandDescription?: string;
  targetAudience?: string;
  doNotDo?: string;
  deliveryFormats?: string[];
  monthlyGoal?: number;
  strategist?: string;
  assetsUrl?: string;
  notes?: string;
}

// Los campos del brief, compartidos entre "Registrar cliente" (vacíos) y
// "Editar brief" (precargados) — un solo lugar para mantener el formulario
// en vez de dos copias que se puedan desalinear.
export function ClientBriefFields({ defaults = {} }: { defaults?: ClientBriefDefaults }) {
  return (
    <>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Identificación</h3>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre del cliente *</Label>
          <Input id="name" name="name" defaultValue={defaults.name} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="brandName">Marca</Label>
            <Input id="brandName" name="brandName" defaultValue={defaults.brandName} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industria</Label>
            <Input id="industry" name="industry" defaultValue={defaults.industry} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" name="instagram" placeholder="@usuario" defaultValue={defaults.instagram} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tiktok">TikTok</Label>
            <Input id="tiktok" name="tiktok" placeholder="@usuario" defaultValue={defaults.tiktok} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="youtube">YouTube</Label>
            <Input id="youtube" name="youtube" placeholder="@canal" defaultValue={defaults.youtube} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Contacto</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="contactName">Nombre</Label>
            <Input id="contactName" name="contactName" defaultValue={defaults.contactName} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactPhone">Teléfono</Label>
            <Input id="contactPhone" name="contactPhone" defaultValue={defaults.contactPhone} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactEmail">Correo</Label>
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={defaults.contactEmail} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Brief creativo</h3>
        <div className="space-y-1.5">
          <Label htmlFor="brandDescription">Descripción de la marca</Label>
          <Textarea id="brandDescription" name="brandDescription" rows={2} defaultValue={defaults.brandDescription} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="targetAudience">Público objetivo</Label>
          <Textarea id="targetAudience" name="targetAudience" rows={2} defaultValue={defaults.targetAudience} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="doNotDo">Qué NO hacer</Label>
          <Textarea id="doNotDo" name="doNotDo" rows={2} defaultValue={defaults.doNotDo} />
        </div>
        <div className="space-y-1.5">
          <Label>Formatos a entregar</Label>
          <div className="grid grid-cols-2 gap-2">
            {DELIVERY_FORMATS.map((format) => (
              <label key={format} className="flex items-center gap-2 text-sm">
                <Checkbox
                  name="deliveryFormats"
                  value={format}
                  defaultChecked={defaults.deliveryFormats?.includes(format)}
                />
                {format}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Operación</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="monthlyGoal">Meta de videos del mes *</Label>
            <Input
              id="monthlyGoal"
              name="monthlyGoal"
              type="number"
              min={0}
              defaultValue={defaults.monthlyGoal ?? 0}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="strategist">Estratega</Label>
            <Input id="strategist" name="strategist" defaultValue={defaults.strategist ?? "Productora"} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assetsUrl">Carpeta de assets (URL)</Label>
          <Input
            id="assetsUrl"
            name="assetsUrl"
            placeholder="https://drive.google.com/..."
            defaultValue={defaults.assetsUrl}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" name="notes" rows={2} defaultValue={defaults.notes} />
        </div>
      </section>
    </>
  );
}
