"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { PropuestaService } from "@/app/service/PropuestaService";

export default function ResumenPropuesta({ params }: { params: Promise<{ id_propuesta: string }> }) {
  const { id_propuesta } = use(params);
  const router = useRouter();
  const [propuesta, setPropuesta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setPropuesta(await PropuestaService.getPropuestaById(id_propuesta));
    } catch {
      setError("No se ha podido cargar la propuesta.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id_propuesta]);

  async function setEstado(estado: string) {
    if (!propuesta) return;
    setSaving(true);
    try {
      const updated = await PropuestaService.updatePropuesta(id_propuesta, { estado_propuesta: estado });
      setPropuesta(updated);
    } finally {
      setSaving(false);
    }
  }

  async function borrar() {
    if (!window.confirm("Eliminar esta propuesta?")) return;
    setSaving(true);
    await PropuestaService.deletePropuesta(id_propuesta);
    router.push("/dashboard/comercial/propuestas");
    router.refresh();
  }

  const lineas = propuesta?.lineas ?? [];
  const cobros = propuesta?.cobros ?? [];

  return (
    <div className="min-h-screen bg-gray-100 text-gray-600">
      <MiddleNav tituloprincipal={`Propuesta ${id_propuesta}`} />
      <div className="px-12 py-6">
        <div className="mb-5 flex flex-wrap justify-end gap-3 text-sm">
          <Link href={`/dashboard/comercial/propuestas/${id_propuesta}/editar`} className="rounded-lg bg-blue-950 px-4 py-2 text-white">
            Actualizar
          </Link>
          <Link href={`/dashboard/comercial/propuestas/crear?cuenta=${encodeURIComponent(propuesta?.id_cuenta_propuesta ?? "")}`} className="rounded-lg border border-blue-950 px-4 py-2 text-blue-950">
            Nueva para esta cuenta
          </Link>
          <button disabled={saving} onClick={() => void setEstado("Aceptada")} className="rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-50">
            Marcar como aceptada
          </button>
          <button disabled={saving} onClick={() => void setEstado("Rechazada")} className="rounded-lg bg-red-700 px-4 py-2 text-white disabled:opacity-50">
            Marcar como rechazada
          </button>
          <button disabled={saving} onClick={() => void borrar()} className="rounded-lg bg-gray-700 px-4 py-2 text-white disabled:opacity-50">
            Eliminar
          </button>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-xl">
          {loading && <p>Cargando propuesta...</p>}
          {error && <p className="text-red-700">{error}</p>}
          {!loading && !propuesta && !error && <p>Propuesta no encontrada.</p>}
          {propuesta && (
            <div className="space-y-8">
              <div>
                <input value={propuesta.nombre_propuesta || ""} readOnly className="w-full rounded-lg border p-3 text-xl font-semibold text-gray-900" />
                <div className="mt-4 grid gap-4 text-sm md:grid-cols-4">
                  <p><span className="block text-xs uppercase text-gray-400">Estado</span>{propuesta.estado_propuesta}</p>
                  <p><span className="block text-xs uppercase text-gray-400">Fase</span>{propuesta.fase_propuesta}</p>
                  <p><span className="block text-xs uppercase text-gray-400">Fecha envio</span>{propuesta.fecha_envio_propuesta || "-"}</p>
                  <p><span className="block text-xs uppercase text-gray-400">Validez</span>{propuesta.fecha_validez_propuesta || "-"}</p>
                </div>
              </div>

              <section>
                <h2 className="mb-3 font-semibold">Datos de cuenta y contacto</h2>
                <div className="grid gap-3 rounded-lg bg-gray-50 p-4 text-sm md:grid-cols-2">
                  <p><strong>Cuenta:</strong> {propuesta.cuenta?.nombre_empresa || propuesta.id_cuenta_propuesta}</p>
                  <p><strong>Agente:</strong> {propuesta.id_agente_propuesta || "-"}</p>
                  <p><strong>Contacto:</strong> {propuesta.contacto?.nombre_completo_contacto || propuesta.contacto_personalizado?.nombre || propuesta.id_contacto_propuesta || "-"}</p>
                  <p><strong>Email:</strong> {propuesta.contacto?.email_contacto || propuesta.contacto_personalizado?.email || "-"}</p>
                </div>
              </section>

              <section>
                <h2 className="mb-3 font-semibold">Contenido en propuesta</h2>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="p-3">Medio</th>
                        <th className="p-3">Publicacion</th>
                        <th className="p-3">Producto</th>
                        <th className="p-3 text-right">Ud.</th>
                        <th className="p-3 text-right">Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineas.map((linea: any) => (
                        <tr key={linea.id_linea_propuesta} className="border-t">
                          <td className="p-3">{linea.medio}</td>
                          <td className="p-3">{linea.publicacion}</td>
                          <td className="p-3">{linea.producto}</td>
                          <td className="p-3 text-right">{linea.unidades}</td>
                          <td className="p-3 text-right">{Number(linea.precio_unitario).toFixed(2)} EUR</td>
                        </tr>
                      ))}
                      {lineas.length === 0 && (
                        <tr><td colSpan={5} className="p-4 text-center text-gray-400">Sin lineas.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h2 className="mb-3 font-semibold">Cobros propuestos</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {cobros.map((cobro: any) => (
                    <div key={cobro.id_cobro_propuesta} className="rounded-lg border p-4 text-sm">
                      <p><strong>{cobro.numero_cobro}.</strong> {cobro.fecha_cobro || "Sin fecha"}</p>
                      <p>{cobro.forma_cobro} - {cobro.banco_cobro}</p>
                      <p className="font-semibold">{Number(cobro.importe_cobro).toFixed(2)} EUR</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg bg-gray-50 p-4 text-right">
                <p>Base imponible: <strong>{Number(propuesta.importe_total_bi_propuesta).toFixed(2)} EUR</strong></p>
                <p>IVA: <strong>{propuesta.iva_aplicable ? "21%" : "No aplica"}</strong></p>
                <p className="text-lg">Total: <strong>{Number(propuesta.importe_propuesta_con_iva).toFixed(2)} EUR</strong></p>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
