"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { ContratoService } from "@/app/service/ContratoService";
import { FeriaService } from "@/app/service/FeriaService";
import { PropuestaService } from "@/app/service/PropuestaService";
import { RevistaService } from "@/app/service/RevistaService";

const emptyFeria = {
  titulo_especifico_edicion: "",
  nombre_feria: "",
  pais: "",
  ciudad: "",
  edicion_numero: "",
  fecha_incio: "",
  fecha_finalizacion: "",
  hay_intercambio: false,
  id_contrato: "",
  hay_especial: false,
  en_vidrioperfil: false,
  descripcion: "",
  id_revista_especial: "",
  id_propuesta_intercambio: "",
  estado_intercambio: "",
};

function joinDate(parts: any) {
  return [parts.dd || "", parts.mm || "", parts.yyyy || ""].join("/");
}

export default function CrearFeriaPage() {
  const router = useRouter();
  const [form, setForm] = useState<any>(emptyFeria);
  const [inicio, setInicio] = useState<any>({});
  const [fin, setFin] = useState<any>({});
  const [revistas, setRevistas] = useState<any[]>([]);
  const [propuestas, setPropuestas] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [modal, setModal] = useState<"revista" | "intercambio" | "propuesta" | "contrato" | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    RevistaService.getRevistas().then((data) => setRevistas(Array.isArray(data) ? data : [])).catch(() => setRevistas([]));
    PropuestaService.getPropuestas().then((data) => setPropuestas(Array.isArray(data) ? data : [])).catch(() => setPropuestas([]));
    ContratoService.getContratos().then((data) => setContratos(Array.isArray(data) ? data : [])).catch(() => setContratos([]));
  }, []);

  const updateDate = (kind: "inicio" | "fin", field: string, value: string) => {
    const setter = kind === "inicio" ? setInicio : setFin;
    const current = kind === "inicio" ? inicio : fin;
    const next = { ...current, [field]: value.replace(/\D/g, "") };
    setter(next);
    setForm((currentForm: any) => ({ ...currentForm, [kind === "inicio" ? "fecha_incio" : "fecha_finalizacion"]: joinDate(next) }));
  };

  const filtered = (rows: any[]) => {
    const lower = query.trim().toLowerCase();
    return rows.filter((row) => !lower || Object.values(row).join(" ").toLowerCase().includes(lower));
  };

  const intercambioOptions = useMemo(() => [
    ["sin_propuesta", "Todavia no hay una propuesta"],
    ["propuesta_no_firmada", "Hay una propuesta no firmada"],
    ["contrato", "Ya hay un contrato"],
  ], []);

  const createFeria = async () => {
    try {
      setError("");
      const created = await FeriaService.createFeria(form);
      router.push(`/dashboard/administracion/ferias/${created.id_feria}`);
    } catch (error: any) {
      setError(error?.message || "No se ha podido crear la feria.");
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-700">
      <MiddleNav tituloprincipal="Crear feria" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10">
        <button type="button" onClick={() => router.push("/dashboard/administracion/ferias")} className="mb-5 rounded bg-white px-4 py-2 text-sm text-blue-950 shadow-sm hover:bg-gray-50">Volver</button>
        {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <section className="bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {["titulo_especifico_edicion", "nombre_feria", "pais", "ciudad", "edicion_numero", "descripcion"].map((field) => (
              <label key={field} className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">{field}</span>
                <input value={form[field] || ""} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="w-full rounded border px-3 py-2" />
              </label>
            ))}
            {[
              ["inicio", inicio, "Fecha inicio"],
              ["fin", fin, "Fecha finalizacion"],
            ].map(([kind, parts, label]: any) => (
              <div key={kind}>
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">{label}</p>
                <div className="flex gap-2">
                  <input value={parts.dd || ""} onChange={(event) => updateDate(kind, "dd", event.target.value.slice(0, 2))} placeholder="dd" className="w-16 rounded border px-2 py-2" />
                  <input value={parts.mm || ""} onChange={(event) => updateDate(kind, "mm", event.target.value.slice(0, 2))} placeholder="mm" className="w-16 rounded border px-2 py-2" />
                  <input value={parts.yyyy || ""} onChange={(event) => updateDate(kind, "yyyy", event.target.value.slice(0, 4))} placeholder="yyyy" className="w-24 rounded border px-2 py-2" />
                </div>
              </div>
            ))}
            <label className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
              <input type="checkbox" checked={form.en_vidrioperfil} onChange={(event) => setForm({ ...form, en_vidrioperfil: event.target.checked })} />
              En Vidrioperfil
            </label>
            <div className="rounded border px-3 py-2 text-sm">
              <p className="mb-2">Tiene una edicion especial?</p>
              <button type="button" onClick={() => setModal("revista")} className="rounded bg-blue-950 px-3 py-1 text-white">Si, seleccionar revista</button>
              {form.id_revista_especial && <p className="mt-2 text-xs text-gray-600">{form.id_revista_especial}</p>}
            </div>
            <button type="button" onClick={() => setModal("intercambio")} className="rounded border px-3 py-2 text-left text-sm hover:bg-gray-50">
              Intercambio {form.estado_intercambio ? `- ${form.estado_intercambio}` : ""}
            </button>
            <button type="button" onClick={() => setModal("contrato")} className="rounded border px-3 py-2 text-left text-sm hover:bg-gray-50">
              Contrato {form.id_contrato ? `- ${form.id_contrato}` : ""}
            </button>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={createFeria} disabled={!form.titulo_especifico_edicion} className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:bg-gray-400">Crear feria</button>
          </div>
        </section>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-4xl rounded bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-semibold text-blue-950">Seleccionar</p>
              <button type="button" onClick={() => { setModal(null); setQuery(""); }} className="text-xl">x</button>
            </div>
            {modal === "intercambio" ? (
              <div className="space-y-2">
                {intercambioOptions.map(([value, label]) => (
                  <button key={value} type="button" onClick={() => {
                    setForm({ ...form, hay_intercambio: true, estado_intercambio: value });
                    if (value === "propuesta_no_firmada") setModal("propuesta");
                    else if (value === "contrato") setModal("contrato");
                    else setModal(null);
                  }} className="block w-full rounded border px-3 py-2 text-left hover:bg-gray-50">{label}</button>
                ))}
              </div>
            ) : (
              <>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar..." className="mb-3 w-full rounded border px-3 py-2 text-sm" />
                <div className="max-h-96 overflow-auto">
                  <table className="min-w-full text-sm">
                    <tbody>
                      {(modal === "revista" ? filtered(revistas) : modal === "propuesta" ? filtered(propuestas) : filtered(contratos)).map((item: any) => {
                        const id = item.id_revista || item.id_propuesta || item.id_contrato;
                        return (
                          <tr key={id} onClick={() => {
                            if (modal === "revista") setForm({ ...form, hay_especial: true, id_revista_especial: id });
                            if (modal === "propuesta") setForm({ ...form, hay_intercambio: true, id_propuesta_intercambio: id, estado_intercambio: "propuesta_no_firmada" });
                            if (modal === "contrato") setForm({ ...form, hay_intercambio: true, id_contrato: id, estado_intercambio: "contrato" });
                            setModal(null);
                          }} className="cursor-pointer border-b hover:bg-gray-50">
                            <td className="p-2 font-medium text-blue-950">{id}</td>
                            <td className="p-2">{item.revista || item.nombre_propuesta || item.id_cuenta_contrato || "-"}</td>
                            <td className="p-2">{item.edicion || item.estado_propuesta || item.fecha_firma_contrato || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
