"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
type Tab = "registrados" | "pendientes";
type FRow = {
  day: string;
  month: string;
  bi: string;
  total: string;
  description: string;
  every: string;
  unit: string;
};
const blank = (): FRow => ({
  day: "",
  month: "",
  bi: "",
  total: "",
  description: "",
  every: "1",
  unit: "meses",
});
export default function Page() {
  const embedded = false;
  const [tab, setTab] = useState<Tab>("registrados"),
    [rec, setRec] = useState<any[]>([]),
    [lines, setLines] = useState<any[]>([]),
    [providers, setProviders] = useState<any[]>([]),
    [open, setOpen] = useState(false),
    [f, setF] = useState({
      bi: "",
      total: "",
      provider: "",
      day: "",
      month: "",
      year: "",
      description: "",
    });
  const load = useCallback(
    () =>
      Promise.all([
        fetch("/api/v1/direccion/cargos-recurrentes").then((r) => r.json()),
        fetch("/api/v1/direccion/bancos").then((r) => r.json()),
        fetch("/api/v1/admin/proveedores").then((r) => r.json()),
      ]).then(([a, b, c]) => {
        setRec(Array.isArray(a) ? a : []);
        setLines(Array.isArray(b) ? b : []);
        setProviders(Array.isArray(c) ? c : []);
      }),
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
              provider: r.nombre_proveedor || r.id_proveedor,
              date:
                r.tipo_programacion === "fechas"
                  ? `${String(p.dia).padStart(2, "0")}/${String(p.mes).padStart(2, "0")}`
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
              provider: l.nombre_proveedor || l.id_proveedor || "Sin asociar",
              date: l.fecha_valor,
              description: l.concepto,
              bank: l.banco,
            })),
    [lines, rec, tab],
  );
  const shown = rows.filter(
    (r) =>
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
        <Filters f={f} setF={setF} />
        <div className="overflow-x-auto rounded bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-blue-950 text-white">
              <tr>
                {[
                  "Fecha",
                  "Proveedor",
                  "Base imponible",
                  "Total con IVA",
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
                  <td className="p-3">{r.provider}</td>
                  <td className="p-3">{r.bi ? r.bi.toFixed(2) + " €" : "—"}</td>
                  <td className="p-3">{r.total.toFixed(2)} €</td>
                  <td className="p-3">{r.description || "—"}</td>
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-500">
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
    <div className="mb-4 grid gap-3 rounded bg-white p-4 shadow md:grid-cols-5">
      {[
        ["bi", "Base imponible"],
        ["total", "Total con IVA"],
        ["provider", "Proveedor"],
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
function Modal({
  providers,
  close,
  done,
}: {
  providers: any[];
  close: () => void;
  done: () => void;
}) {
  const [type, setType] = useState<"fechas" | "periodicidad">("fechas"),
    [withProvider, setWithProvider] = useState(true),
    [provider, setProvider] = useState(""),
    [search, setSearch] = useState(""),
    [rows, setRows] = useState<FRow[]>([blank()]),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) close();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [close, saving]);
  const list = providers
      .filter(
        (p) =>
          !search ||
          `${p.id_proveedor} ${p.nombre_proveedor} ${p.nombre_fiscal_proveedor}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      )
      .slice(0, 10),
    change = (i: number, k: keyof FRow, v: string) =>
      setRows((a) => a.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const save = async () => {
    setSaving(true);
    const programacion = rows.map((r) =>
        type === "fechas"
          ? {
              dia: +r.day,
              mes: +r.month,
              base_imponible: +r.bi,
              total_iva: +r.total,
              descripcion: r.description,
            }
          : {
              cada: +r.every,
              unidad: r.unit,
              base_imponible: +r.bi,
              total_iva: +r.total,
              descripcion: r.description,
            },
      ),
      res = await fetch("/api/v1/direccion/cargos-recurrentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_proveedor: withProvider ? provider : null,
          tipo_programacion: type,
          programacion,
        }),
      }),
      data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.message);
      return;
    }
    done();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6">
        <header className="mb-4 flex justify-between">
          <h2 className="text-xl font-semibold">Agregar cargo previsto</h2>
          <button
            onClick={close}
            className="cursor-pointer text-2xl hover:text-blue-900"
          >
            ×
          </button>
        </header>
        <div className="mb-4 flex items-center justify-between rounded border border-blue-200 bg-blue-50 p-3"><span className="text-sm font-semibold text-blue-950">{withProvider ? 'Con proveedor' : 'Crear sin asignar proveedor'}</span><button type="button" role="switch" aria-checked={!withProvider} onClick={() => { setWithProvider(current => !current); setProvider(''); }} className={`relative h-6 w-11 cursor-pointer rounded-full transition hover:ring-2 hover:ring-blue-200 ${withProvider ? 'bg-slate-400' : 'bg-blue-950'}`}><span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${withProvider ? '' : 'translate-x-5'}`} /></button></div>
        {withProvider && <><input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar proveedor"
          className="w-full rounded border p-2"
        />
        <div className="mt-2 max-h-36 overflow-y-auto border">
          {list.map((p) => (
            <button
              key={p.id_proveedor}
              onClick={() => setProvider(p.id_proveedor)}
              className={`flex w-full cursor-pointer justify-between border-b p-2 hover:bg-blue-50 ${provider === p.id_proveedor ? "bg-blue-100" : ""}`}
            >
              <span>{p.nombre_proveedor || p.nombre_fiscal_proveedor}</span>
              <span>{p.id_proveedor}</span>
            </button>
          ))}
        </div></>}
        <div className="my-4 flex gap-2">
          {(["fechas", "periodicidad"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`cursor-pointer rounded px-4 py-2 capitalize ${type === t ? "bg-blue-950 text-white" : "border hover:bg-gray-50"}`}
            >
              {t}
            </button>
          ))}
        </div>
        {rows.map((r, i) => (
          <div
            key={i}
            className="mb-2 grid gap-2 rounded border p-3 md:grid-cols-6"
          >
            {type === "fechas" ? (
              <>
                <input
                  placeholder="dd"
                  value={r.day}
                  onChange={(e) =>
                    change(
                      i,
                      "day",
                      e.target.value.replace(/\D/g, "").slice(0, 2),
                    )
                  }
                  className="rounded border p-2"
                />
                <input
                  placeholder="mm"
                  value={r.month}
                  onChange={(e) =>
                    change(
                      i,
                      "month",
                      e.target.value.replace(/\D/g, "").slice(0, 2),
                    )
                  }
                  className="rounded border p-2"
                />
              </>
            ) : (
              <>
                <input
                  type="number"
                  min="1"
                  value={r.every}
                  onChange={(e) => change(i, "every", e.target.value)}
                  className="rounded border p-2"
                />
                <select
                  value={r.unit}
                  onChange={(e) => change(i, "unit", e.target.value)}
                  className="cursor-pointer rounded border p-2"
                >
                  <option>días</option>
                  <option>semanas</option>
                  <option>meses</option>
                </select>
              </>
            )}
            <input
              type="number"
              value={r.bi}
              onChange={(e) => change(i, "bi", e.target.value)}
              placeholder="Base €"
              className="rounded border p-2"
            />
            <input
              type="number"
              value={r.total}
              onChange={(e) => change(i, "total", e.target.value)}
              placeholder="Total IVA €"
              className="rounded border p-2"
            />
            <input
              value={r.description}
              onChange={(e) => change(i, "description", e.target.value)}
              placeholder="Descripción"
              className="rounded border p-2"
            />
            <button
              disabled={rows.length === 1}
              onClick={() => setRows((a) => a.filter((_, j) => j !== i))}
              className="cursor-pointer rounded border text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Quitar
            </button>
          </div>
        ))}
        {error && <p className="bg-red-50 p-3 text-red-700">{error}</p>}
        <footer className="mt-5 flex justify-between">
          <button
            onClick={() => setRows((a) => [...a, blank()])}
            className="cursor-pointer rounded border px-4 py-2 hover:bg-gray-50"
          >
            Añadir fila
          </button>
          <div className="flex gap-2">
            <button
              onClick={close}
              className="cursor-pointer rounded border px-4 py-2 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              disabled={(withProvider && !provider) || saving}
              onClick={save}
              className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Guardar cargo previsto
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
