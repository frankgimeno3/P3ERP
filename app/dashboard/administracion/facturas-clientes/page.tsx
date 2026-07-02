"use client";

import { useEffect, useMemo, useState } from "react";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { FacturaService } from "@/app/service/FacturaService";

const formatMoney = (value?: number) => {
  const amount = Number(value ?? 0);
  return amount ? `${amount.toLocaleString("es-ES")} €` : "-";
};

export default function FacturasClientesPage() {
  const [facturas, setFacturas] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFacturas = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await FacturaService.getFacturasClientes();
        setFacturas(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching facturas clientes:", err);
        setError("No se han podido cargar las facturas de clientes.");
      } finally {
        setLoading(false);
      }
    };

    fetchFacturas();
  }, []);

  const facturasFiltradas = useMemo(() => {
    const query = filtro.trim().toLowerCase();
    if (!query) return facturas;
    return facturas.filter((factura) => Object.values(factura).join(" ").toLowerCase().includes(query));
  }, [facturas, filtro]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Facturas clientes" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10 text-gray-600">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-blue-950">Facturas clientes</h2>
          <input type="search" value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Filtrar facturas..." className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-950 sm:w-80" />
        </div>

        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto bg-white">
          <table className="min-w-full">
            <thead className="bg-blue-950 text-white">
              <tr>
                <th className="p-2 pl-6 text-left font-light">Factura</th>
                <th className="p-2 text-left font-light">Cliente</th>
                <th className="p-2 text-left font-light">Cuenta</th>
                <th className="p-2 text-left font-light">Base imponible</th>
                <th className="p-2 text-left font-light">Importe total</th>
                <th className="p-2 text-left font-light">Fecha factura</th>
                <th className="p-2 text-left font-light">Comentarios</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-6 text-center text-gray-500">Cargando facturas...</td></tr>}
              {!loading && facturasFiltradas.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-500">No hay facturas de clientes.</td></tr>}
              {!loading && facturasFiltradas.map((factura) => (
                <tr key={factura.id_factura_cliente} className="hover:bg-gray-50">
                  <td className="border-b border-gray-200 p-2 pl-6 font-medium text-blue-950">{factura.id_factura_cliente}</td>
                  <td className="border-b border-gray-200 p-2">{factura.cliente || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{factura.id_cuenta || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{formatMoney(factura.base_imponible)}</td>
                  <td className="border-b border-gray-200 p-2">{formatMoney(factura.importe_total)}</td>
                  <td className="border-b border-gray-200 p-2">{factura.fecha_factura || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{factura.comentarios || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
