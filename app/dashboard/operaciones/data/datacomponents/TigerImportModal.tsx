'use client';
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { TIGER_HEADERS, TigerType, ImportMode } from '../tigerFormat';

type Props = { type: TigerType; onClose: () => void };
export default function TigerImportModal({ type, onClose }: Props) {
  const [phase, setPhase] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mode, setMode] = useState<ImportMode>('crear');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{created:number;updated:number;skipped:number}|null>(null);
  useEffect(() => { const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [onClose]);
  const mismatches = Array.from({ length: Math.max(headers.length, TIGER_HEADERS[type].length) }, (_, i) => ({ expected: TIGER_HEADERS[type][i] ?? '—', actual: headers[i] ?? '—' })).filter((v) => v.expected !== v.actual);
  async function readFile(selected: File) {
    setFile(selected); setError('');
    try {
      const workbook = XLSX.read(await selected.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false });
      const repairEncoding = (value: unknown) => {
        const text = String(value ?? '');
        if (!/[ÃÂ]/.test(text)) return text;
        try { return decodeURIComponent(escape(text)); } catch { return text; }
      };
      const parsedHeaders = (matrix[0] || []).map(repairEncoding);
      setHeaders(parsedHeaders);
      setRows(matrix.slice(1).filter((line) => line.some((value) => String(value ?? '').trim())).map((line) => Object.fromEntries(parsedHeaders.map((header, index) => [header, line[index] ?? '']))));
      setPhase(2);
    } catch { setError('No se ha podido leer el archivo.'); }
  }
  async function runImport() {
    setPhase(4); setError('');
    try {
      const response = await fetch('/api/v1/operaciones/tiger/importar', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ tipo:type, modo:mode, headers, rows }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.message);
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error durante la importación'); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
    <div className="relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-8 shadow-2xl">
      <button onClick={onClose} aria-label="Cerrar" className="absolute right-4 top-3 cursor-pointer rounded px-3 py-1 text-3xl hover:bg-gray-100">×</button>
      <h2 className="mb-2 text-2xl font-bold text-blue-950">Importar {type} desde Tiger</h2><p className="mb-6 text-sm">Fase {phase}/4</p>
      {phase === 1 && <div><label htmlFor={`tiger-${type}`} className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-8 text-center hover:bg-blue-100"><strong>{file?.name || 'Adjunta el CSV o Excel exportado de Tiger'}</strong><span className="mt-2 text-sm">Formatos .csv, .xls y .xlsx</span></label><input id={`tiger-${type}`} className="hidden" type="file" accept=".csv,.xls,.xlsx" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}/>{error && <p className="mt-3 text-red-600">{error}</p>}</div>}
      {phase === 2 && <div>{mismatches.length ? <><p className="mb-4 font-semibold text-red-700">Las columnas no encajan con el formato esperado.</p><div className="max-h-96 overflow-auto"><table className="w-full border-collapse"><thead><tr><th className="border p-2 text-left">Valor esperado</th><th className="border p-2 text-left">Valor actual</th></tr></thead><tbody>{mismatches.map((m,i)=><tr key={i}><td className="border p-2">{m.expected}</td><td className="border p-2 text-red-600">{m.actual}</td></tr>)}</tbody></table></div><button onClick={()=>setPhase(1)} className="mt-5 cursor-pointer rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600">Elegir otro archivo</button></> : <><p className="rounded bg-green-50 p-4 text-green-700">El formato es correcto: {headers.length} columnas y {rows.length} filas de datos.</p><button onClick={()=>setPhase(3)} className="mt-5 cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-900">Continuar</button></>}</div>}
      {phase === 3 && <div className="space-y-3">{([['crear','Solo crear','Solo añade registros que todavía no existen.'],['rellenar','Sobreescribir sin sustituir','Crea registros y rellena únicamente campos actualmente vacíos.'],['sustituir','Sobreescribir sustituyendo','Crea registros y reemplaza todos los campos existentes.']] as const).map(([value,label,help])=><label key={value} className="flex cursor-pointer gap-3 rounded border p-4 hover:bg-gray-50"><input className="cursor-pointer" type="radio" checked={mode===value} onChange={()=>setMode(value)}/><span><strong>{label}</strong><small className="block text-gray-500">{help}</small></span></label>)}<button onClick={runImport} className="mt-4 cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-900">Iniciar importación</button></div>}
      {phase === 4 && <div className="py-8 text-center">{!result && !error && <><div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-950"/><p>Aplicando los cambios…</p></>}{error && <><p className="mb-4 text-red-600">{error}</p><button onClick={()=>setPhase(3)} className="cursor-pointer rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600">Volver</button></>}{result && <><p className="text-xl font-semibold text-green-700">Importación completada</p><p className="my-3">{result.created} creados, {result.updated} actualizados y {result.skipped} omitidos.</p><button onClick={()=>window.location.assign(`/dashboard/comercial/${type}`)} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-900">Recargar e ir a {type}</button></>}</div>}
    </div></div>;
}
