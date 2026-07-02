"use client";

import { useEffect, useMemo, useState } from "react";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { PrevisionIngresosService } from "@/app/service/PrevisionIngresosService";

type TabKey = "recibos" | "transfers";

const tabs: { key: TabKey; label: string }[] = [
  { key: "recibos", label: "Recibos" },
  { key: "transfers", label: "Transfers" },
];

const formatMoney = (value?: number) => {
  const amount = Number(value ?? 0);
  return amount ? `${amount.toLocaleString("es-ES")} €` : "-";
};

export default function PrevisionIngresosPage() {
  const [tab, setTab] = useState<TabKey>("recibos");
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrdenes = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await PrevisionIngresosService.getOrdenes(tab);
        setOrdenes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching previsión de ingresos:", err);
        setError("No se ha podido cargar la previsión de ingresos.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrdenes();
  }, [tab]);

  const ordenesFiltradas = useMemo(() => {
    const query = filtro.trim().toLowerCase();
    if (!query) return ordenes;

    return ordenes.filter((orden) =>
      [
        orden.id_orden,
        orden.etiqueta_cobro,
        orden.fecha_teorica_cobro,
        orden.fecha_real_cobro,
        orden.forma_cobro,
        orden.banco_cobro,
        orden.id_contrato,
        orden.id_factura,
        orden.cliente,
        orden.agente,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [filtro, ordenes]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Previsión ingresos" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10 text-gray-600">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`rounded px-4 py-2 text-sm transition ${
                  tab === item.key
                    ? "bg-blue-950 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={filtro}
            onChange={(event) => setFiltro(event.target.value)}
            placeholder="Filtrar por orden, cliente, contrato, factura..."
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
                <th className="p-2 text-left font-light">Contrato</th>
                <th className="p-2 text-left font-light">Factura</th>
                <th className="p-2 text-left font-light">Nº cobro</th>
                <th className="p-2 text-left font-light">Etiqueta</th>
                <th className="p-2 text-left font-light">Fecha teórica</th>
                <th className="p-2 text-left font-light">Fecha real</th>
                <th className="p-2 text-left font-light">Forma cobro</th>
                <th className="p-2 text-left font-light">Banco</th>
                <th className="p-2 text-left font-light">Base imponible</th>
                <th className="p-2 text-left font-light">Cobro total</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={12} className="p-6 text-center text-gray-500">
                    Cargando previsión...
                  </td>
                </tr>
              )}

              {!loading && ordenesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-6 text-center text-gray-500">
                    No hay órdenes para esta pestaña.
                  </td>
                </tr>
              )}

              {!loading && ordenesFiltradas.map((orden) => (
                <tr key={orden.id_orden} className="hover:bg-gray-50">
                  <td className="border-b border-gray-200 p-2 pl-6 font-medium text-blue-950">{orden.id_orden || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.cliente || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.id_contrato || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.id_factura || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.numero_cobro || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.etiqueta_cobro || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.fecha_teorica_cobro || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.fecha_real_cobro || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.forma_cobro || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{orden.banco_cobro || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{formatMoney(orden.base_imponible)}</td>
                  <td className="border-b border-gray-200 p-2">{formatMoney(orden.cobro_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
