"use client";

import { useEffect, useMemo, useState } from "react";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { CuentaService } from "@/app/service/CuentaService";
import { AgenteService } from "@/app/service/AgenteService";

export default function GestionCuentasPage() {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [filters, setFilters] = useState({ id: "", nombre: "", pais: "", agente: "" });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [data, agentesData] = await Promise.all([CuentaService.getCuentas(), AgenteService.getAgentes()]);
      setCuentas(Array.isArray(data) ? data : []);
      setAgentes(Array.isArray(agentesData) ? agentesData : []);
    } catch (error: any) {
      setError(error?.message || "No se han podido cargar las cuentas.");
      setCuentas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => cuentas.filter((cuenta) =>
    String(cuenta.id_cuenta || "").toLowerCase().includes(filters.id.toLowerCase()) &&
    String(cuenta.nombre_empresa || "").toLowerCase().includes(filters.nombre.toLowerCase()) &&
    String(cuenta.pais_cuenta || "").toLowerCase().includes(filters.pais.toLowerCase()) &&
    (!filters.agente || String(cuenta.id_agente || cuenta.asignado_a || "") === filters.agente)
  ), [cuentas, filters]);

  const deleteCuenta = async (cuenta: any) => {
    if (!window.confirm(`Eliminar la cuenta ${cuenta.nombre_empresa || cuenta.id_cuenta}?`)) return;
    setDeleting(cuenta.id_cuenta);
    setError("");
    try {
      await CuentaService.deleteCuenta(cuenta.id_cuenta);
      setCuentas((current) => current.filter((item) => item.id_cuenta !== cuenta.id_cuenta));
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || "No se ha podido eliminar la cuenta.");
    } finally {
      setDeleting("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-700">
      <MiddleNav tituloprincipal="Gestion de cuentas" />
      <main className="px-12 py-10">
        <section className="mb-6 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-blue-950">Gestion de cuentas</h1>
          <p className="mt-2 text-sm text-gray-500">Tabla operativa para localizar y eliminar cuentas.</p>
        </section>

        <section className="bg-white p-6 shadow-sm">
          {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="mb-5 grid gap-3 md:grid-cols-4">
            <Filter label="ID cuenta" value={filters.id} onChange={(value) => setFilters({ ...filters, id: value })} />
            <Filter label="Empresa" value={filters.nombre} onChange={(value) => setFilters({ ...filters, nombre: value })} />
            <Filter label="Pais" value={filters.pais} onChange={(value) => setFilters({ ...filters, pais: value })} />
            <label className="text-sm"><span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Agente</span><select value={filters.agente} onChange={(event) => setFilters({ ...filters, agente: event.target.value })} className="w-full rounded border border-gray-300 bg-white px-3 py-2"><option value="">Todos los agentes</option>{agentes.map((agente) => <option key={agente.id_agente} value={agente.id_agente}>{agente.nombre_completo_agente || `${agente.nombre_agente || ""} ${agente.apellidos_agente || ""}`.trim()}</option>)}</select></label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="p-2 text-left">ID cuenta</th>
                  <th className="p-2 text-left">Empresa</th>
                  <th className="p-2 text-left">Pais</th>
                  <th className="p-2 text-left">Agente</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={6} className="p-4 text-gray-500">Cargando cuentas...</td></tr>}
                {!loading && filtered.length === 0 && <tr><td colSpan={6} className="p-4 text-gray-500">No hay cuentas para mostrar.</td></tr>}
                {!loading && filtered.map((cuenta) => (
                  <tr key={cuenta.id_cuenta} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-2">{cuenta.id_cuenta}</td>
                    <td className="p-2 font-medium text-blue-950">{cuenta.nombre_empresa || "-"}</td>
                    <td className="p-2">{cuenta.pais_cuenta || "-"}</td>
                    <td className="p-2">{agentes.find((agente) => agente.id_agente === (cuenta.id_agente || cuenta.asignado_a))?.nombre_completo_agente || "-"}</td>
                    <td className="p-2">{cuenta.correo_principal || "-"}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        disabled={deleting === cuenta.id_cuenta}
                        onClick={() => void deleteCuenta(cuenta)}
                        className="rounded border border-red-700 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deleting === cuenta.id_cuenta ? "Eliminando..." : "Eliminar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Filter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-blue-950" />
    </label>
  );
}
