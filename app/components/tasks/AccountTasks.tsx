'use client';
import SortableTable from '@/app/components/SortableTable';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/app/apiClient';
import { AgenteService } from '@/app/service/AgenteService';
import { accountTaskTypes } from '@/app/config/accountTasks';
import SearchableSelect from '@/app/components/SearchableSelect';
import DatePartsInput from '@/app/components/DatePartsInput';
import TableFilters from '@/app/components/TableFilters';
import TableColumnFilter from '@/app/components/TableColumnFilter';
import { matchesTableFilter } from '@/app/lib/dateFilters';
import { taskStates } from './TaskList';

type Task = { id: string; nombre: string; tipo: string; descripcion: string; referencia: string; fecha_limite: string; estado: string; agentes: string[]; nombre_agente: string; updated_at: string };
const empty = () => ({ nombre: '', tipo: 'pedir_material_contratado', descripcion: '', referencia: '', fecha_limite: '', estado: 'pendiente', agentes: [] as string[] });
const control = 'mt-1 block w-full rounded border bg-white p-2 text-sm outline-none focus:border-blue-950 disabled:bg-gray-100';
const button = 'rounded border px-3 py-2 text-sm enabled:cursor-pointer enabled:hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50';
const columns = [['nombre','Tarea'],['tipo','Tipo'],['estado','Estado'],['nombre_agente','Agentes'],['fecha_limite','Fecha límite'],['referencia','Campaña / contrato']] as const;

export default function AccountTasks({ accountId }: { accountId: string }) {
  const [rows, setRows] = useState<Task[]>([]), [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true), [allowed, setAllowed] = useState(false), [error, setError] = useState('');
  const [tab, setTab] = useState('pendientes'), [filters, setFilters] = useState<Record<string,string>>({});
  const [open, setOpen] = useState(false), [editing, setEditing] = useState<Task|null>(null), [form, setForm] = useState(empty);
  const [selection, setSelection] = useState(''), [saving, setSaving] = useState(false), [formError, setFormError] = useState('');
  const url = `/api/v1/comercial/cuentas/${encodeURIComponent(accountId)}/tareas`;
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await apiClient.get(url); setRows(response.data.rows); setAllowed(response.data.puede_editar); }
    catch (reason: any) { setError(reason.response?.data?.message || 'No se pudieron cargar las tareas.'); }
    finally { setLoading(false); }
  }, [url]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let active = true;
    AgenteService.getAgentes().then(data => { if (active) setAgents(Array.isArray(data) ? data.filter(agent => agent.is_empleado_account !== false && !['inactivo','borrador'].includes(String(agent.estado_agente || '').toLowerCase())) : []); }).catch(() => { if (active) setAgents([]); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const refresh = () => { if (!open) void load(); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [load, open]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  const begin = (task?: Task) => {
    setEditing(task || null); setForm(task ? { nombre: task.nombre, tipo: task.tipo, descripcion: task.descripcion, referencia: task.referencia, fecha_limite: task.fecha_limite || '', estado: task.estado, agentes: task.agentes } : empty());
    setSelection(''); setFormError(''); setOpen(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving) return;
    if (!form.agentes.length) { setFormError('Selecciona al menos un agente responsable.'); return; }
    setSaving(true); setFormError('');
    try {
      if (editing) await apiClient.put(`${url}/${encodeURIComponent(editing.id)}`, { ...form, version: editing.updated_at });
      else await apiClient.post(url, form);
      setOpen(false); await load();
    } catch (reason: any) { setFormError(reason.response?.data?.message || 'No se pudo guardar la tarea.'); }
    finally { setSaving(false); }
  };
  const value = (task: Task, key: typeof columns[number][0]) => key === 'tipo' ? accountTaskTypes[task.tipo as keyof typeof accountTaskTypes] : key === 'estado' ? taskStates[task.estado] : task[key];
  const shown = rows.filter(task => (tab === 'pendientes' ? ['pendiente','en_curso'].includes(task.estado) : ['completada','cancelada'].includes(task.estado)) && columns.every(([key]) => matchesTableFilter(value(task,key),filters[key] || '')));
  return <section className="space-y-4 p-4 text-gray-700">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-blue-950">Tareas de la cuenta</h2><p className="mt-1 text-sm">Cada tarea aparece también en las tareas propias de todos sus agentes responsables.</p></div>{allowed && <button type="button" onClick={() => begin()} className={`${button} bg-blue-950 text-white enabled:hover:bg-blue-900`}>Crear tarea</button>}</div>
    <div role="tablist" aria-label="Estado de las tareas de la cuenta" className="flex gap-2">{['pendientes','terminadas'].map(item => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`${button} ${tab === item ? 'bg-blue-950 text-white enabled:hover:bg-blue-900' : 'bg-white'}`}>{item === 'pendientes' ? 'Pendientes' : 'Terminadas'}</button>)}</div>
    {error && <p role="alert" className="text-red-700">{error} <button type="button" className={`${button} ml-2`} onClick={() => void load()}>Reintentar</button></p>}
    <TableFilters>{columns.map(([key,label]) => <TableColumnFilter key={key} label={label} value={filters[key] || ''} onChange={next => setFilters(previous => ({ ...previous, [key]: next }))} />)}</TableFilters>
    <div className="overflow-x-auto rounded border bg-white"><SortableTable className="w-full text-left text-sm"><thead className="bg-blue-950 text-white"><tr>{columns.map(([key,label]) => <th key={key} className="p-3 font-medium">{label}</th>)}{allowed && <th className="p-3">Acciones</th>}</tr></thead><tbody>{shown.map(task => <tr key={task.id} className="border-t hover:bg-blue-50">{columns.map(([key]) => <td key={key} className="p-3">{key === 'nombre' ? <Link href={`/tareas/${encodeURIComponent(task.id)}`} className="cursor-pointer text-blue-900 hover:underline">{task.nombre}</Link> : value(task,key) || '—'}</td>)}{allowed && <td className="p-3"><button type="button" onClick={() => begin(task)} className={button}>Editar</button></td>}</tr>)}{!shown.length && <tr><td colSpan={allowed ? 7 : 6} className="p-6 text-center text-gray-500">{loading ? 'Cargando tareas…' : 'No hay tareas en esta vista.'}</td></tr>}</tbody></SortableTable></div>
    {open && <div className="fixed inset-0 z-50 overflow-auto bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="account-task-title" className="relative mx-auto my-6 w-full max-w-2xl rounded bg-white p-6 shadow-xl"><button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} className="absolute right-3 top-2 cursor-pointer rounded px-2 text-2xl hover:bg-gray-100">×</button><h2 id="account-task-title" className="mb-4 pr-8 text-xl font-semibold">{editing ? 'Editar tarea de la cuenta' : 'Crear tarea de la cuenta'}</h2>
      <form onSubmit={save} className="space-y-4"><fieldset disabled={saving} className="space-y-4">
        <label className="block text-sm">Tipo de tarea<select value={form.tipo} onChange={event => setForm({ ...form, tipo: event.target.value })} className={`${control} enabled:cursor-pointer enabled:hover:border-blue-950`}>{Object.entries(accountTaskTypes).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="block text-sm">Nombre de la tarea<input autoFocus required maxLength={250} value={form.nombre} onChange={event => setForm({ ...form, nombre: event.target.value })} className={control} /></label>
        <label className="block text-sm">Campaña, contrato o referencia<input maxLength={500} value={form.referencia} onChange={event => setForm({ ...form, referencia: event.target.value })} className={control} /></label>
        <label className="block text-sm">Detalle de la acción<textarea maxLength={10000} value={form.descripcion} onChange={event => setForm({ ...form, descripcion: event.target.value })} className={`${control} min-h-28`} /></label>
        <DatePartsInput label="Fecha límite (opcional)" value={form.fecha_limite} onChange={value => setForm({ ...form, fecha_limite: value })} disabled={saving} />
        <div className="space-y-2"><p className="text-sm font-medium">Agentes responsables · al menos uno</p><SearchableSelect label="Añadir agente responsable" value={selection} onChange={id => { setSelection(''); if (id && !form.agentes.includes(id)) setForm({ ...form, agentes: [...form.agentes,id] }); }} disabled={saving} options={agents.filter(agent => !form.agentes.includes(agent.id_agente)).map(agent => ({ value: agent.id_agente, label: agent.nombre_completo_agente || agent.nombre_agente || agent.id_agente }))} /><div className="flex flex-wrap gap-2">{form.agentes.map(id => <span key={id} className="inline-flex items-center gap-2 rounded border bg-blue-50 px-3 py-1 text-sm">{agents.find(agent => agent.id_agente === id)?.nombre_completo_agente || editing?.nombre_agente && editing.agentes.length === 1 && editing.nombre_agente || id}<button type="button" aria-label={`Quitar agente ${id}`} disabled={saving} onClick={() => setForm({ ...form, agentes: form.agentes.filter(agent => agent !== id) })} className="rounded px-1 text-lg enabled:cursor-pointer enabled:hover:bg-blue-100 disabled:cursor-not-allowed">×</button></span>)}</div>{!form.agentes.length && <p className="text-xs text-gray-500">Selecciona una opción del desplegable para añadir el agente.</p>}</div>
        <label className="block text-sm">Estado<select value={form.estado} onChange={event => setForm({ ...form, estado: event.target.value })} className={`${control} enabled:cursor-pointer enabled:hover:border-blue-950`}>{Object.entries(taskStates).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </fieldset>{formError && <p role="alert" className="text-red-700">{formError}</p>}<div className="flex justify-end"><button disabled={saving || !form.nombre.trim() || !form.agentes.length} className={`${button} bg-blue-950 text-white enabled:hover:bg-blue-900`}>{saving ? 'Guardando…' : 'Guardar tarea'}</button></div></form>
    </section></div>}
  </section>;
}
