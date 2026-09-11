"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BankReviewWizard from "../../BankReviewWizard";

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
const formatMoney = (v: number) => Number(v).toLocaleString('es-ES', {style:'currency',currency:'EUR'});
export default function RevisionLineasPage() {
  const router = useRouter();
  const [rows,setRows] = useState<Linea[]>([]), [bank,setBank] = useState<Banco>('Sabadell'), [selected,setSelected] = useState<string[]>([]), [query,setQuery] = useState(''), [type,setType] = useState(''), [assigned,setAssigned] = useState(''), [error,setError] = useState('');
  const [mode,setMode] = useState<'review'|'assign'|'charge'|null>(null), [unreview,setUnreview] = useState(false), [saving,setSaving] = useState(false);
  const load = useCallback(async () => {try {const r=await fetch('/api/v1/direccion/bancos',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.message);setRows(d);}catch(e:any){setError(e.message);}},[]);
  useEffect(() => {void load();},[load]);
  useEffect(() => {const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setUnreview(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[]);
  const selectedRows=rows.filter(r=>selected.includes(r.id_linea_banco));
  const allReviewed=selectedRows.length>0&&selectedRows.every(r=>r.estado_revision);
  const shown=useMemo(()=>rows.filter(r=>r.banco===bank&&(!query.trim()||r.concepto.toLowerCase().includes(query.toLowerCase()))&&(!type||(type==='ingreso'?r.importe>0:r.importe<0))&&(!assigned||(assigned==='yes'?!!r.id_proveedor:!r.id_proveedor))),[rows,bank,query,type,assigned]);
  const toggle=(id:string)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const saved=()=>{setMode(null);setSelected([]);void load();};
  const markUnreviewed=async()=>{setSaving(true);try{const r=await fetch('/api/v1/direccion/bancos/revision',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'unreview',ids:selected})});const d=await r.json();if(!r.ok)throw new Error(d.message);setUnreview(false);saved();}catch(e:any){setError(e.message);}finally{setSaving(false);}};
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
          {selected.length > 0 && <>
            <button type="button" onClick={()=>setMode('assign')} className="cursor-pointer rounded border bg-white px-4 py-2 text-blue-950 hover:bg-blue-50">Asignar a proveedor, cliente o nómina común</button>
            <button type="button" onClick={()=>allReviewed?setUnreview(true):setMode('review')} className={'cursor-pointer rounded px-4 py-2 text-white '+(allReviewed?'bg-red-700 hover:bg-red-800':'bg-green-700 hover:bg-green-800')}>{allReviewed?'Marcar como NO revisado':'Marcar selección como revisados'}</button>
            <button type="button" onClick={()=>setMode('charge')} className="cursor-pointer rounded border bg-white px-4 py-2 text-blue-950 hover:bg-blue-50">Asignar a un cargo previsto</button>
          </>}
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
      <label className="block bg-white px-4 pb-4">Asignación a proveedor<select value={assigned} onChange={e=>setAssigned(e.target.value)} className="ml-3 cursor-pointer rounded border p-2 hover:bg-blue-50"><option value="">Todos</option><option value="yes">Con proveedor</option><option value="no">Sin proveedor</option></select></label>
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
              <th className="w-[25%] p-3 text-left">Asignado a</th>
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
      {mode && <BankReviewWizard lines={selectedRows} all={rows} mode={mode} modal onSaved={saved} onClose={()=>setMode(null)} />}
      {unreview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"><section role="dialog" aria-modal="true" aria-label="Marcar como no revisado" className="max-w-xl rounded bg-white p-6"><header className="flex justify-between"><h2 className="text-xl font-semibold">Marcar como NO revisado</h2><button type="button" aria-label="Cerrar" onClick={()=>setUnreview(false)} className="cursor-pointer rounded px-3 text-2xl hover:bg-gray-100">×</button></header><p className="my-4">Se marcarán {selectedRows.length} registros como pendientes de revisar. Sus asignaciones y pagos se conservarán.</p><button type="button" disabled={saving} onClick={markUnreviewed} className="rounded bg-red-700 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-red-800 disabled:opacity-50">{saving?'Guardando…':'Confirmar'}</button></section></div>}
    </main>
  );
}
