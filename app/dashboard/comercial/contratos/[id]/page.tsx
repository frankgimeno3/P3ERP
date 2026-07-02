"use client";
import React, { FC, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { ContratoService } from "@/app/service/ContratoService";

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
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchContrato = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await ContratoService.getContratoById(id);
        setContrato(data);
      } catch (err) {
        console.error("Error fetching contrato:", err);
        setError("No se ha podido cargar el contrato.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchContrato();
  }, [id]);

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
        <section className="bg-white">
          <h2 className="px-4 py-3 text-base font-semibold text-blue-950">Datos generales</h2>
          <div className="grid grid-cols-1 md:grid-cols-3">
            <Field label="Contrato" value={contrato.id_contrato} />
            <Field label="Agente" value={contrato.nombre_agente_contrato || contrato.id_agente_contrato} />
            <Field label="Campaña asociada" value={contrato.id_campana_asociada} />
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
