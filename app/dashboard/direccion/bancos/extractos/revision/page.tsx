"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Banco = "Sabadell" | "Santander";
type Linea = {
  id_linea_banco: string;
  banco: Banco;
  fecha_valor: string;
  concepto: string;
  importe: number;
  estado_revision: boolean;
  id_proveedor?: string;
  nombre_proveedor?: string;
  id_cuenta?: string;
  nombre_cuenta?: string;
  id_agente?: string;
  nombre_agente?: string;
};
type Entity = { id: string; name: string };
const formatMoney = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    v,
  );

export default function RevisionLineasPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Linea[]>([]),
    [bank, setBank] = useState<Banco>("Sabadell"),
    [selected, setSelected] = useState<string[]>([]),
    [query, setQuery] = useState(""),
    [type, setType] = useState(""),
    [modal, setModal] = useState(false),
    [entityType, setEntityType] = useState<"proveedor" | "cliente">(
      "proveedor",
    ),
    [entities, setEntities] = useState<Entity[]>([]),
    [entityQuery, setEntityQuery] = useState(""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [chosenEntity, setChosenEntity] = useState<Entity | null>(null);
  const [assignmentStep, setAssignmentStep] = useState<1 | 2>(1);
  const [validation, setValidation] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [assignmentError, setAssignmentError] = useState("");
  const load = useCallback(
    () =>
      fetch("/api/v1/direccion/bancos")
        .then((r) => r.json())
        .then((d) => setRows(Array.isArray(d) ? d : []))
        .catch(() => setError("No se pudieron cargar las líneas")),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!modal) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [modal]);
  useEffect(() => {
    if (!modal) return;
    const url =
      entityType === "proveedor"
        ? "/api/v1/admin/proveedores"
        : "/api/v1/comercial/cuentas";
    const controller = new AbortController();
    setEntities([]);
    fetch(url, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error("No se pudo cargar la lista"); return r.json(); })
      .then((data) =>
        setEntities(
          (Array.isArray(data) ? data : []).map((x: any) =>
            entityType === "proveedor"
              ? {
                  id: x.id_proveedor,
                  name:
                    x.nombre_proveedor ||
                    x.nombre_fiscal_proveedor ||
                    x.id_proveedor,
                }
              : {
                  id: x.id_cuenta,
                  name: x.nombre_empresa || x.nombre_fiscal || x.id_cuenta,
                },
          ),
        ),
      ).catch((e) => { if (e.name !== "AbortError") setAssignmentError(e.message); });
    return () => controller.abort();
  }, [entityType, modal]);
  useEffect(() => {
    if (!modal || assignmentStep !== 2 || !chosenEntity) return;
    const controller = new AbortController();
    setValidation("checking");
    setAssignmentError("");
    fetch("/api/v1/direccion/bancos/revision", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ ids: selected, action: "validate-assignment", entityType, entityId: chosenEntity.id }),
    }).then(async response => {
      const data = await response.json();
      if (!response.ok || data.ok !== true) throw new Error(data.message || "No se pudo validar la asignación");
      setValidation("ok");
    }).catch(e => {
      if (e.name === "AbortError") return;
      setValidation("error");
      setAssignmentError(e.message || "No se pudo validar la asignación");
    });
    return () => controller.abort();
  }, [modal, assignmentStep, chosenEntity, entityType, selected]);
  const shown = useMemo(
    () =>
      rows
        .filter((r) => r.banco === bank)
        .filter(
          (r) =>
            !query.trim() ||
            r.concepto.toLowerCase().includes(query.toLowerCase()),
        )
        .filter(
          (r) => !type || (type === "ingreso" ? r.importe > 0 : r.importe < 0),
        ),
    [bank, query, rows, type],
  );
  const candidates = entities
    .filter(
      (e) =>
        !entityQuery.trim() ||
        `${e.id} ${e.name}`.toLowerCase().includes(entityQuery.toLowerCase()),
    )
    .slice(0, 15);
  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  const action = async (payload: any) => {
    try {
      setSaving(true);
      setError("");
      const response = await fetch("/api/v1/direccion/bancos/revision", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, ...payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setSelected([]);
      setModal(false);
      await load();
    } catch (e: any) {
      if (payload.action === "assign") {
        setValidation("error");
        setAssignmentError(e.message || "No se pudo actualizar la selección");
      }
      setError(e.message || "No se pudo actualizar la selección");
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="min-h-screen bg-gray-100 px-6 py-8 text-slate-900 lg:px-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Revisión de líneas
          </h1>
          <p className="text-sm text-gray-500">
            Asigna movimientos y controla su revisión.
          </p>
          <p className="mt-2 text-sm font-semibold text-amber-800" role="status">
            Pendientes de revisar: {rows.filter(row => row.banco === bank && !row.estado_revision).length} en {bank}
            {" · "}{rows.filter(row => !row.estado_revision).length} entre ambos bancos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selected.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => {
                  setChosenEntity(null);
                  setAssignmentStep(1);
                  setValidation("idle");
                  setAssignmentError("");
                  setEntityQuery("");
                  setModal(true);
                }}
                className="cursor-pointer rounded border border-blue-950 bg-white px-4 py-2 text-sm font-medium text-blue-950 transition hover:bg-blue-50"
              >
                Asignar a proveedor o cliente común
              </button>
              <button
                type="button"
                onClick={() => action({ action: "review" })}
                className="cursor-pointer rounded bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800"
              >
                Marcar selección como revisados
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/direccion/bancos/extractos/revision/duplicados",
              )
            }
            className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-900"
          >
            Detectar duplicados
          </button>
        </div>
      </div>
      {error && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex border-b bg-white px-4 pt-2">
        {(["Sabadell", "Santander"] as Banco[]).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => {
              setBank(b);
              setSelected([]);
            }}
            className={`cursor-pointer border-b-2 px-6 py-3 font-semibold transition hover:bg-blue-50 ${bank === b ? "border-blue-950 text-blue-950" : "border-transparent text-gray-500"}`}
          >
            {b}
          </button>
        ))}
      </div>
      <div className="grid gap-3 bg-white p-4 text-slate-900 sm:grid-cols-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar por concepto"
          className="rounded border px-3 py-2"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="cursor-pointer rounded border bg-white px-3 py-2 transition hover:border-blue-950"
        >
          <option value="">Ingresos y cargos</option>
          <option value="ingreso">Ingresos</option>
          <option value="cargo">Cargos</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-b bg-white text-slate-900 shadow">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="w-12 p-3">
                <span className="sr-only">Seleccionar</span>
              </th>
              <th className="w-[14%] p-3 text-left">F. valor</th>
              <th className="p-3 text-left">Concepto</th>
              <th className="w-[13%] p-3 text-right">Importe</th>
              <th className="w-[25%] p-3 text-left">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr
                key={row.id_linea_banco}
                onClick={() =>
                  router.push(
                    row.estado_revision ? `/dashboard/direccion/bancos/extractos/${encodeURIComponent(row.id_linea_banco)}` : `/dashboard/direccion/bancos/extractos/revision/${encodeURIComponent(row.id_linea_banco)}`,
                  )
                }
                className={`cursor-pointer border-t transition hover:bg-blue-50 ${row.estado_revision ? "bg-green-50" : "bg-white"}`}
              >
                <td
                  className="p-3 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(row.id_linea_banco)}
                    onChange={() => toggle(row.id_linea_banco)}
                    className="cursor-pointer"
                    aria-label={`Seleccionar ${row.concepto}`}
                  />
                </td>
                <td className="p-3">{row.fecha_valor}</td>
                <td className="p-3">{row.concepto}</td>
                <td className="p-3 text-right">{formatMoney(row.importe)}</td>
                <td className="p-3">
                  {row.id_agente ? `Nómina · ${row.nombre_agente || row.id_agente}` : row.nombre_proveedor ||
                    row.nombre_cuenta ||
                    row.id_proveedor ||
                    row.id_cuenta || (
                      <span className="text-amber-700">Sin asignar</span>
                    )}
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-gray-500">
                  No hay líneas para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <section
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl"
          >
            <header className="mb-5 flex justify-between">
              <div>
                <h2 className="text-xl font-semibold">Asignación común</h2>
                <p className="text-sm text-gray-500">
                  Se aplicará a {selected.length} líneas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModal(false)}
                aria-label="Cerrar"
                className="cursor-pointer text-2xl text-gray-500 transition hover:text-gray-900"
              >
                ×
              </button>
            </header>
            <p className="mb-4 text-sm font-semibold text-blue-950">{assignmentStep === 1 ? "1. Selecciona un proveedor o cliente" : "2. Comprueba y confirma la asignación"}</p>
            {assignmentStep === 1 && <>
            <label className="text-sm font-medium">
              Asignar a
              <select
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value as any);
                  setEntityQuery("");
                  setChosenEntity(null);
                  setEntities([]);
                  setAssignmentError("");
                }}
                className="mt-1 w-full cursor-pointer rounded border bg-white px-3 py-2 hover:border-blue-950"
              >
                <option value="proveedor">Proveedor</option>
                <option value="cliente">Cliente</option>
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium">
              Buscar
              <input
                value={entityQuery}
                onChange={(e) => setEntityQuery(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
                placeholder={`Buscar ${entityType}`}
              />
            </label>
            <div className="mt-2 max-h-72 overflow-y-auto rounded border">
              {candidates.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => setChosenEntity(entity)}
                  aria-pressed={chosenEntity?.id === entity.id}
                  className={`flex w-full cursor-pointer justify-between border-b p-3 text-left text-sm transition ${chosenEntity?.id === entity.id ? "bg-blue-950 text-white hover:bg-blue-900" : "hover:bg-blue-50"}`}
                >
                  <span>{entity.name}</span>
                  <span>{entity.id}</span>
                </button>
              ))}
            </div>
            </>}
            {chosenEntity && <p className="mt-3 text-sm">Seleccionado: <strong>{chosenEntity.name}</strong> ({chosenEntity.id})</p>}
            {assignmentStep === 2 && <div aria-live="polite" className="mt-4">
              {validation === "checking" && <p>Comprobando las líneas seleccionadas…</p>}
              {validation === "ok" && <p className="rounded border border-green-200 bg-green-50 p-3 text-green-800">Todo correcto. Las {selected.length} líneas están libres y puedes confirmar la asignación.</p>}
            </div>}
            {assignmentError && <p role="alert" className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{assignmentError}</p>}
            <footer className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="cursor-pointer rounded border px-4 py-2 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              {assignmentStep === 1 ? <button type="button" disabled={!chosenEntity} onClick={() => { setValidation("checking"); setAssignmentStep(2); }} className="rounded bg-blue-950 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">Continuar</button> : <>
                <button type="button" disabled={saving} onClick={() => { setAssignmentStep(1); setValidation("idle"); setAssignmentError(""); }} className="rounded border px-4 py-2 enabled:cursor-pointer enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Volver</button>
                <button type="button" disabled={validation !== "ok" || saving} onClick={() => { if (validation === "ok" && chosenEntity && !saving) action({ action: "assign", entityType, entityId: chosenEntity.id }); }} className="rounded bg-blue-950 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Asignando…" : "Confirmar asignación"}</button>
              </>}
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
