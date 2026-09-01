"use client";
import React, { FC, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { ContratoService } from "@/app/service/ContratoService";
import { AgenteService } from "@/app/service/AgenteService";

const formatDate = (value?: string) => value || "-";
const formatMoney = (value?: number) => {
  const amount = Number(value ?? 0);
  return amount ? `${amount.toLocaleString("es-ES")} €` : "-";
};

const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="border-b border-gray-200 px-4 py-3">
    <p className="text-xs uppercase text-gray-400">{label}</p>
    <p className="mt-1 text-sm text-gray-700">{value || "-"}</p>
  </div>
);

const ResumenContrato: FC = () => {
  const params = useParams();
  const id = params?.id as string;
  const [contrato, setContrato] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [agentes, setAgentes] = useState<any[]>([]);

  useEffect(() => {
    const fetchContrato = async () => {
      try {
        setLoading(true);
        setError("");
        const [data, agentRows] = await Promise.all([
          ContratoService.getContratoById(id),
          AgenteService.getAgentes(),
        ]);
        setContrato(data);
        setAgentes(Array.isArray(agentRows) ? agentRows : []);
      } catch (err) {
        console.error("Error fetching contrato:", err);
        setError("No se ha podido cargar el contrato.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchContrato();
  }, [id]);

  const saveGeneralData = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await ContratoService.updateContrato(id, {
        id_agente_contrato: contrato.id_agente_contrato || "",
      });
      setContrato(updated);
      setMessage("Datos generales actualizados correctamente.");
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.detail ||
          requestError?.response?.data?.message ||
          "No se ha podido actualizar el contrato.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-200 text-gray-600 p-12">
        <h2 className="text-xl font-semibold">Cargando contrato...</h2>
      </div>
    );
  }

  if (error || !contrato) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-200 text-gray-600 p-12">
        <h2 className="text-xl font-semibold text-red-600">{error || `No se encontró el contrato con ID: ${id}`}</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal={`Resumen del contrato nº ${contrato.id_contrato}`} />
      <div className="p-12 space-y-8">
        {error && <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p className="border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</p>}
        <section className="bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <h2 className="text-base font-semibold text-blue-950">Datos generales</h2>
            <button type="button" onClick={() => void saveGeneralData()} disabled={saving} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3">
            <Field label="Contrato" value={contrato.id_contrato} />
            <label className="border-b border-gray-200 px-4 py-3">
              <span className="text-xs uppercase text-gray-400">Agente</span>
              <select value={contrato.id_agente_contrato || ""} onChange={(event) => setContrato({ ...contrato, id_agente_contrato: event.target.value })} className="mt-1 w-full cursor-pointer rounded border bg-white px-3 py-2 text-sm transition hover:border-blue-950">
                <option value="">Sin agente</option>
                {agentes.map((agente) => <option key={agente.id_agente} value={agente.id_agente}>{agente.nombre_completo_agente || agente.nombre_agente || agente.id_agente}</option>)}
              </select>
            </label>
            <Field label="Propuesta de origen" value={contrato.id_propuesta ? <Link href={`/dashboard/comercial/propuestas/${encodeURIComponent(contrato.id_propuesta)}`} className="cursor-pointer font-medium text-blue-950 underline decoration-blue-300 underline-offset-2 transition hover:text-blue-700">{contrato.id_propuesta}</Link> : "-"} />
            <Field label="Fecha de firma" value={formatDate(contrato.fecha_firma_contrato)} />
            <Field label="Fecha fin" value={formatDate(contrato.fecha_fin_contrato)} />
            <Field label="Fecha cobro prevista" value={formatDate(contrato.fecha_cobro_prevista_contrato)} />
            <Field label="Forma de cobro" value={contrato.forma_cobro_contrato} />
            <Field label="Descuento final" value={formatMoney(contrato.descuento_final_contrato)} />
            <Field label="Importe BI" value={formatMoney(contrato.importe_total_bi_contrato)} />
            <Field label="IVA aplicable" value={contrato.iva_aplicable ? "Sí" : "No"} />
            <Field label="Importe con IVA" value={formatMoney(contrato.importe_contrato_con_iva)} />
          </div>
        </section>

        <section className="bg-white">
          <h2 className="px-4 py-3 text-base font-semibold text-blue-950">Datos de la empresa</h2>
          <div className="grid grid-cols-1 md:grid-cols-3">
            <Field label="Cuenta" value={contrato.nombre_empresa || contrato.id_cuenta_contrato} />
            <Field label="ID cuenta" value={contrato.id_cuenta_contrato} />
            <Field label="Contacto" value={contrato.nombre_contacto || contrato.id_contacto_contrato} />
            <Field label="ID contacto" value={contrato.id_contacto_contrato} />
            <Field label="Cargo contacto" value={contrato.cargo_contacto_contrato} />
          </div>
        </section>

        <section className="bg-white">
          <h2 className="px-4 py-3 text-base font-semibold text-blue-950">Contenido del contrato</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="p-2 text-left font-light">Línea</th>
                  <th className="p-2 text-left font-light">Medio</th>
                  <th className="p-2 text-left font-light">Publicación</th>
                  <th className="p-2 text-left font-light">Producto</th>
                  <th className="p-2 text-left font-light">Precio</th>
                  <th className="p-2 text-left font-light">Deadline</th>
                  <th className="p-2 text-left font-light">Fecha publicación</th>
                  <th className="p-2 text-left font-light">Estado material</th>
                </tr>
              </thead>
              <tbody>
                {contrato.lineas_contrato?.length ? contrato.lineas_contrato.map((linea: any) => (
                  <tr key={linea.id_linea_contrato}>
                    <td className="border-b border-gray-200 p-2">{linea.numero_linea_contrato || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{linea.medio || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{linea.publicacion || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{linea.producto || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{formatMoney(linea.precio_producto)}</td>
                    <td className="border-b border-gray-200 p-2">{linea.deadline_publicacion || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{linea.fecha_publicacion_publicacion || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{linea.estado_material_contrato || "-"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-500">Este contrato no tiene líneas asociadas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white">
          <h2 className="px-4 py-3 text-base font-semibold text-blue-950">Órdenes asociadas</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="p-2 text-left font-light">Orden</th>
                  <th className="p-2 text-left font-light">Contrato</th>
                  <th className="p-2 text-left font-light">Forma cobro</th>
                  <th className="p-2 text-left font-light">Factura</th>
                </tr>
              </thead>
              <tbody>
                {contrato.ordenes?.length ? contrato.ordenes.map((orden: any) => (
                  <tr key={orden.id_orden}>
                    <td className="border-b border-gray-200 p-2 font-medium text-blue-950">{orden.id_orden}</td>
                    <td className="border-b border-gray-200 p-2">{orden.id_contrato || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{orden.forma_cobro || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{orden.id_factura || "-"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-500">Este contrato no tiene órdenes asociadas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ResumenContrato;
