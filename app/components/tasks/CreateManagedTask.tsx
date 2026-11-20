'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '@/app/apiClient';
import DatePartsInput from '@/app/components/DatePartsInput';
import TaskAgentSelector from './TaskAgentSelector';
import TaskAccountSelector from './TaskAccountSelector';

export default function CreateManagedTask({ agents, onClose, onCreated }: {
  agents: { value: string; label: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [account, setAccount] = useState({ id: '', name: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { dialog.current?.showModal(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiClient.post('/api/v1/tareas', {
        nombre: name.trim(), descripcion: description, fecha_inicio: date,
        agentes_asociados: selected, estado: 'pendiente', id_cuenta: account.id,
      });
      onCreated();
    } catch (failure: any) {
      setError(failure.response?.data?.message || 'No se pudo crear la tarea.');
    } finally {
      setBusy(false);
    }
  }

  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    aria-labelledby="new-managed-task" className="m-auto max-h-[90vh] w-[min(36rem,95vw)] rounded-xl p-6 shadow-xl backdrop:bg-black/40">
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="new-managed-task" className="text-lg font-semibold">Agregar tarea</h2>
        <button type="button" aria-label="Cerrar" onClick={onClose} disabled={busy} className="rounded px-2 enabled:cursor-pointer enabled:hover:bg-gray-100">×</button>
      </div>
      <label className="block">Nombre de la tarea<input required value={name} onChange={event => setName(event.target.value)} className="block w-full rounded border p-2" /></label>
      <label className="block">Descripción<textarea value={description} onChange={event => setDescription(event.target.value)} className="block w-full rounded border p-2" /></label>
      <TaskAgentSelector value={selected} options={agents} onChange={setSelected} disabled={busy} />
      <TaskAccountSelector value={account.id} name={account.name} disabled={busy} onChange={(id, name) => setAccount({ id, name })} />
      <DatePartsInput label="Fecha de inicio" value={date} onChange={setDate} disabled={busy} />
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button disabled={busy || !name.trim() || !selected.length} className="rounded bg-blue-950 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-blue-800 disabled:opacity-50">Crear tarea</button>
    </form>
  </dialog>;
}
