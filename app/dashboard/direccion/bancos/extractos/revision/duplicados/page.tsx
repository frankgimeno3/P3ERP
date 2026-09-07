"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
type Linea = {
  id_linea_banco: string;
  banco: string;
  fecha_operativa: string;
  concepto: string;
  importe: number;
};
export default function DuplicadosPage() {
  const router = useRouter(),
    [groups, setGroups] = useState<Linea[][]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      fetch("/api/v1/direccion/bancos/duplicados")
        .then((r) => r.json())
        .then((d) => setGroups(Array.isArray(d) ? d : []))
        .catch(() => setError("No se pudieron detectar duplicados")),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  const remove = async (body: any) => {
    try {
      setBusy(true);
      const r = await fetch("/api/v1/direccion/bancos/duplicados", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        d = await r.json();
      if (!r.ok) throw new Error(d.message);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const confirmNotDuplicate = async (group: Linea[]) => {
    try {
      setBusy(true);
      const response = await fetch('/api/v1/direccion/bancos/duplicados', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: group.map(row => row.id_linea_banco) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      await load();
    } catch (reason: any) { setError(reason.message || 'No se pudo confirmar el grupo'); } finally { setBusy(false); }
  };
  return (
    <main className="min-h-screen bg-gray-100 p-6 text-slate-900 lg:p-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Duplicados de líneas bancarias
          </h1>
          <p className="text-sm text-gray-500">
            Coincidencias por fecha operativa e importe.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/direccion/bancos/extractos/revision")
            }
            className="cursor-pointer rounded border bg-white px-4 py-2 transition hover:bg-gray-50"
          >
            ← Volver
          </button>
          <button
            type="button"
            disabled={!groups.length || busy}
            onClick={() => remove({ onePerGroup: true })}
            className="cursor-pointer rounded bg-red-700 px-4 py-2 font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            Eliminar uno de cada duplicado
          </button>
        </div>
      </div>
      {error && <p className="mb-4 bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="space-y-4">
        {groups.map((group, index) => (
          <section
            key={`${group[0].fecha_operativa}-${group[0].importe}`}
            className="rounded-xl border bg-white p-5 text-slate-900 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Grupo duplicado {index + 1}</h2><button type="button" disabled={busy} onClick={() => confirmNotDuplicate(group)} className="cursor-pointer rounded border border-green-700 bg-white px-3 py-2 text-sm font-semibold text-green-800 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40">Confirmar que no es duplicado</button></div>
            {group.map((row, i) => (
              <div
                key={row.id_linea_banco}
                className="mb-2 grid items-center gap-3 rounded border p-3 md:grid-cols-[130px_1fr_160px_130px_auto]"
              >
                <strong>DUPLICADO {i + 1}</strong>
                <span>{row.concepto}</span>
                <span>{row.fecha_operativa}</span>
                <span>{Number(row.importe).toFixed(2)} €</span>
                <button
                  type="button"
                  disabled={busy || group.length < 2}
                  onClick={() => remove({ id: row.id_linea_banco })}
                  className="cursor-pointer rounded border border-red-700 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Eliminar uno
                </button>
              </div>
            ))}
          </section>
        ))}
        {!groups.length && (
          <div className="rounded bg-white p-10 text-center text-gray-500">
            No se han encontrado duplicados.
          </div>
        )}
      </div>
    </main>
  );
}
