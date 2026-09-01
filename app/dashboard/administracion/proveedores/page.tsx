"use client";

import { useEffect, useMemo, useState } from "react";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { useRouter } from "next/navigation";
import { ProveedorService } from "@/app/service/ProveedorService";

type TabKey = "proveedores" | "pagos";

const tabs: { key: TabKey; label: string }[] = [
  { key: "proveedores", label: "Proveedores" },
  { key: "pagos", label: "Pagos" },
];

const formatMoney = (value?: number) => {
  const amount = Number(value ?? 0);
  return amount ? `${amount.toLocaleString("es-ES")} EUR` : "-";
};

export default function ProveedoresPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("proveedores");
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const [proveedoresData, pagosData] = await Promise.all([
          ProveedorService.getProveedores(),
          ProveedorService.getPagosProveedores(),
        ]);
        setProveedores(Array.isArray(proveedoresData) ? proveedoresData : []);
        setPagos(Array.isArray(pagosData) ? pagosData : []);
      } catch (err) {
        console.error("Error fetching proveedores:", err);
        setError("No se han podido cargar los proveedores y pagos.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const proveedoresFiltrados = useMemo(() => {
    const query = filtro.trim().toLowerCase();
    if (!query) return proveedores;
    return proveedores.filter((proveedor) => Object.values(proveedor).join(" ").toLowerCase().includes(query));
  }, [filtro, proveedores]);

  const pagosFiltrados = useMemo(() => {
    const query = filtro.trim().toLowerCase();
    if (!query) return pagos;
    return pagos.filter((pago) => Object.values(pago).join(" ").toLowerCase().includes(query));
  }, [filtro, pagos]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Proveedores" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10 text-gray-600">
        <div className="mb-4 flex flex-col gap-4">
          <div className="flex flex-row">
            {tabs.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`w-56 cursor-pointer rounded-tr-lg p-3 text-center text-sm transition-all duration-300 ${
                  tab === item.key
                    ? "z-30 rounded-tl-lg bg-blue-950 text-white"
                    : "z-10 bg-white text-gray-700 hover:bg-gray-200"
                }`}
                style={{ marginLeft: index === 0 ? "0px" : "-5px" }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={filtro}
            onChange={(event) => setFiltro(event.target.value)}
            placeholder={tab === "proveedores" ? "Filtrar proveedores..." : "Filtrar pagos..."}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-950 sm:w-96"
          />
        </div>

        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {tab === "proveedores" && (
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="p-2 pl-6 text-left font-light">ID proveedor</th>
                  <th className="p-2 text-left font-light">Proveedor</th>
                  <th className="p-2 text-left font-light">Nombre fiscal</th>
                  <th className="p-2 text-left font-light">VAT</th>
                  <th className="p-2 text-left font-light">Pais</th>
                  <th className="p-2 text-left font-light">Moneda</th>
                  <th className="p-2 text-left font-light">Pagos</th>
                  <th className="p-2 text-left font-light">Total pagos</th>
                  <th className="p-2 text-left font-light">Ultimo pago</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={9} className="p-6 text-center text-gray-500">Cargando proveedores...</td></tr>}
                {!loading && proveedoresFiltrados.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-gray-500">No hay proveedores.</td></tr>}
                {!loading && proveedoresFiltrados.map((proveedor) => (
                  <tr key={proveedor.id_proveedor} onClick={() => router.push(`/dashboard/administracion/proveedores/${encodeURIComponent(proveedor.id_proveedor)}`)} className="cursor-pointer transition hover:bg-blue-50">
                    <td className="border-b border-gray-200 p-2 pl-6 font-medium text-blue-950">{proveedor.id_proveedor || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{proveedor.nombre_proveedor || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{proveedor.nombre_fiscal_proveedor || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{proveedor.vat_code || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{proveedor.pais_proveedor || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{proveedor.moneda_proveedor || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{proveedor.numero_pagos}</td>
                    <td className="border-b border-gray-200 p-2">{formatMoney(proveedor.total_pagos)}</td>
                    <td className="border-b border-gray-200 p-2">{proveedor.ultimo_pago || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "pagos" && (
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="p-2 pl-6 text-left font-light">ID pago</th>
                  <th className="p-2 text-left font-light">Fecha pago</th>
                  <th className="p-2 text-left font-light">Proveedor</th>
                  <th className="p-2 text-left font-light">ID proveedor</th>
                  <th className="p-2 text-left font-light">BI</th>
                  <th className="p-2 text-left font-light">Total</th>
                  <th className="p-2 text-left font-light">Forma pago</th>
                  <th className="p-2 text-left font-light">Cuenta pago</th>
                  <th className="p-2 text-left font-light">Planificacion</th>
                  <th className="p-2 text-left font-light">Descripcion</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={10} className="p-6 text-center text-gray-500">Cargando pagos...</td></tr>}
                {!loading && pagosFiltrados.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-gray-500">No hay pagos.</td></tr>}
                {!loading && pagosFiltrados.map((pago) => (
                  <tr key={pago.id_pago} className="hover:bg-gray-50">
                    <td className="border-b border-gray-200 p-2 pl-6 font-medium text-blue-950">{pago.id_pago || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{pago.fecha_pago || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{pago.proveedor || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{pago.id_proveedor || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{formatMoney(pago.bi_pago)}</td>
                    <td className="border-b border-gray-200 p-2">{formatMoney(pago.total_pago)}</td>
                    <td className="border-b border-gray-200 p-2">{pago.forma_pago || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{pago.cuenta_pago || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{pago.nombre_planificacion || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{pago.descripcion_planificacion || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
