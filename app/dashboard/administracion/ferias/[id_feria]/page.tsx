"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { FeriaService } from "@/app/service/FeriaService";

const detailFields=[['intercambio_detalle','Intercambio'],['vuelos_detalle','Vuelos'],['transporte_detalle','Transporte'],['transporte_revistas_detalle','Transporte revistas'],['stand_detalle','Stand'],['material_feria_detalle','Material feria'],['acreditaciones_detalle','Acreditaciones'],['propuestas_asociadas_detalle','Propuestas asociadas'],['contratos_asociados_detalle','Contratos asociados'],['cuentas_asociadas_detalle','Cuentas asociadas']] as const;

function formatBool(value: boolean) {
  return value ? "Si" : "No";
}

export default function FeriaDetallePage() {
  const router = useRouter();
  const params = useParams<{ id_feria: string }>();
  const [feria, setFeria] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [details,setDetails]=useState<Record<string,string>>({}),[saving,setSaving]=useState(false);

  useEffect(() => {
    const fetchFeria = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await FeriaService.getFeriaById(params.id_feria);
        setFeria(data);
        setDetails(Object.fromEntries(detailFields.map(([key])=>[key,data[key]||''])));
      } catch (err) {
        console.error("Error fetching feria:", err);
        setError("No se ha podido cargar la feria.");
      } finally {
        setLoading(false);
      }
    };

    if (params.id_feria) fetchFeria();
  }, [params.id_feria]);

  const fields = useMemo(() => {
    if (!feria) return [];
    return [
      ["ID feria", feria.id_feria],
      ["Titulo edicion", feria.titulo_especifico_edicion],
      ["Nombre feria", feria.nombre_feria],
      ["Cuenta feria", feria.id_cuenta_feria],
      ["Cuenta gestion", feria.id_cuenta_gestion],
      ["Pais", feria.pais],
      ["Ciudad", feria.ciudad],
      ["Periodicidad", feria.periodicidad],
      ["Temática", feria.tematica],
      ["Fecha indicada en origen", feria.fecha_texto_original],
      ["Edicion", feria.edicion_numero],
      ["Intercambio", formatBool(feria.hay_intercambio)],
      ["Contrato", feria.id_contrato],
      ["Especial", formatBool(feria.hay_especial)],
      ["Descripcion", feria.descripcion],
      ["Comentarios", feria.text_area_comentarios],
      ["Vuelos", feria.estado_vuelos],
      ["Hotel", feria.estado_hotel],
      ["Stand", feria.estado_stand],
      ["Material", feria.estado_material],
      ["Transporte revistas", feria.estado_transporte_revistas],
      ["Pases", feria.estado_pases],
      ["Gestion evento", feria.textarea_gestion_evento],
      ["Fecha inicio", feria.fecha_incio],
      ["Fecha finalizacion", feria.fecha_finalizacion],
      ["Fuente", feria.fuente_importacion ? `${feria.fuente_importacion} · fila ${feria.fuente_fila}` : ""],
      ["En Vidrioperfil", formatBool(feria.en_vidrioperfil)],
    ];
  }, [feria]);
  const saveDetails=async()=>{if(!feria)return;setSaving(true);setError('');try{const updated=await FeriaService.updateEditionDetails(feria.id_feria,details);setFeria(updated);}catch(reason:any){setError(reason.response?.data?.message||reason.message);}finally{setSaving(false);}};

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Ficha feria" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10 text-gray-600">
        <button type="button" onClick={() => router.push("/dashboard/administracion/ferias")} className="mb-4 rounded bg-white px-4 py-2 text-sm text-blue-950 shadow-sm hover:bg-gray-50">
          Volver a ferias
        </button>

        {loading && <div className="bg-white p-6 text-gray-500">Cargando feria...</div>}
        {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {!loading && feria && (
          <div className="bg-white p-6 shadow-sm">
            <h1 className="mb-6 text-xl font-semibold text-blue-950">{feria.titulo_especifico_edicion || feria.nombre_feria}</h1>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {fields.map(([label, value]) => (
                <div key={label} className="border-b border-gray-200 pb-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
                  <p className="mt-1 text-sm text-gray-800">{value || "-"}</p>
                </div>
              ))}
            </div>
            <section className="mt-8"><h2 className="mb-4 text-lg font-semibold text-blue-950">Gestión de la edición</h2><div className="grid gap-4 md:grid-cols-2">{detailFields.map(([key,label])=><label key={key} className="text-sm font-medium">{label}<textarea value={details[key]||''} onChange={event=>setDetails(previous=>({...previous,[key]:event.target.value}))} className="mt-1 min-h-28 w-full rounded border p-3 font-normal"/></label>)}</div><button type="button" disabled={saving} onClick={saveDetails} className="mt-4 cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">{saving?'Guardando...':'Guardar apartados'}</button></section>
          </div>
        )}
      </div>
    </div>
  );
}
