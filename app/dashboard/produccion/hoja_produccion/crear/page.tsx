"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { HojaProduccionService } from "@/app/service/HojaProduccionService";
import { AgenteService } from "@/app/service/AgenteService";

const fieldClass = "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-950";

const initialForm = {
  id_contenido: "",
  id_cuenta: "",
  id_agente: "",
  id_publicacion: "",
  tipo: "",
  especificaciones_contenido: "",
  estado_contenido: "Pendiente de publicar",
  pagina: "",
  deadline_contenido: "",
  fecha_publicacion: "",
  nombre_gestion: "",
};

function joinDate(parts: any) {
  return [parts.dd || "", parts.mm || "", parts.yyyy || ""].join("/");
}

function DateInputs({ label, value, onChange }: { label: string; value: any; onChange: (value: any) => void }) {
  const update = (field: string, nextValue: string) => onChange({ ...value, [field]: nextValue.replace(/\D/g, "") });
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-2">
        <input value={value.dd || ""} onChange={(event) => update("dd", event.target.value.slice(0, 2))} placeholder="dd" className="w-16 rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-950" />
        <input value={value.mm || ""} onChange={(event) => update("mm", event.target.value.slice(0, 2))} placeholder="mm" className="w-16 rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-950" />
        <input value={value.yyyy || ""} onChange={(event) => update("yyyy", event.target.value.slice(0, 4))} placeholder="yyyy" className="w-24 rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-950" />
      </div>
    </div>
  );
}

export default function CrearContenidoHojaProduccionPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [deadlineParts, setDeadlineParts] = useState<any>({});
  const [fechaPublicacionParts, setFechaPublicacionParts] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [destinos, setDestinos] = useState<string[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);

  useEffect(() => {
    AgenteService.getAgentes().then((data) => setAgentes(Array.isArray(data) ? data : [])).catch(() => setAgentes([]));
  }, []);

  const handleChange = (field: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (destinos.length === 0) throw new Error("Selecciona al menos un destino.");
      const created = await HojaProduccionService.createContenido({
        ...form,
        deadline_contenido: joinDate(deadlineParts),
        fecha_publicacion: joinDate(fechaPublicacionParts),
        destinos_publicacion: destinos,
        materiales_array: [],
      });
      router.push(`/dashboard/produccion/hoja_produccion/${encodeURIComponent(created.id_contenido)}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "No se pudo crear el contenido.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Agregar nuevo contenido" />
      <div className="min-h-screen bg-gray-100 p-12">
        <form onSubmit={handleSubmit} className="mx-auto max-w-5xl rounded-lg bg-white p-8 shadow-xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium">ID contenido</span>
              <input value={form.id_contenido} onChange={(e) => handleChange("id_contenido", e.target.value)} className={fieldClass} placeholder="Opcional" />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">ID cuenta</span>
              <input value={form.id_cuenta} onChange={(e) => handleChange("id_cuenta", e.target.value)} className={fieldClass} />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Agente</span>
              <select value={form.id_agente} onChange={(e) => handleChange("id_agente", e.target.value)} className={fieldClass}><option value="">Seleccionar agente</option>{agentes.map((agente) => <option key={agente.id_agente} value={agente.id_agente}>{agente.nombre_completo_agente || `${agente.nombre_agente || ""} ${agente.apellidos_agente || ""}`.trim()}</option>)}</select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">ID publicacion</span>
              <input value={form.id_publicacion} onChange={(e) => handleChange("id_publicacion", e.target.value)} className={fieldClass} />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Tipo</span>
              <input value={form.tipo} onChange={(e) => handleChange("tipo", e.target.value)} className={fieldClass} />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Estado</span>
              <select value={form.estado_contenido} onChange={(e) => handleChange("estado_contenido", e.target.value)} className={fieldClass}>
                <option value="Pendiente de publicar">Pendiente de publicar</option>
                <option value="Publicado">Publicado</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium">Pagina</span>
              <input value={form.pagina} onChange={(e) => handleChange("pagina", e.target.value)} className={fieldClass} />
            </label>

            <DateInputs label="Caducidad" value={deadlineParts} onChange={setDeadlineParts} />

            <DateInputs label="Fecha publicacion" value={fechaPublicacionParts} onChange={setFechaPublicacionParts} />

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium">Contenido</span>
              <textarea value={form.especificaciones_contenido} onChange={(e) => handleChange("especificaciones_contenido", e.target.value)} className={`${fieldClass} min-h-32`} />
            </label>
            <fieldset className="space-y-2 border-t border-gray-200 pt-4 md:col-span-2">
              <legend className="text-sm font-semibold text-blue-950">Destinos del contenido</legend>
              <p className="text-sm text-gray-500">Un único contenido puede utilizarse en varios destinos y generará una sola gestión.</p>
              <div className="flex flex-wrap gap-4">
                {[
                  ["vidrioperfil", "Vidrioperfil"],
                  ["revista_espana", "Revista España"],
                  ["revista_latam", "Revista LATAM"],
                ].map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={destinos.includes(value)} onChange={(event) => setDestinos(event.target.checked ? [...destinos, value] : destinos.filter((item) => item !== value))} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
         </div>

          {error && <p className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={() => router.push("/dashboard/produccion/hoja_produccion")} className="rounded bg-white px-4 py-2 text-sm text-gray-700 shadow hover:bg-gray-100">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded bg-blue-950 px-4 py-2 text-sm text-white shadow hover:bg-blue-900 disabled:opacity-60">
              {saving ? "Guardando..." : "Crear contenido"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
