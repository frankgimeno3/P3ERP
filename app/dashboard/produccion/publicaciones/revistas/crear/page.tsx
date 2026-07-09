"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { RevistaService } from "@/app/service/RevistaService";

function joinDate(parts: any) {
  return [parts.dd || "", parts.mm || "", parts.yyyy || ""].join("/");
}

function DateInputs({ label, value, onChange }: { label: string; value: any; onChange: (value: any) => void }) {
  const update = (field: string, nextValue: string) => onChange({ ...value, [field]: nextValue.replace(/\D/g, "") });
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-gray-500">{label}</p>
      <div className="flex gap-2">
        <input value={value.dd || ""} onChange={(event) => update("dd", event.target.value.slice(0, 2))} placeholder="dd" className="w-16 rounded border px-2 py-2 text-sm" />
        <input value={value.mm || ""} onChange={(event) => update("mm", event.target.value.slice(0, 2))} placeholder="mm" className="w-16 rounded border px-2 py-2 text-sm" />
        <input value={value.yyyy || ""} onChange={(event) => update("yyyy", event.target.value.slice(0, 4))} placeholder="yyyy" className="w-24 rounded border px-2 py-2 text-sm" />
      </div>
    </div>
  );
}

export default function CrearRevistaPage() {
  const router = useRouter();
  const [form, setForm] = useState<any>({ revista: "", edicion: "", numero_publicacion: "", especial: "" });
  const [deadline, setDeadline] = useState<any>({});
  const [fechaPublicacion, setFechaPublicacion] = useState<any>({});
  const [error, setError] = useState("");

  const create = async () => {
    try {
      setError("");
      const created = await RevistaService.createRevista({
        ...form,
        deadline_materiales: joinDate(deadline),
        fecha_publicacion: joinDate(fechaPublicacion),
      });
      router.push(`/dashboard/produccion/publicaciones/revistas/${created.id_revista}`);
    } catch (error: any) {
      setError(error?.message || "No se ha podido crear la publicacion.");
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-700">
      <MiddleNav tituloprincipal="Crear publicacion" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10">
        {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <section className="bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              ["revista", "revista"],
              ["edicion", "edicion"],
              ["numero_publicacion", "numero"],
              ["especial", "especial"],
            ].map(([field, label]) => (
              <label key={field} className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">{label}</span>
                <input value={form[field] || ""} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="w-full rounded border px-3 py-2" />
              </label>
            ))}
            <DateInputs label="Deadline materiales" value={deadline} onChange={setDeadline} />
            <DateInputs label="Fecha publicacion" value={fechaPublicacion} onChange={setFechaPublicacion} />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => router.push("/dashboard/produccion/publicaciones")} className="rounded border px-4 py-2 text-sm">Cancelar</button>
            <button type="button" onClick={create} className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">Crear</button>
          </div>
        </section>
      </div>
    </div>
  );
}
