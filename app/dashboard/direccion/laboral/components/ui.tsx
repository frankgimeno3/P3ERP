'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';

export const root = '/dashboard/direccion/laboral';
export const apiRoot = '/api/v1/direccion/laboral';
export const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const money = (value: number | string) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value));
export const dateLabel = (value: string) => value?.slice(0,10).split('-').reverse().join('/') || '—';
export const periodLabel = (mes: number, anio: number) => `${months[mes - 1]} ${anio}`;
export async function request<T = any>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const response = await fetch(`${apiRoot}/${path}`, { method, cache: 'no-store', ...(data === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'No se pudo completar la operación.');
  return result;
}
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`${apiRoot}/${path}`, { signal: controller.signal, cache: 'no-store' }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'No se pudieron cargar los datos.');
      setData(result);
    }).catch(e => { if (e.name !== 'AbortError') setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, version]);
  return { data, error, loading, reload };
}
export function Notice({ error, children }: { error?: string; children?: ReactNode }) {
  return error ? <p role="alert" className="my-3 rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</p> : children ? <p role="status" className="my-3 rounded bg-green-50 p-3 text-green-800">{children}</p> : null;
}
export function Header({ title, back, children }: { title: string; back?: string; children?: ReactNode }) {
  return <header className="mb-5 flex flex-wrap items-center justify-between gap-3"><div>{back && <Link href={back} className="mb-2 inline-block rounded px-2 py-1 text-blue-900 hover:bg-blue-100">← Volver</Link>}<p className="text-xs uppercase text-slate-500">Dirección / Laboral</p><h1 className="text-2xl font-semibold text-blue-950">{title}</h1></div>{children}</header>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1"><span className="block font-medium text-slate-600">{label}</span>{children}</label>;
}
export function YearField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <Field label="Año"><input aria-label="Año" type="number" min="2000" max="2100" required value={value || ''} onChange={e => onChange(Number(e.target.value))} /></Field>;
}
export function PeriodFields({ mes, anio, onChange, disabled = false }: { mes: number; anio: number; onChange: (mes: number, anio: number) => void; disabled?: boolean }) {
  return <fieldset disabled={disabled} className="grid grid-cols-2 gap-3"><Field label="Mes"><select value={mes} onChange={e => onChange(Number(e.target.value), anio)}>{months.map((month,i) => <option key={month} value={i + 1}>{month}</option>)}</select></Field><YearField value={anio} onChange={value => onChange(mes, value)} /></fieldset>;
}
export function DateFields({ value, onChange, label, required = true }: { value: string; onChange: (value: string) => void; label: string; required?: boolean }) {
  const [year = '', month = '', day = ''] = value.split('-');
  return <fieldset><legend className="mb-1 font-medium text-slate-600">{label}</legend><div className="grid grid-cols-[1fr_1fr_1.5fr] gap-2">{[{ key: 'dd', val: day, max: 2 }, { key: 'mm', val: month, max: 2 }, { key: 'yyyy', val: year, max: 4 }].map(part => <input key={part.key} aria-label={`${label} ${part.key}`} placeholder={part.key} inputMode="numeric" pattern={part.max === 4 ? '[0-9]{4}' : '[0-9]{1,2}'} maxLength={part.max} required={required} value={part.val} onChange={e => {
    const text = e.target.value.replace(/\D/g, '');
    const y = part.key === 'yyyy' ? text : year, m = part.key === 'mm' ? text : month, d = part.key === 'dd' ? text : day;
    onChange(y || m || d ? `${y}-${m}-${d}` : '');
  }} />)}</div></fieldset>;
}
export function isoDate(value: string) {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${year.padStart(4,'0')}-${month.padStart(2,'0')}-${day.padStart(2,'0')}` : value;
}
export function Form({ children, onSave, label = 'Guardar cambios' }: { children: ReactNode; onSave: () => Promise<unknown>; label?: string }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const busyRef = useRef(false);
  return <form onChange={() => setSaved(false)} onSubmit={async e => {
    e.preventDefault(); if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setSaved(false);
    try { await onSave(); setSaved(true); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); }
    finally { busyRef.current = false; setBusy(false); }
  }}><fieldset disabled={busy} className="space-y-4">{children}</fieldset><Notice error={error}>{saved ? 'Guardado correctamente.' : null}</Notice><div className="mt-4 flex justify-end"><button disabled={busy} type="submit" className="laboral-button">{busy ? 'Guardando…' : label}</button></div></form>;
}
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const id = useId(), ref = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab') {
        const nodes = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', keydown);
    return () => { window.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"><header className="mb-5 flex items-start justify-between gap-4"><h2 id={id} className="text-xl font-semibold text-blue-950">{title}</h2><button type="button" aria-label="Cerrar" onClick={onClose} className="rounded px-3 text-2xl hover:bg-gray-100">×</button></header>{children}</section></div>;
}
export function DeleteButton({ path, onDeleted }: { path: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="laboral-danger" onClick={() => setOpen(true)}>Eliminar</button>{open && <Modal title="Eliminar registro" onClose={() => setOpen(false)}><p>¿Quieres eliminar este registro?</p><Form label="Confirmar eliminación" onSave={async () => { await request(path, 'DELETE'); setOpen(false); onDeleted(); }}>{null}</Form></Modal>}</>;
}
export function Documents({ kind, id }: { kind: 'empleados' | 'nominas' | 'anticipos'; id: string }) {
  const { data, error, loading, reload } = useResource<Array<{ id: string; nombre: string; tamano: number }>>(`${kind}/${id}/documentos`);
  const [file, setFile] = useState<File | null>(null), ref = useRef<HTMLInputElement>(null);
  return <section className="laboral-card"><h2 className="mb-3 text-lg font-semibold text-blue-950">Documentación</h2><Notice error={error} /><Form label="Subir documento" onSave={async () => {
    if (!file) throw new Error('Selecciona un archivo.');
    if (file.size > 15 * 1024 * 1024) throw new Error('El archivo supera los 15 MB.');
    const form = new FormData(); form.append('file', file);
    const response = await fetch(`${apiRoot}/${kind}/${id}/documentos`, { method: 'POST', body: form });
    const result = await response.json(); if (!response.ok) throw new Error(result.message || 'No se pudo subir el archivo.');
    setFile(null); if (ref.current) ref.current.value = ''; reload();
  }}><Field label="Archivo (máximo 15 MB)"><input ref={ref} type="file" required onChange={e => setFile(e.target.files?.[0] || null)} /></Field></Form><ul className="mt-4 space-y-2">{data?.map(doc => <li key={doc.id}><a className="block rounded bg-slate-50 p-3 text-blue-900 hover:bg-blue-50" href={`${apiRoot}/documentos/${doc.id}`}>{doc.nombre} · {Math.ceil(doc.tamano / 1024)} KB ↓</a></li>)}</ul>{loading ? <p>Cargando documentos…</p> : !data?.length && <p className="mt-3 text-slate-500">Sin documentos.</p>}</section>;
}
