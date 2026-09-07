"use client";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
type ProgramRow = {
  day: string;
  month: string;
  bi: string;
  total: string;
  description: string;
  every: string;
  unit: "días" | "semanas" | "meses";
};
const blank = (): ProgramRow => ({
  day: "",
  month: "",
  bi: "",
  total: "",
  description: "",
  every: "1",
  unit: "meses",
});
const money = (v: any) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    Number(v || 0),
  );
const recurringMatches = (line: any, rows: any[]) =>
  (rows || []).filter(
    (r) =>
      r.tipo_programacion === "fechas" &&
      (r.programacion || []).some(
        (p: any) =>
          `${String(p.dia).padStart(2, "0")}/${String(p.mes).padStart(2, "0")}` ===
            String(line.fecha_valor).slice(0, 5) &&
          Math.abs(Number(p.total_iva) - Math.abs(Number(line.importe))) < 0.01,
      ),
  );
export default function ReviewDetail({
  params,
}: {
  params: Promise<{ id_linea_banco: string }>;
}) {
  const { id_linea_banco } = use(params),
    router = useRouter();
  const [line, setLine] = useState<any>(null),
    [all, setAll] = useState<any[]>([]),
    [providers, setProviders] = useState<any[]>([]),
    [accounts, setAccounts] = useState<any[]>([]),
    [agents, setAgents] = useState<any[]>([]),
    [forecasts, setForecasts] = useState<any[]>([]),
    [orders, setOrders] = useState<any[]>([]),
    [recurring, setRecurring] = useState<any[]>([]),
    [phase, setPhase] = useState<number | null>(null),
    [entityType, setEntityType] = useState<"proveedor" | "cliente" | "nomina">(
      "proveedor",
    ),
    [entitySearch, setEntitySearch] = useState(""),
    [selectedEntity, setSelectedEntity] = useState(""),
    [selectedOrder, setSelectedOrder] = useState(""),
    [selectedRecurring, setSelectedRecurring] = useState<number | null>(null),
    [programType, setProgramType] = useState<"fechas" | "periodicidad">(
      "fechas",
    ),
    [programRows, setProgramRows] = useState<ProgramRow[]>([blank()]),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    Promise.all([
      fetch(
        `/api/v1/direccion/bancos/${encodeURIComponent(id_linea_banco)}`,
      ).then((r) => r.json()),
      fetch("/api/v1/direccion/bancos").then((r) => r.json()),
      fetch("/api/v1/admin/proveedores").then((r) => r.json()),
      fetch("/api/v1/comercial/cuentas").then((r) => r.json()),
      fetch("/api/v1/admin/agentes").then((r) => r.json()),
      fetch("/api/v1/direccion/prevision-gastos").then((r) => r.json()),
      fetch("/api/v1/admin/control-administrativo/ordenes").then((r) =>
        r.json(),
      ),
      fetch("/api/v1/direccion/cargos-recurrentes").then((r) => r.json()),
    ])
      .then(([l, a, p, c, ag, f, o, cr]) => {
        const forecastRows = Array.isArray(f) ? f : [],
          orderRows = Array.isArray(o) ? o : [],
          recurringRows = Array.isArray(cr) ? cr : [];
        setLine(l);
        setAll(Array.isArray(a) ? a : []);
        setProviders(Array.isArray(p) ? p : []);
        setAccounts(Array.isArray(c) ? c : []);
        setAgents(Array.isArray(ag) ? ag : []);
        setForecasts(forecastRows);
        setOrders(orderRows);
        setRecurring(recurringRows);
        const amount = Math.abs(Number(l.importe)),
          isCharge = Number(l.importe) < 0;
        const matches = isCharge
          ? [
              ...forecastRows.filter(
                (x: any) =>
                  String(x.fecha_pago) === l.fecha_valor &&
                  Math.abs(Number(x.total_pago) - amount) < 0.01,
              ),
              ...recurringMatches(l, recurringRows),
            ]
          : orderRows.filter(
              (x: any) =>
                String(x.fecha_teorica_cobro) === l.fecha_valor &&
                Math.abs(Number(x.cobro_total) - amount) < 0.01,
            );
        setPhase(matches.length ? 0 : 1);
      })
      .catch(() => setError("No se pudo cargar la revisión"));
  }, [id_linea_banco]);
  const isCharge = Number(line?.importe) < 0;
  const exactMatches = useMemo(
    () =>
      !line
        ? []
        : isCharge
          ? [
              ...forecasts.filter(
                (x: any) =>
                  String(x.fecha_pago) === line.fecha_valor &&
                  Math.abs(
                    Number(x.total_pago) - Math.abs(Number(line.importe)),
                  ) < 0.01,
              ),
              ...recurringMatches(line, recurring),
            ]
          : orders.filter(
              (x: any) =>
                String(x.fecha_teorica_cobro) === line.fecha_valor &&
                Math.abs(
                  Number(x.cobro_total) - Math.abs(Number(line.importe)),
                ) < 0.01,
            ),
    [forecasts, isCharge, line, orders, recurring],
  );
  const duplicates = all.filter(
    (x) =>
      x.id_linea_banco !== id_linea_banco &&
      x.fecha_operativa === line?.fecha_operativa &&
      Number(x.importe) === Number(line?.importe),
  );
  const warnings = all.filter(
    (x) =>
      x.id_linea_banco !== id_linea_banco &&
      ((x.fecha_operativa === line?.fecha_operativa &&
        Number(x.importe) !== Number(line?.importe)) ||
        (x.concepto === line?.concepto &&
          x.fecha_operativa?.slice(3) === line?.fecha_operativa?.slice(3))),
  );
  const entities = (entityType === "proveedor" ? providers : entityType === "cliente" ? accounts : agents)
    .map((x: any) =>
      entityType === "proveedor"
        ? {
            id: x.id_proveedor,
            name: x.nombre_proveedor || x.nombre_fiscal_proveedor,
          }
        : entityType === "cliente" ? { id: x.id_cuenta, name: x.nombre_empresa || x.nombre_fiscal } : { id: x.id_agente, name: x.nombre_completo_agente || `${x.nombre_agente || ''} ${x.apellidos_agente || ''}`.trim() },
    )
    .filter(
      (x: any) =>
        !entitySearch ||
        `${x.id} ${x.name}`.toLowerCase().includes(entitySearch.toLowerCase()),
    )
    .slice(0, 12);
  const orderShown = orders
    .filter(
      (o: any) =>
        !entitySearch ||
        Object.values(o)
          .join(" ")
          .toLowerCase()
          .includes(entitySearch.toLowerCase()),
    )
    .slice(0, 20);
  const update = async (
    extra: any,
    review = false,
    destination = "/dashboard/direccion/bancos/extractos/revision",
  ) => {
    setSaving(true);
    setError("");
    try {
      const r = await fetch(
          `/api/v1/direccion/bancos/${encodeURIComponent(id_linea_banco)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              estado_revision: review,
              comentarios: line.comentarios || "",
              ...extra,
            }),
          },
        ),
        d = await r.json();
      if (!r.ok) throw new Error(d.message);
      router.push(destination);
    } catch (e: any) {
      setError(e.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };
  const confirmMatch = (x: any) =>
    update(
      isCharge
        ? x.id_cargo_recurrente
          ? {
              id_cargo_recurrente: x.id_cargo_recurrente,
              id_proveedor: x.id_proveedor,
            }
          : { id_pago: x.id_pago, id_proveedor: x.id_proveedor }
        : { id_orden: x.id_orden },
      true,
    );
  const removeDuplicate = async (id: string) => {
    await fetch("/api/v1/direccion/bancos/duplicados", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.push("/dashboard/direccion/bancos/extractos/revision");
  };
  const createRecurring = async () => {
    if (!selectedEntity || entityType !== "proveedor") {
      setError("Selecciona un proveedor en la fase 2");
      return;
    }
    setSaving(true);
    const programacion = programRows.map((r) =>
      programType === "fechas"
        ? {
            dia: Number(r.day),
            mes: Number(r.month),
            base_imponible: Number(r.bi),
            total_iva: Number(r.total),
            descripcion: r.description,
          }
        : {
            cada: Number(r.every),
            unidad: r.unit,
            base_imponible: Number(r.bi),
            total_iva: Number(r.total),
            descripcion: r.description,
          },
    );
    const response = await fetch("/api/v1/direccion/cargos-recurrentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_proveedor: selectedEntity,
          tipo_programacion: programType,
          programacion,
        }),
      }),
      data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.message);
      return;
    }
    setRecurring([data, ...recurring]);
    setSelectedRecurring(Number(data.id_cargo_recurrente));
    setPhase(5);
  };
  if (!line || phase === null)
    return (
      <main className="min-h-screen bg-gray-100 p-12">
        {error || "Cargando revisión…"}
      </main>
    );
  const phases = [0, 1, 2, 3, 4, 5].filter(
    (p) => (p !== 0 || exactMatches.length) && (p !== 4 || isCharge),
  );
  return (
    <main className="min-h-screen bg-gray-100 p-6 lg:p-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Revisar línea</h1>
            <p className="text-sm text-gray-500">{line.id_linea_banco}</p>
          </div>
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/direccion/bancos/extractos/revision")
            }
            className="cursor-pointer rounded border bg-white px-4 py-2 transition hover:bg-gray-50"
          >
            × Cerrar
          </button>
        </header>
        <div className="mb-5 flex flex-wrap gap-2">
          {phases.map((p) => (
            <span
              key={p}
              className={`rounded px-3 py-1 text-xs ${phase === p ? "bg-blue-950 text-white" : "bg-white text-gray-500"}`}
            >
              Fase {p}
            </span>
          ))}
        </div>
        {error && (
          <p className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>
        )}
        <section className="mb-5 grid gap-3 rounded-xl bg-white p-5 shadow-sm md:grid-cols-4">
          <div>
            <small>Fecha valor</small>
            <p>{line.fecha_valor}</p>
          </div>
          <div>
            <small>Importe</small>
            <p className="font-semibold">{money(line.importe)}</p>
          </div>
          <div className="md:col-span-2">
            <small>Concepto</small>
            <p>{line.concepto}</p>
          </div>
        </section>
        {phase === 0 && (
          <Panel title="Coincidencias con previsiones">
            <p className="mb-4 text-sm text-gray-600">
              ¿Corresponde esta línea a alguna de estas previsiones?
            </p>
            {exactMatches.map((x: any) => (
              <div
                key={x.id_pago || x.id_orden || x.id_cargo_recurrente}
                className="mb-2 flex items-center justify-between rounded border p-3"
              >
                <span>
                  {x.nombre_proveedor ||
                    x.cliente ||
                    x.nombre_planificacion ||
                    x.id_pago ||
                    x.id_orden ||
                    `Cargo recurrente ${x.id_cargo_recurrente}`}{" "}
                  ·{" "}
                  {money(
                    x.id_cargo_recurrente
                      ? Math.abs(Number(line.importe))
                      : isCharge
                        ? x.total_pago
                        : x.cobro_total,
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => confirmMatch(x)}
                  className="cursor-pointer rounded bg-green-700 px-3 py-2 text-sm text-white hover:bg-green-800"
                >
                  Sí, corresponde
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPhase(1)}
              className="mt-3 cursor-pointer rounded border px-4 py-2 hover:bg-gray-50"
            >
              No corresponde
            </button>
          </Panel>
        )}
        {phase === 1 && (
          <Panel title="Duplicados y avisos">
            {duplicates.length ? (
              <div>
                <p className="mb-2 font-medium text-red-700">
                  Se encontraron posibles duplicados:
                </p>
                {duplicates.map((d) => (
                  <div
                    key={d.id_linea_banco}
                    className="mb-2 flex justify-between rounded border border-red-200 p-3"
                  >
                    <span>
                      {d.id_linea_banco} · {d.concepto}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDuplicate(d.id_linea_banco)}
                      className="cursor-pointer rounded border border-red-700 px-3 py-1 text-red-700 hover:bg-red-50"
                    >
                      Eliminar una
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded bg-green-50 p-3 text-green-800">
                No se han encontrado duplicados con la misma fecha e importe.
              </p>
            )}
            <div className="mt-4">
              <h3 className="font-medium">Avisos</h3>
              {warnings.length ? (
                warnings.map((w) => (
                  <div
                    key={w.id_linea_banco}
                    className="mt-2 grid gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm md:grid-cols-6"
                  >
                    <strong className="md:col-span-6">{w.fecha_operativa === line.fecha_operativa
                      ? "Misma fecha con otro importe"
                      : "Mismo concepto en el mismo mes"}</strong>
                    <span><small className="block text-amber-800">ID</small>{w.id_linea_banco}</span><span><small className="block text-amber-800">Banco</small>{w.banco}</span><span><small className="block text-amber-800">Fecha operativa</small>{w.fecha_operativa}</span><span><small className="block text-amber-800">Fecha valor</small>{w.fecha_valor}</span><span><small className="block text-amber-800">Importe</small>{money(w.importe)}</span><span><small className="block text-amber-800">Saldo</small>{money(w.saldo)}</span><span className="md:col-span-6"><small className="block text-amber-800">Concepto</small>{w.concepto}</span>
                  </div>
                ))
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  Sin coincidencias adicionales.
                </p>
              )}
            </div>
            <Next onClick={() => setPhase(2)} />
          </Panel>
        )}
        {phase === 2 && (
          <Panel title="Asignar proveedor, cliente o nómina">
            <label className="text-sm font-medium">
              Tipo
              <select
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value as any);
                  setSelectedEntity("");
                }}
                className="mt-1 w-full cursor-pointer rounded border bg-white p-2"
              >
                <option value="proveedor">Proveedor</option>
                <option value="cliente">Cliente</option>
                <option value="nomina">Nómina</option>
              </select>
            </label>
            <input
              value={entitySearch}
              onChange={(e) => setEntitySearch(e.target.value)}
              placeholder="Buscar por ID o nombre"
              className="mt-3 w-full rounded border p-2"
            />
            <div className="mt-2 max-h-64 overflow-y-auto border">
              {entities.map((e: any) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedEntity(e.id)}
                  className={`flex w-full cursor-pointer justify-between border-b p-2 text-left hover:bg-blue-50 ${selectedEntity === e.id ? "bg-blue-100" : ""}`}
                >
                  <span>{e.name}</span>
                  <span>{e.id}</span>
                </button>
              ))}
            </div>
            <div className="mt-3"><button type="button" onClick={() => router.push(entityType === 'proveedor' ? '/dashboard/administracion/proveedores' : entityType === 'cliente' ? '/dashboard/comercial/cuentas/crear' : '/dashboard/operaciones/agentesyroles')} className="cursor-pointer rounded border border-blue-950 px-4 py-2 text-sm font-semibold text-blue-950 transition hover:bg-blue-50">{entityType === 'proveedor' ? 'Crear proveedor' : entityType === 'cliente' ? 'Crear cuenta' : 'Crear agente'}</button></div>
            <Next disabled={!selectedEntity} onClick={() => setPhase(3)} />
          </Panel>
        )}
        {phase === 3 && (
          <Panel title={isCharge ? "Cargo recurrente" : "Asociar una orden"}>
            {isCharge ? (
              <>
                <p className="text-sm">
                  Selecciona un cargo recurrente existente, crea uno nuevo o
                  continúa sin asociarlo.
                </p>
                <div className="mt-3 max-h-64 overflow-y-auto rounded border">
                  {recurring.length === 0 ? <p className="p-5 text-center text-sm text-slate-600">No hay cargos recurrentes registrados.</p> : <table className="w-full text-sm"><thead className="bg-slate-800 text-left text-white"><tr><th className="p-2">Proveedor</th><th className="p-2">Tipo</th><th className="p-2">Programación</th><th className="p-2">Acción</th></tr></thead><tbody>{recurring.map((r: any) => (
                    <tr
                      key={r.id_cargo_recurrente}
                      className="border-t border-slate-200"
                    >
                      <td className="p-2">{r.nombre_proveedor || r.id_proveedor}</td><td className="p-2">{r.tipo_programacion}</td><td className="p-2">{(r.programacion || []).length} línea(s)</td><td className="p-2"><button type="button" onClick={() => { setSelectedRecurring(Number(r.id_cargo_recurrente)); setPhase(5); }} className="cursor-pointer rounded border px-3 py-1 hover:bg-blue-50">Seleccionar</button></td>
                    </tr>
                  ))}</tbody></table>}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPhase(5)}
                    className="cursor-pointer rounded border px-4 py-2 hover:bg-gray-50"
                  >
                    No crear recurrente
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhase(4)}
                    className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-900"
                  >
                    Crear uno
                  </button>
                </div>
              </>
            ) : (
              <>
                <input
                  value={entitySearch}
                  onChange={(e) => setEntitySearch(e.target.value)}
                  placeholder="Buscar orden, cliente, contrato o factura"
                  className="w-full rounded border p-2"
                />
                <div className="mt-2 max-h-80 overflow-y-auto">
                  {orderShown.map((o: any) => (
                    <button
                      key={o.id_orden}
                      type="button"
                      onClick={() => {
                        setSelectedOrder(o.id_orden);
                        setPhase(5);
                      }}
                      className="mb-2 grid w-full cursor-pointer grid-cols-6 gap-2 rounded border p-3 text-left text-sm hover:bg-blue-50"
                    >
                      <span>{o.cliente}</span>
                      <span>{o.id_contrato}</span>
                      <span>{o.id_factura || "—"}</span>
                      <span>{o.fecha_teorica_cobro}</span>
                      <span>{o.forma_cobro}</span>
                      <span>{o.banco_cobro}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </Panel>
        )}
        {phase === 4 && (
          <Panel title="Crear cargo recurrente">
            <div className="mb-4 flex gap-2">
              {(["fechas", "periodicidad"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setProgramType(t)}
                  className={`cursor-pointer rounded px-4 py-2 capitalize ${programType === t ? "bg-blue-950 text-white" : "border hover:bg-gray-50"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {programRows.map((r, i) => (
              <div
                key={i}
                className="mb-3 grid gap-2 rounded border p-3 md:grid-cols-6"
              >
                {programType === "fechas" ? (
                  <>
                    <input
                      placeholder="dd"
                      value={r.day}
                      onChange={(e) =>
                        setProgramRows((x) =>
                          x.map((v, j) =>
                            j === i
                              ? {
                                  ...v,
                                  day: e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 2),
                                }
                              : v,
                          ),
                        )
                      }
                      className="rounded border p-2"
                    />
                    <input
                      placeholder="mm"
                      value={r.month}
                      onChange={(e) =>
                        setProgramRows((x) =>
                          x.map((v, j) =>
                            j === i
                              ? {
                                  ...v,
                                  month: e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 2),
                                }
                              : v,
                          ),
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
                      onChange={(e) =>
                        setProgramRows((x) =>
                          x.map((v, j) =>
                            j === i ? { ...v, every: e.target.value } : v,
                          ),
                        )
                      }
                      className="rounded border p-2"
                    />
                    <select
                      value={r.unit}
                      onChange={(e) =>
                        setProgramRows((x) =>
                          x.map((v, j) =>
                            j === i ? { ...v, unit: e.target.value as any } : v,
                          ),
                        )
                      }
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
                  placeholder="Base imponible €"
                  value={r.bi}
                  onChange={(e) =>
                    setProgramRows((x) =>
                      x.map((v, j) =>
                        j === i ? { ...v, bi: e.target.value } : v,
                      ),
                    )
                  }
                  className="rounded border p-2"
                />
                <input
                  type="number"
                  placeholder="Total IVA €"
                  value={r.total}
                  onChange={(e) =>
                    setProgramRows((x) =>
                      x.map((v, j) =>
                        j === i ? { ...v, total: e.target.value } : v,
                      ),
                    )
                  }
                  className="rounded border p-2"
                />
                <input
                  placeholder="Descripción"
                  value={r.description}
                  onChange={(e) =>
                    setProgramRows((x) =>
                      x.map((v, j) =>
                        j === i ? { ...v, description: e.target.value } : v,
                      ),
                    )
                  }
                  className="rounded border p-2"
                />
                <button
                  type="button"
                  disabled={programRows.length === 1}
                  onClick={() =>
                    setProgramRows((x) => x.filter((_, j) => j !== i))
                  }
                  className="cursor-pointer rounded border text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Quitar
                </button>
              </div>
            ))}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setProgramRows((x) => [...x, blank()])}
                className="cursor-pointer rounded border px-4 py-2 hover:bg-gray-50"
              >
                Añadir fila
              </button>
              <button
                type="button"
                onClick={createRecurring}
                disabled={saving}
                className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-900 disabled:cursor-not-allowed"
              >
                Crear y continuar
              </button>
            </div>
          </Panel>
        )}
        {phase === 5 && (
          <Panel title="Revisión final">
            <dl className="grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-xs text-gray-500">Asignación</dt>
                <dd>
                  {selectedEntity ||
                    line.id_proveedor ||
                    line.id_cuenta ||
                    "Sin asignar"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Orden</dt>
                <dd>{selectedOrder || "Sin orden"}</dd>
              </div>
              {isCharge && <div><dt className="text-xs text-gray-500">Cargo recurrente</dt><dd>{selectedRecurring ? `#${selectedRecurring}` : 'Sin cargo recurrente'}</dd></div>}
              <div>
                <dt className="text-xs text-gray-500">Estado final</dt>
                <dd>Revisado</dd>
              </div>
              {programRows.some(row => row.bi || row.total || row.description) && <div className="md:col-span-2"><dt className="text-xs text-gray-500">Líneas creadas en la fase 4</dt><dd className="mt-2 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-800 text-left text-white"><tr><th className="p-2">Programación</th><th className="p-2">Base imponible</th><th className="p-2">Total IVA</th><th className="p-2">Descripción</th></tr></thead><tbody>{programRows.map((row, index) => <tr key={index} className="border-t"><td className="p-2">{programType === 'fechas' ? `${row.day}/${row.month}` : `Cada ${row.every} ${row.unit}`}</td><td className="p-2">{money(row.bi)}</td><td className="p-2">{money(row.total)}</td><td className="p-2">{row.description || '—'}</td></tr>)}</tbody></table></dd></div>}
            </dl>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  update(
                    entityType === "proveedor"
                      ? {
                          id_proveedor: selectedEntity || line.id_proveedor,
                          id_cuenta: null,
                          id_agente: null,
                          id_orden: selectedOrder || null,
                          id_cargo_recurrente: selectedRecurring,
                        }
                      : entityType === "cliente" ? {
                          id_cuenta: selectedEntity || line.id_cuenta,
                          id_proveedor: null,
                          id_agente: null,
                          id_orden: selectedOrder || null,
                          id_cargo_recurrente: null,
                        } : { id_agente: selectedEntity || line.id_agente, id_proveedor: null, id_cuenta: null, id_orden: selectedOrder || null, id_cargo_recurrente: null },
                    true,
                    "/dashboard/direccion/bancos/extractos",
                  )
                }
                className="cursor-pointer rounded bg-green-700 px-5 py-2 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed"
              >
                Confirmar y marcar como revisado
              </button>
            </div>
          </Panel>
        )}
      </div>
    </main>
  );
}
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-blue-950">{title}</h2>
      {children}
    </section>
  );
}
function Next({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-5 flex justify-end">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        Continuar
      </button>
    </div>
  );
}
