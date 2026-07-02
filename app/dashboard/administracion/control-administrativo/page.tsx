"use client";

import { useEffect, useMemo, useState } from "react";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { OrdenService } from "@/app/service/OrdenService";

const formatMoney = (value?: number) => {
  const amount = Number(value ?? 0);
  return amount ? `${amount.toLocaleString("es-ES")} €` : "-";
};

export default function ControlAdministrativoPage() {
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("");
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
        console.error("Error fetching órdenes:", err);
        setError("No se han podido cargar las órdenes.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrdenes();
  }, []);

  const ordenesFiltradas = useMemo(() => {
    const query = filtro.trim().toLowerCase();
    if (!query) return ordenes;

    return ordenes.filter((orden) =>
      [
        orden.id_orden,
        orden.cliente,
        orden.agente,
        orden.id_contrato,
        orden.id_factura,
        orden.base_imponible,
        orden.forma_cobro,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [filtro, ordenes]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Control administrativo" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10 text-gray-600">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-blue-950">Órdenes</h2>
          <input
            type="search"
            value={filtro}
            onChange={(event) => setFiltro(event.target.value)}
            placeholder="Filtrar por orden, cliente, agente, contrato, factura..."
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-950 sm:w-96"
          />
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
                    Cargando órdenes...
                  </td>
                </tr>
              )}

              {!loading && ordenesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No hay órdenes que coincidan con el filtro.
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
