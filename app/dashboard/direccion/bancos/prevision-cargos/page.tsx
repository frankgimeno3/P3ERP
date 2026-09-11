"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../RecurringChargeModal";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
type Tab = "registrados" | "pendientes";
export default function Page() {
  const embedded = false;
  const [tab, setTab] = useState<Tab>("registrados"),
    [rec, setRec] = useState<any[]>([]),
    [lines, setLines] = useState<any[]>([]),
    [providers, setProviders] = useState<any[]>([]),
    [employees, setEmployees] = useState<any[]>([]),
    [loadError, setLoadError] = useState(''),
    [open, setOpen] = useState(false),
    [f, setF] = useState({
      bi: "",
      total: "",
      provider: "",
      day: "",
      month: "",
      year: "",
      description: "",
      kind: "",
    });
  const load = useCallback(
    () =>
      Promise.all([
        ...['/api/v1/direccion/cargos-recurrentes', '/api/v1/direccion/bancos', '/api/v1/admin/proveedores', '/api/v1/direccion/laboral/empleados'].map(url => fetch(url).then(async r => { if (!r.ok) throw new Error('No se pudieron cargar los cargos o sus destinatarios.'); return r.json(); })),
      ]).then(([a, b, c, d]) => {
        setRec(Array.isArray(a) ? a : []);
        setLines(Array.isArray(b) ? b : []);
        setProviders(Array.isArray(c) ? c : []);
        setEmployees(Array.isArray(d) ? d : []);
        setLoadError('');
      }).catch(error => setLoadError(error.message)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  const rows = useMemo(
    () =>
      tab === "registrados"
        ? rec.flatMap((r) =>
            (r.programacion || []).map((p: any, i: number) => ({
              id: `${r.id_cargo_recurrente}-${i}`,
              bi: +p.base_imponible || 0,
              total: +p.total_iva || 0,
              kind: r.tipo_cargo === 'nomina' ? 'nomina' : 'proveedor',
              provider: r.tipo_cargo === 'nomina' ? r.nombre_agente || r.id_agente : r.nombre_proveedor || r.id_proveedor || 'Sin asociar',
              date:
                r.tipo_programacion === "fechas"
                  ? `${String(p.dia).padStart(2, "0")}/${String(p.mes).padStart(2, "0")}${p.anio ? `/${p.anio}` : ''}`
                  : `Cada ${p.cada} ${p.unidad}`,
              description: p.descripcion || "",
              bank: "",
            })),
          )
        : lines
            .filter(
              (l) => +l.importe < 0 && !l.id_pago && !l.id_cargo_recurrente,
            )
            .map((l) => ({
              id: l.id_linea_banco,
              bi: 0,
              total: Math.abs(+l.importe),
              kind: l.id_agente ? 'nomina' : 'proveedor',
              provider: l.nombre_agente || l.id_agente || l.nombre_proveedor || l.id_proveedor || "Sin asociar",
              date: l.fecha_valor,
              description: l.concepto,
              bank: l.banco,
            })),
    [lines, rec, tab],
  );
  const shown = rows.filter(
    (r) =>
      (!f.kind || r.kind === f.kind) &&
      (!f.bi || String(r.bi).includes(f.bi)) &&
      (!f.total || String(r.total).includes(f.total)) &&
      (!f.provider ||
        r.provider.toLowerCase().includes(f.provider.toLowerCase())) &&
      (!f.description ||
        r.description.toLowerCase().includes(f.description.toLowerCase())) &&
      (![f.day, f.month, f.year].some(Boolean) ||
        r.date.includes([f.day, f.month, f.year].filter(Boolean).join("/"))),
  );
  return (
    <div className={`${embedded ? "" : "min-h-screen bg-gray-100"} text-slate-900`}>
      {!embedded && <MiddleNav tituloprincipal="Previsión cargos" />}
      <main className={embedded ? "py-6" : "p-6 lg:p-12"}>
        <div className="mb-5 flex items-end justify-between">
          <div className="flex border-b">
            {(
              [
                { key: "registrados", label: "Cargos previstos registrados" },
                { key: "pendientes", label: "Cargos pendientes de asociar" },
              ] as const
            ).map((x) => (
              <button
                key={x.key}
                onClick={() => setTab(x.key)}
                className={`cursor-pointer border-b-2 px-5 py-3 font-semibold transition hover:bg-blue-50 ${tab === x.key ? "border-blue-950 bg-white text-blue-950" : "border-transparent bg-gray-300 text-gray-700"}`}
              >
                {x.label}
              </button>
            ))}
          </div>
          {tab === "registrados" && (
            <button
              onClick={() => setOpen(true)}
              className="cursor-pointer rounded bg-blue-950 px-4 py-2 font-semibold text-white hover:bg-blue-900"
            >
              Agregar cargo previsto
            </button>
          )}
        </div>
        {loadError && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">{loadError}</p>}
        <Filters f={f} setF={setF} />
        <div className="overflow-x-auto rounded bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-blue-950 text-white">
              <tr>
                {[
                  "Fecha",
                  "Tipo",
                  "Proveedor / empleado",
                  "Base imponible",
                  "Importe total / neto nómina",
                  "Descripción",
                ].map((x) => (
                  <th key={x} className="p-3 text-left">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b hover:bg-blue-50">
                  <td className="p-3">{r.date}</td>
                  <td className="p-3">{r.kind === 'nomina' ? 'Nómina' : 'Proveedor'}</td>
                  <td className="p-3">{r.provider}</td>
                  <td className="p-3">{r.bi ? r.bi.toFixed(2) + " €" : "—"}</td>
                  <td className="p-3">{r.total.toFixed(2)} €</td>
                  <td className="p-3">{r.description || "—"}</td>
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-500">
                    No hay cargos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {open && (
          <Modal
            providers={providers}
            employees={employees}
            close={() => setOpen(false)}
            done={() => {
              setOpen(false);
              load();
            }}
          />
        )}
      </main>
    </div>
  );
}

function Filters({ f, setF }: { f: any; setF: (x: any) => void }) {
  return (
    <div className="mb-4 grid gap-3 rounded bg-white p-4 shadow md:grid-cols-6">
      <label className="text-sm font-medium">Tipo<select value={f.kind} onChange={event => setF({ ...f, kind: event.target.value })} className="mt-1 w-full cursor-pointer rounded border bg-white p-2 hover:border-blue-950"><option value="">Todos</option><option value="proveedor">Proveedor</option><option value="nomina">Nómina</option></select></label>
      {[
        ["bi", "Base imponible"],
        ["total", "Importe total / neto"],
        ["provider", "Proveedor / empleado"],
      ].map(([k, l]) => (
        <label key={k} className="text-sm font-medium">
          {l}
          <input
            value={f[k]}
            onChange={(e) => setF({ ...f, [k]: e.target.value })}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
      ))}
      <fieldset>
        <legend className="text-sm font-medium">Fecha</legend>
        <div className="mt-1 flex gap-1">
          <input
            aria-label="Día"
            placeholder="dd"
            value={f.day}
            onChange={(e) =>
              setF({ ...f, day: e.target.value.replace(/\D/g, "").slice(0, 2) })
            }
            className="w-12 rounded border p-2"
          />
          <input
            aria-label="Mes"
            placeholder="mm"
            value={f.month}
            onChange={(e) =>
              setF({
                ...f,
                month: e.target.value.replace(/\D/g, "").slice(0, 2),
              })
            }
            className="w-12 rounded border p-2"
          />
          <input
            aria-label="Año"
            placeholder="yyyy"
            value={f.year}
            onChange={(e) =>
              setF({
                ...f,
                year: e.target.value.replace(/\D/g, "").slice(0, 4),
              })
            }
            className="w-20 rounded border p-2"
          />
        </div>
      </fieldset>
      <label className="text-sm font-medium">
        Descripción
        <input
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          className="mt-1 w-full rounded border p-2"
        />
      </label>
    </div>
  );
}
