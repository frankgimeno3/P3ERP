"use client";

import { useEffect, useMemo, useState } from "react";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { OrdenService } from "@/app/service/OrdenService";

const formatMoney = (value?: number) => {
  const amount = Number(value ?? 0);
  return amount ? `${amount.toLocaleString("es-ES")} EUR` : "-";
};

const inputClass = "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-950";

export default function ControlAdministrativoPage() {
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [filtros, setFiltros] = useState({
    orden: "",
    cliente: "",
    agente: "",
    contrato: "",
    factura: "",
    forma_cobro: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrdenes = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await OrdenService.getOrdenesAdministrativas();
        setOrdenes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching ordenes:", err);
        setError("No se han podido cargar las ordenes.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrdenes();
  }, []);

  const ordenesFiltradas = useMemo(() => {
    const matches = (value: unknown, query: string) => String(value ?? "").toLowerCase().includes(query.trim().toLowerCase());

    return ordenes.filter((orden) =>
      matches(orden.id_orden, filtros.orden)
      && matches(orden.cliente, filtros.cliente)
      && matches(orden.agente, filtros.agente)
      && matches(orden.id_contrato, filtros.contrato)
      && matches(orden.id_factura, filtros.factura)
      && matches(orden.forma_cobro, filtros.forma_cobro),
    );
  }, [filtros, ordenes]);

  const handleFiltroChange = (field: keyof typeof filtros, value: string) => {
    setFiltros((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Control administrativo" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10 text-gray-600">
        <div className="mb-4 flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-blue-950">Ordenes</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <input type="search" value={filtros.orden} onChange={(event) => handleFiltroChange("orden", event.target.value)} placeholder="Orden" className={inputClass} />
            <input type="search" value={filtros.cliente} onChange={(event) => handleFiltroChange("cliente", event.target.value)} placeholder="Cliente" className={inputClass} />
            <input type="search" value={filtros.agente} onChange={(event) => handleFiltroChange("agente", event.target.value)} placeholder="Agente" className={inputClass} />
            <input type="search" value={filtros.contrato} onChange={(event) => handleFiltroChange("contrato", event.target.value)} placeholder="Contrato" className={inputClass} />
            <input type="search" value={filtros.factura} onChange={(event) => handleFiltroChange("factura", event.target.value)} placeholder="Factura" className={inputClass} />
            <input type="search" value={filtros.forma_cobro} onChange={(event) => handleFiltroChange("forma_cobro", event.target.value)} placeholder="Forma de cobro" className={inputClass} />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto bg-white">
          <table className="min-w-full">
            <thead className="bg-blue-950 text-white">
              <tr>
                <th className="p-2 pl-6 text-left font-light">Orden</th>
                <th className="p-2 text-left font-light">Cliente</th>
                <th className="p-2 text-left font-light">Agente</th>
                <th className="p-2 text-left font-light">Contrato</th>
                <th className="p-2 text-left font-light">Factura</th>
                <th className="p-2 text-left font-light">Base imponible</th>
                <th className="p-2 text-left font-light">Forma de cobro</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    Cargando ordenes...
                  </td>
                </tr>
              )}

              {!loading && ordenesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No hay ordenes que coincidan con los filtros.
                  </td>
                </tr>
              )}

              {!loading && ordenesFiltradas.map((orden) => (
                <tr key={orden.id_orden} className="hover:bg-gray-50">
                  <td className="border-b border-gray-200 p-2 pl-6 font-medium text-blue-950">{orden.id_orden || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.cliente || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.agente || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.id_contrato || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.id_factura || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{formatMoney(orden.base_imponible)}</td>
                  <td className="border-b border-gray-200 p-2">{orden.forma_cobro || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
