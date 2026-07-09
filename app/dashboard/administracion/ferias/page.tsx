"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { FeriaService } from "@/app/service/FeriaService";

type TabKey = "relevantes" | "otras" | "pasadas";

const tabs: { key: TabKey; label: string }[] = [
  { key: "relevantes", label: "Relevantes pendientes" },
  { key: "otras", label: "Otras pendientes" },
  { key: "pasadas", label: "Pasadas" },
];

function parseDate(value: string) {
  const match = String(value || "").trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : null;
}

function isPast(feria: any) {
  const finalDate = parseDate(feria.fecha_finalizacion);
  if (!finalDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  finalDate.setHours(0, 0, 0, 0);
  return finalDate < today;
}

function isRelevant(feria: any) {
  return Boolean(feria.hay_intercambio || feria.hay_especial || String(feria.id_contrato || "").trim());
}

function formatBool(value: boolean) {
  return value ? "Si" : "No";
}

export default function FeriasPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("relevantes");
  const [ferias, setFerias] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFerias = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await FeriaService.getFerias();
        setFerias(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching ferias:", err);
        setError("No se han podido cargar las ferias.");
      } finally {
        setLoading(false);
      }
    };

    fetchFerias();
  }, []);

  const feriasFiltradas = useMemo(() => {
    return ferias.filter((feria) => {
      const matchesQuery = !query.trim() || Object.values(feria).join(" ").toLowerCase().includes(query.trim().toLowerCase());
      const pasada = isPast(feria);
      if (tab === "pasadas") return pasada && matchesQuery;
      if (pasada) return false;
      return (tab === "relevantes" ? isRelevant(feria) : !isRelevant(feria)) && matchesQuery;
    });
  }, [ferias, query, tab]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Ferias" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10 text-gray-600">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-row">
            {tabs.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`w-60 cursor-pointer rounded-tr-lg p-3 text-center text-sm transition-all duration-300 ${
                  tab === item.key ? "z-30 rounded-tl-lg bg-blue-950 text-white" : "z-10 bg-white text-gray-700 hover:bg-gray-200"
                }`}
                style={{ marginLeft: index === 0 ? "0px" : "-5px" }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex justify-between gap-3">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar feria..." className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-950 sm:w-96" />
            <button type="button" onClick={() => router.push("/dashboard/administracion/ferias/crear")} className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
              Agregar feria
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-blue-950 text-white">
              <tr>
                <th className="p-2 pl-6 text-left font-light">Titulo edicion</th>
                <th className="p-2 text-left font-light">Nombre feria</th>
                <th className="p-2 text-left font-light">Pais</th>
                <th className="p-2 text-left font-light">Edicion</th>
                <th className="p-2 text-left font-light">Fecha inicio</th>
                <th className="p-2 text-left font-light">Fecha finalizacion</th>
                <th className="p-2 text-left font-light">Intercambio</th>
                <th className="p-2 text-left font-light">Contrato</th>
                <th className="p-2 text-left font-light">Especial</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-gray-500">
                    Cargando ferias...
                  </td>
                </tr>
              )}

              {!loading && feriasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-gray-500">
                    No hay ferias en esta pestana.
                  </td>
                </tr>
              )}

              {!loading && feriasFiltradas.map((feria) => (
                <tr
                  key={feria.id_feria}
                  onClick={() => router.push(`/dashboard/administracion/ferias/${feria.id_feria}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="border-b border-gray-200 p-2 pl-6 font-medium text-blue-950">{feria.titulo_especifico_edicion || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{feria.nombre_feria || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{feria.pais || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{feria.edicion_numero || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{feria.fecha_incio || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{feria.fecha_finalizacion || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{formatBool(feria.hay_intercambio)}</td>
                  <td className="border-b border-gray-200 p-2">{feria.id_contrato || "-"}</td>
                  <td className="border-b border-gray-200 p-2">{formatBool(feria.hay_especial)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
