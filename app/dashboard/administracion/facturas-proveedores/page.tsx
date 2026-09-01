"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { FacturaService } from "@/app/service/FacturaService";
import Link from "next/link";

const quarters = ["1T", "2T", "3T", "4T"];
const columns = [
  ["orden_compra_p3", "Orden Compra P3"],
  ["numero_contabilidad", "Numero contabilidad"],
  ["codigo_factura", "Codigo factura"],
  ["fecha_factura", "Fecha factura"],
  ["proveedor", "Proveedor"],
  ["base_imponible", "Base imponible"],
  ["importe_total", "Importe total"],
  ["forma_pago", "Forma de pago"],
  ["estado", "Estado"],
  ["comentarios", "Comentario"],
];

function formatMoney(value?: number) {
  const amount = Number(value ?? 0);
  return amount ? `${amount.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR` : "-";
}

function parseDate(fecha: string) {
  const match = String(fecha || "").match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : null;
}

function getYear(fecha: string) {
  return parseDate(fecha)?.getFullYear().toString() || "Sin fecha";
}

function getQuarter(fecha: string) {
  const date = parseDate(fecha);
  return date ? `${Math.floor(date.getMonth() / 3) + 1}T` : "";
}

export default function FacturasProveedoresPage() {
  const router = useRouter();
  const [facturas, setFacturas] = useState<any[]>([]);
  const [activeYear, setActiveYear] = useState("2025");
  const [activeQuarter, setActiveQuarter] = useState("1T");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    FacturaService.getFacturasProveedores()
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        setFacturas(rows);
        const firstYear = Array.from(new Set(rows.map((factura) => getYear(factura.fecha_factura)))).filter((year) => year !== "Sin fecha").sort().reverse()[0];
        if (firstYear && Number(firstYear) >= 2025) setActiveYear(firstYear);
      })
      .catch(() => setError("No se han podido cargar las facturas de proveedores."))
      .finally(() => setLoading(false));
  }, []);

  const years = useMemo(() => {
    const maxDataYear = Math.max(2025, ...facturas.map((factura) => Number(getYear(factura.fecha_factura))).filter(Number.isFinite));
    const currentYear = Math.max(maxDataYear, new Date().getFullYear());
    return Array.from({ length: currentYear - 2025 + 1 }, (_, index) => String(currentYear - index));
  }, [facturas]);

  const facturasFiltradas = useMemo(() => {
    return facturas.filter((factura) => {
      if (getYear(factura.fecha_factura) !== activeYear) return false;
      if (getQuarter(factura.fecha_factura) !== activeQuarter) return false;
      return columns.every(([field]) => !filters[field]?.trim() || String(factura[field] ?? "").toLowerCase().includes(filters[field].trim().toLowerCase()));
    });
  }, [activeQuarter, activeYear, facturas, filters]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Facturas proveedores" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10 text-gray-600">
        <div className="mb-4 flex justify-end"><Link href="/dashboard/administracion/facturas-proveedores/agregar" className="cursor-pointer rounded bg-blue-950 px-5 py-2 text-sm text-white transition hover:bg-blue-800">Agregar factura</Link></div>
        <div className="mb-3 flex flex-wrap gap-1">
          {years.map((year) => (
            <button key={year} type="button" onClick={() => setActiveYear(year)} className={`rounded-t px-5 py-2 text-sm ${activeYear === year ? "bg-blue-950 text-white" : "bg-white text-gray-700 hover:bg-gray-200"}`}>
              {year}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-1">
          {quarters.map((quarter) => (
            <button key={quarter} type="button" onClick={() => setActiveQuarter(quarter)} className={`rounded px-4 py-2 text-sm ${activeQuarter === quarter ? "bg-blue-950 text-white" : "bg-white text-gray-700 hover:bg-gray-200"}`}>
              {quarter}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-blue-950 text-white">
              <tr>
                {columns.map(([field, label], index) => <th key={field} className={`p-2 text-left font-light ${index === 0 ? "pl-6" : ""}`}>{label}</th>)}
              </tr>
              <tr className="bg-white text-gray-700">
                {columns.map(([field]) => (
                  <th key={field} className="p-2">
                    <input value={filters[field] || ""} onChange={(event) => setFilters({ ...filters, [field]: event.target.value })} className="w-full rounded border border-blue-200 px-2 py-1 text-xs outline-none focus:border-blue-950" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={columns.length} className="p-6 text-center text-gray-500">Cargando facturas...</td></tr>}
              {!loading && facturasFiltradas.length === 0 && <tr><td colSpan={columns.length} className="p-6 text-center text-gray-500">No hay facturas de proveedores en este periodo.</td></tr>}
              {!loading && facturasFiltradas.map((factura) => (
                <tr key={factura.id_factura_proveedor} onClick={() => router.push(`/dashboard/administracion/facturas-proveedores/${factura.id_factura_proveedor}`)} className="cursor-pointer hover:bg-gray-50">
                  <td className="border-b border-gray-200 p-2 pl-6">{factura.orden_compra_p3 || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{factura.numero_contabilidad || "-"}</td>
                  <td className="border-b border-gray-200 p-2 font-medium text-blue-950">{factura.codigo_factura || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{factura.fecha_factura || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{factura.proveedor || "-"}</td>
                  <td className="border-b border-gray-200 p-2 text-right">{formatMoney(factura.base_imponible)}</td>
                  <td className="border-b border-gray-200 p-2 text-right">{formatMoney(factura.importe_total)}</td>
                  <td className="border-b border-gray-200 p-2">{factura.forma_pago || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{factura.estado || "-"}</td>
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
