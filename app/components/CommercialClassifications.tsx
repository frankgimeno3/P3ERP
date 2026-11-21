'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import apiClient from '@/app/apiClient';
import SearchableSelect from './SearchableSelect';

type Kind = 'actividades-cuentas' | 'tipos-contacto';
type Row = { id: string; nombre: string; asociado?: boolean; miembros?: Row[] };
const action = 'rounded border px-3 py-1 enabled:cursor-pointer enabled:hover:bg-blue-50 disabled:opacity-50';
const api = (kind: Kind) => '/api/v1/clasificaciones/' + kind;
const title = (kind: Kind) => kind === 'actividades-cuentas' ? 'Actividades de cuentas' : 'Tipos de contacto';
function message(error: any) { return error.response?.data?.message || 'No se pudo completar la operación.'; }

export default function CommercialClassifications({ kind, record }: { kind: Kind; record?: string }) {
  const params = useParams<{ id?: string }>();
  const id = record ? undefined : params?.id;
  const segment = kind === 'actividades-cuentas' ? 'cuentas' : 'contactos';
  const base = '/dashboard/operaciones/' + kind;
  const dialog = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [item, setItem] = useState<Row>();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiClient.get(api(kind), { params: { id, registro: record }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) { if (id) setItem(data); else setRows(data); } })
      .catch(error => { if (!controller.signal.aborted) setError(message(error)); });
    return () => controller.abort();
  }, [kind, record, id, revision]);
  async function update(remove?: string) {
    setBusy(true);
    setModalError('');
    setError('');
    try {
      if (remove) await apiClient.delete(api(kind), { params: { id: remove, registro: record } });
      else await apiClient.post(api(kind), record ? {} : { nombre: input }, { params: record ? { id: input, registro: record } : {} });
      if (!remove) dialog.current?.close();
      setRevision(value => value + 1);
    } catch (error) {
      if (remove) setError(message(error)); else setModalError(message(error));
    } finally { setBusy(false); }
  }
  return <section className={record ? 'space-y-2' : 'space-y-4 p-6'}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-semibold">{id ? item?.nombre || title(kind) : title(kind)}</h2>
      {!id && <button type="button" className={action} aria-label={record ? 'Vincular clasificación' : 'Crear clasificación'} disabled={busy} onClick={() => { setInput(''); setModalError(''); dialog.current?.showModal(); }}>{record ? '+' : 'Añadir'}</button>}
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {record ? rows.filter(row => row.asociado).map(row => <article key={row.id} className="flex items-center justify-between gap-3 rounded border bg-white p-3">
      <Link className="cursor-pointer hover:underline" href={base + '/' + row.id}>{row.nombre}</Link>
      <button type="button" className={action} disabled={busy} onClick={() => update(row.id)}>Desvincular</button>
    </article>) : <table className="w-full border bg-white text-left">
      <thead className="bg-blue-950 text-white"><tr><th className="p-3">ID</th><th className="p-3">{id ? (segment === 'cuentas' ? 'Empresa' : 'Contacto') : 'Nombre'}</th></tr></thead>
      <tbody>{(id ? item?.miembros || [] : rows).map(row => <tr key={row.id} className="border-t hover:bg-blue-50"><td className="p-3">{row.id}</td><td className="p-3"><Link className="cursor-pointer text-blue-950 hover:underline" href={id ? '/dashboard/comercial/' + segment + '/' + encodeURIComponent(row.id) : base + '/' + row.id}>{row.nombre}</Link></td></tr>)}</tbody>
    </table>}
    <dialog ref={dialog} aria-label="Añadir clasificación" className="m-auto w-[min(94vw,32rem)] rounded-xl p-5 shadow-xl backdrop:bg-black/40" onCancel={event => { if (busy) event.preventDefault(); }}>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); void update(); }}>
        <div className="flex justify-between"><h3 className="font-semibold">{record ? 'Vincular' : 'Añadir'}</h3><button type="button" aria-label="Cerrar" className={action} disabled={busy} onClick={() => dialog.current?.close()}>×</button></div>
        {record ? <SearchableSelect label="Clasificación" value={input} onChange={setInput} options={rows.filter(row => !row.asociado).map(row => ({ value: row.id, label: row.nombre }))} />
          : <label className="block">Nombre<input required maxLength={200} className="block w-full rounded border p-2" value={input} onChange={event => setInput(event.target.value)} /></label>}
        {modalError && <p role="alert" className="text-red-700">{modalError}</p>}
        <button className={action} disabled={busy || !input.trim()}>{record ? 'Vincular' : 'Crear'}</button>
      </form>
    </dialog>
  </section>;
}
