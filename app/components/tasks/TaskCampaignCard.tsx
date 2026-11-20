'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/app/apiClient';
import TaskCampaignSelect from './TaskCampaignSelect';

const action = 'rounded border px-3 py-2 text-blue-950 enabled:cursor-pointer enabled:hover:bg-blue-50 disabled:opacity-50';

export default function TaskCampaignCard({ taskId, disabled, onSaved }: {
  taskId: string; disabled: boolean; onSaved: (current: {id_campana: string | null; updated_at: string}) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<'edit' | 'remove' | null>(null);
  const [selected, setSelected] = useState('');
  const [previous, setPrevious] = useState('');
  const [rows, setRows] = useState<{id:string;nombre:string}[]>([]);
  const [editable, setEditable] = useState(false);
  const url = '/api/v1/tareas/' + encodeURIComponent(taskId) + '/campanas';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const request = new AbortController();
    apiClient.get(url, { signal: request.signal }).then(({ data }) => {
      setRows(data.rows);
      setEditable(data.editable);
    }).catch(() => { if (!request.signal.aborted) setError('No se pudieron cargar las campañas de la tarea.'); });
    return () => request.abort();
  }, [url]);
  useEffect(() => { if (mode) dialog.current?.showModal(); else dialog.current?.close(); }, [mode]);

  function open(next: 'edit' | 'remove', id = '') {
    setPrevious(id);
    setSelected(id);
    setError('');
    setMode(next);
  }

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      const { data } = mode === 'remove' ? await apiClient.delete(url, { data: { previous } }) : await apiClient.put(url, { campaign: selected, previous });
      setRows(data.rows);
      onSaved({ id_campana: data.id_campana, updated_at: data.updated_at });
      setMode(null);
    } catch (failure: any) {
      setError(failure.response?.data?.message || 'No se pudo guardar la asociación.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="space-y-2">
    <h2 className="font-semibold">Campaña comercial</h2>
    {rows.map(row => <article key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded border bg-slate-50 p-3">
      <Link href={'/dashboard/comercial/campanas/' + encodeURIComponent(row.id)} className="cursor-pointer font-medium text-blue-950 hover:underline">{row.nombre}</Link>
      {editable && !disabled && <div className="flex gap-2"><button type="button" className={action} onClick={() => open('edit', row.id)}>Editar</button><button type="button" className={action} onClick={() => open('remove', row.id)}>Desasociar</button></div>}
    </article>)}
    {editable && <button type="button" disabled={disabled} className={action} onClick={() => open('edit')}>Asociar campaña</button>}
    {!rows.length && !editable && !error && <p>Sin campañas asociadas.</p>}
    {!mode && error && <p role="alert" className="text-red-700">{error}</p>}
    <dialog ref={dialog} aria-labelledby="task-campaign-dialog" onCancel={event => { event.preventDefault(); if (!busy) setMode(null); }}
      className="m-auto w-[min(32rem,95vw)] space-y-3 rounded-xl p-5 shadow-lg backdrop:bg-black/40">
      <div className="flex items-center justify-between">
        <h3 id="task-campaign-dialog" className="font-semibold">{mode === 'remove' ? 'Desasociar campaña' : 'Asociar campaña comercial'}</h3>
        <button type="button" aria-label="Cerrar" className={action} disabled={busy} onClick={() => setMode(null)}>×</button>
      </div>
      {mode === 'remove' ? <p>¿Quieres desasociar esta tarea de {rows.find(row => row.id === previous)?.nombre || 'la campaña'}?</p> : mode === 'edit' && <TaskCampaignSelect value={selected} onChange={setSelected} disabled={busy} exclude={rows.filter(row => row.id !== previous).map(row => row.id)} />}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button type="button" className={action} disabled={busy || (mode === 'edit' && (!selected || selected === previous))} onClick={confirm}>{mode === 'remove' ? 'Desasociar' : 'Confirmar'}</button>
    </dialog>
  </section>;
}
