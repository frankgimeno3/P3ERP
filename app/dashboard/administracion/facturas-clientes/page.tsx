"use client";

import { useEffect, useMemo, useState } from "react";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { FacturaService } from "@/app/service/FacturaService";

function formatMoney(value?: number) {
  const amount = Number(value ?? 0);
  return amount ? `${amount.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR` : "-";
}

function getYear(fecha: string) {
  const match = String(fecha || "").match(/(\d{4})$/);
  return match ? match[1] : "Sin fecha";
}

export default function FacturasClientesPage() {
  const [facturas, setFacturas] = useState<any[]>([]);
  const [activeYear, setActiveYear] = useState("");
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFacturas = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await FacturaService.getFacturasClientes();
        const rows = Array.isArray(data) ? data : [];
        setFacturas(rows);
        const firstYear = Array.from(new Set(rows.map((factura) => getYear(factura.fecha_factura)))).sort().reverse()[0] || String(new Date().getFullYear());
        setActiveYear(firstYear);
      } catch (err) {
        console.error("Error fetching facturas clientes:", err);
        setError("No se han podido cargar las facturas de clientes.");
      } finally {
        setLoading(false);
      }
    };

    fetchFacturas();
  }, []);

  const years = useMemo(() => {
    const items = Array.from(new Set(facturas.map((factura) => getYear(factura.fecha_factura)))).sort().reverse();
    return items.length ? items : [String(new Date().getFullYear())];
  }, [facturas]);

  const facturasFiltradas = useMemo(() => {
    const query = filtro.trim().toLowerCase();
    return facturas.filter((factura) => {
      const matchesYear = getYear(factura.fecha_factura) === activeYear;
      const matchesQuery = !query || Object.values(factura).join(" ").toLowerCase().includes(query);
      return matchesYear && matchesQuery;
    });
  }, [activeYear, facturas, filtro]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Facturas clientes" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10 text-gray-600">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {years.map((year) => (
              <button key={year} type="button" onClick={() => setActiveYear(year)} className={`rounded-t px-5 py-2 text-sm ${activeYear === year ? "bg-blue-950 text-white" : "bg-white text-gray-700 hover:bg-gray-200"}`}>
                {year}
              </button>
            ))}
          </div>
          <input type="search" value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Filtrar facturas..." className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-950 sm:w-80" />
        </div>

        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-blue-950 text-white">
              <tr>
                <th className="p-2 pl-6 text-left font-light">N FRA</th>
                <th className="p-2 text-left font-light">FECHA EMISION</th>
                <th className="p-2 text-left font-light">CODIGO</th>
                <th className="p-2 text-left font-light">CLIENTE</th>
                <th className="p-2 text-right font-light">TOTAL NAC + IVA</th>
                <th className="p-2 text-right font-light">TOTAL UE</th>
                <th className="p-2 text-right font-light">TOTAL RESTO</th>
                <th className="p-2 text-left font-light">FORMA DE COBRO</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="p-6 text-center text-gray-500">Cargando facturas...</td></tr>}
              {!loading && facturasFiltradas.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-gray-500">No hay facturas de clientes.</td></tr>}
              {!loading && facturasFiltradas.map((factura) => (
                <tr key={factura.id_factura_cliente} className="hover:bg-gray-50">
                  <td className="border-b border-gray-200 p-2 pl-6 font-medium text-blue-950">{factura.id_factura_cliente}</td>
                  <td className="border-b border-gray-200 p-2">{factura.fecha_factura || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{factura.id_cuenta || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{factura.cliente || "-"}</td>
                  <td className="border-b border-gray-200 p-2 text-right">{formatMoney(factura.total_nac_iva)}</td>
                  <td className="border-b border-gray-200 p-2 text-right">{formatMoney(factura.total_ue)}</td>
                  <td className="border-b border-gray-200 p-2 text-right">{formatMoney(factura.total_resto)}</td>
                  <td className="border-b border-gray-200 p-2">{factura.forma_cobro || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
