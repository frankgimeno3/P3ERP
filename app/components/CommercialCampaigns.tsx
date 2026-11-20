'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiClient from '@/app/apiClient';
import DatePartsInput from '@/app/components/DatePartsInput';
import TableFilters from '@/app/components/TableFilters';
import { matchesTableFilter } from '@/app/lib/dateFilters';
import SearchableSelect from '@/app/components/SearchableSelect';
import { AgenteService } from '@/app/service/AgenteService';
import { CuentaService } from '@/app/service/CuentaService';

export const campaignUrl = '/api/v1/comercial/campanas';
export const campaignPage = '/dashboard/comercial/campanas';
const states = { pendiente: 'Pendiente', en_curso: 'En curso', finalizada: 'Finalizada' };
type Entity = { id: string; nombre: string };
type Campaign = {
  id: string; nombre: string; descripcion: string; estado: keyof typeof states; creada_por: string;
  fecha_creacion: string; fecha_inicio?: string | null; fecha_finalizacion: string | null; updated_at: string;
  agentes: Entity[]; cuentas: Entity[]; tareas: (Entity & { estado: string; id_cuenta: string | null })[];
};
const empty: Campaign = { id: '', nombre: '', descripcion: '', estado: 'pendiente', creada_por: '', fecha_creacion: '', fecha_finalizacion: '', updated_at: '', agentes: [], cuentas: [], tareas: [] };
const button = 'rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950 enabled:cursor-pointer enabled:hover:bg-blue-50 disabled:opacity-50';
const field = 'mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2';

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function OptionalCampaignDate({ label, enabled, toggle, value, onChange }: {
  label: string; enabled: boolean; toggle: () => void; value: string; onChange: (value: string) => void;
}) {
  return <div className="space-y-2">
    <button type="button" role="switch" aria-checked={enabled} aria-label={`¿Con ${label.toLowerCase()}?`} onClick={toggle}
      className="flex flex-wrap items-center gap-3 rounded px-2 py-1 enabled:cursor-pointer enabled:hover:bg-blue-50">
      ¿Con {label.toLowerCase()}?
      <span className="inline-flex rounded-full border bg-gray-100 p-0.5 text-xs">
        <span className={`rounded-full px-3 py-1 ${enabled ? 'bg-blue-950 font-semibold text-white' : 'text-gray-600'}`}>Sí</span>
        <span className={`rounded-full px-3 py-1 ${!enabled ? 'bg-blue-950 font-semibold text-white' : 'text-gray-600'}`}>No</span>
      </span>
    </button>
    {enabled && <DatePartsInput label={label} value={value} onChange={onChange} />}
  </div>;
}

export function AccountCampaigns({ accountId }: { accountId: string }) {
  const [rows, setRows] = useState<Campaign[]>();
  const [error, setError] = useState('');
  const [choices, setChoices] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');
  const [revision, setRevision] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    apiClient.get<Campaign[]>(campaignUrl, { params: { cuenta: accountId }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setRows(data); })
      .catch(error => { if (!controller.signal.aborted) setError(message(error, 'No se pudieron cargar las campañas.')); });
    return () => controller.abort();
  }, [accountId, revision]);
  async function open() {
    setSelected('');
    setName('');
    setModalError('');
    dialog.current?.showModal();
    try {
      const { data } = await apiClient.get<Campaign[]>(campaignUrl);
      setChoices(data.filter(campaign => !rows?.some(row => row.id === campaign.id)));
    } catch {
      setModalError('No se pudieron cargar las campañas disponibles.');
    }
  }
  async function associate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setModalError('');
    try {
      if (selected) {
        const url = `${campaignUrl}/${encodeURIComponent(selected)}`;
        const { data } = await apiClient.get<Campaign>(url);
        await apiClient.put(url, { ...data, version: data.updated_at, agentes: data.agentes.map(agent => agent.id),
          cuentas: [...new Set([...data.cuentas.map(account => account.id), accountId])] });
      } else {
        await apiClient.post(campaignUrl, { ...empty, nombre: name.trim(), cuentas: [accountId] });
      }
      dialog.current?.close();
      setRevision(value => value + 1);
    } catch (failure) {
      setModalError(message(failure, 'No se pudo asociar la campaña.'));
    } finally {
      setBusy(false);
    }
  }
  return <div className="space-y-2 md:col-span-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">Lista de campañas comerciales asociadas a la cuenta</h3><button type="button" className={button} onClick={open}>Agregar</button></div>
    {error ? <p role="alert" className="text-red-700">{error}</p> : !rows ? <p role="status">Cargando campañas…</p> : !rows.length ? <p className="text-gray-600">Sin campañas asociadas.</p> : null}
    {rows?.map(row => <Link key={row.id} href={`${campaignPage}/${encodeURIComponent(row.id)}`} className="block cursor-pointer rounded-lg border bg-white p-3 shadow-sm hover:border-blue-300 hover:bg-blue-50">
      <span className="font-medium">{row.nombre}</span>
      <span className="ml-2 text-xs text-gray-600">{states[row.estado]}{row.fecha_finalizacion && ` · ${row.fecha_finalizacion}`}</span>
    </Link>)}
    <dialog ref={dialog} aria-labelledby="account-campaign-title" onCancel={event => { if (busy) event.preventDefault(); event.stopPropagation(); }}
      className="m-auto w-[min(32rem,95vw)] rounded-xl bg-white p-5 shadow-lg backdrop:bg-black/40">
      <form className="space-y-3" onSubmit={associate}>
        <div className="flex items-center justify-between"><h3 id="account-campaign-title" className="font-semibold">Agregar campaña comercial</h3><button type="button" className={button} aria-label="Cerrar" disabled={busy} onClick={() => dialog.current?.close()}>×</button></div>
        <SearchableSelect label="Campaña existente" value={selected} onChange={setSelected} options={choices.map(row => ({ value: row.id, label: row.nombre }))} disabled={busy || Boolean(name)} />
        <label className="block">Nombre de una campaña nueva<input value={name} onChange={event => setName(event.target.value)} disabled={busy || Boolean(selected)} className={field} /></label>
        {modalError && <p role="alert" className="text-red-700">{modalError}</p>}
        <button disabled={busy || (!selected && !name.trim())} className={button}>{selected ? 'Asociar campaña' : 'Crear y asociar'}</button>
      </form>
    </dialog>
  </div>;
}

function AccountPicker({ current, onClose, onAdd }: { current: Entity[]; onClose: () => void; onAdd: (rows: Entity[]) => void }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ rows: Entity[]; total: number }>({ rows: [], total: 0 });
  const [selected, setSelected] = useState<Entity[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [onClose]);
  useEffect(() => {
    const request = new AbortController();
    CuentaService.getCuentas({ clienteFiltro: query, page, limit: 25 }, { signal: request.signal }).then(data => {
      if (!request.signal.aborted) {
        setResult({ rows: data.rows.map((row: { id_cuenta: string; nombre_empresa: string }) => ({ id: row.id_cuenta, nombre: row.nombre_empresa })), total: data.total });
        setError('');
      }
    }).catch(error => { if (!request.signal.aborted) setError(message(error, 'No se pudieron buscar las cuentas.')); });
    return () => request.abort();
  }, [query, page]);
  return <div className="fixed inset-0 z-50 overflow-auto bg-black/40 p-4">
    <section role="dialog" aria-modal="true" aria-label="Asociar cuentas" className="relative mx-auto max-w-2xl space-y-4 rounded-lg bg-white p-6">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute right-3 top-2 cursor-pointer rounded px-2 text-xl hover:bg-gray-100">×</button>
      <h2 className="pr-8 text-lg font-semibold">Asociar cuentas</h2>
      <label className="block">Buscar por nombre<input autoFocus value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} className={field} /></label>
      <p role="status">{selected.length} seleccionadas</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="max-h-64 space-y-1 overflow-auto">
        {result.rows.map(row => {
          const linked = current.some(item => item.id === row.id), checked = selected.some(item => item.id === row.id);
          return <label key={row.id} className={`flex items-center gap-2 rounded p-2 ${linked ? 'text-gray-500' : 'cursor-pointer hover:bg-blue-50'}`}>
            <input type="checkbox" checked={linked || checked} disabled={linked} className="enabled:cursor-pointer"
              onChange={() => setSelected(previous => checked ? previous.filter(item => item.id !== row.id) : [...previous, row])} />
            {row.nombre} · {row.id}
          </label>;
        })}
        {!result.rows.length && !error && <p>No hay cuentas en esta búsqueda.</p>}
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">
          <button type="button" className={button} disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
          <button type="button" className={button} disabled={page * 25 >= result.total} onClick={() => setPage(page + 1)}>Siguiente</button>
        </div>
        <button type="button" className={button} disabled={!selected.length} onClick={() => onAdd(selected)}>Asociar</button>
      </div>
    </section>
  </div>;
}

export function CampaignEditor({ id, onSaved }: { id: string; onSaved: (id: string) => void }) {
  const [campaign, setCampaign] = useState<Campaign | undefined>(id ? undefined : empty);
  const [agents, setAgents] = useState<(Entity & { employee: boolean })[]>([]);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [task, setTask] = useState({ nombre: '', cuenta: '-', agente: '' });
  const [withStart, setWithStart] = useState(!id);
  const [withEnd, setWithEnd] = useState(!id);

  useEffect(() => {
    let active = true;
    AgenteService.getAgentes().then(data => {
      if (active) setAgents(data.filter((row: { estado_agente?: string }) => !['inactivo', 'borrador'].includes(row.estado_agente?.toLowerCase() || '')).map((row: { id_agente: string; nombre_completo_agente: string; is_empleado_account?: boolean }) => ({ id: row.id_agente, nombre: row.nombre_completo_agente || row.id_agente, employee: row.is_empleado_account !== false })));
    }).catch(error => { if (active) setError(message(error, 'No se pudieron cargar los agentes.')); });
    if (id) apiClient.get<Campaign>(`${campaignUrl}/${encodeURIComponent(id)}`).then(({ data }) => {
      if (active) { setCampaign(data); setWithStart(Boolean(data.fecha_inicio)); setWithEnd(Boolean(data.fecha_finalizacion)); }
    }).catch(error => { if (active) setError(message(error, 'No se pudo cargar la campaña.')); });
    return () => { active = false; };
  }, [id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!campaign || busy) return;
    setBusy(true);
    setError('');
    const data = { ...campaign, fecha_inicio: withStart ? campaign.fecha_inicio : null, fecha_finalizacion: withEnd ? campaign.fecha_finalizacion : null,
      agentes: campaign.agentes.map(row => row.id), cuentas: campaign.cuentas.map(row => row.id), version: campaign.updated_at };
    try {
      const result = id ? await apiClient.put<Campaign>(`${campaignUrl}/${encodeURIComponent(id)}`, data) : await apiClient.post<Campaign>(campaignUrl, data);
      setCampaign(result.data);
      onSaved(result.data.id);
    } catch (error) { setError(message(error, 'No se pudo guardar la campaña.')); }
    finally { setBusy(false); }
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!campaign || busy || !task.cuenta || !task.agente || !task.nombre.trim()) return;
    setBusy(true);
    setError('');
    try {
      const { data } = task.cuenta === '-'
        ? await apiClient.post(`${campaignUrl}/${encodeURIComponent(id)}`, { nombre: task.nombre, agente: task.agente })
        : await apiClient.post(`/api/v1/comercial/cuentas/${encodeURIComponent(task.cuenta)}/tareas`, {
            id_campana: id, nombre: task.nombre, tipo: 'accion', estado: 'pendiente', agentes: [task.agente],
          });
      setCampaign(previous => previous && { ...previous, tareas: [...previous.tareas, { id: data.id, nombre: data.nombre, estado: data.estado, id_cuenta: data.id_cuenta }] });
      setTask({ nombre: '', cuenta: '-', agente: '' });
    } catch (error) { setError(message(error, 'No se pudo añadir la tarea.')); }
    finally { setBusy(false); }
  }

  if (!campaign) return <p role={error ? 'alert' : 'status'}>{error || 'Cargando campaña…'}</p>;
  const agentsAvailable = [...agents, ...campaign.agentes.filter(row => !agents.some(a => a.id === row.id))];
  return <div className="space-y-6 rounded-lg bg-white p-5 shadow">
    <h2 className="text-xl font-semibold">{id ? campaign.nombre : 'Nueva campaña comercial'}</h2>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <form onSubmit={save} className="space-y-5">
      <fieldset disabled={busy} className="space-y-5">
        <div className="grid max-w-xl gap-4">
          <label>Nombre de la campaña<input required maxLength={250} value={campaign.nombre} onChange={event => setCampaign({ ...campaign, nombre: event.target.value })} className={field} /></label>
          <label>Descripción de la campaña<textarea maxLength={20000} value={campaign.descripcion} onChange={event => setCampaign({ ...campaign, descripcion: event.target.value })} className={`${field} min-h-24`} /></label>
          <label>Estado de la campaña<select className={`${field} enabled:cursor-pointer enabled:hover:border-blue-700`} value={campaign.estado} onChange={event => setCampaign({ ...campaign, estado: event.target.value as Campaign['estado'] })}>
            {Object.entries(states).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <OptionalCampaignDate label="Fecha de inicio" enabled={withStart} toggle={() => setWithStart(!withStart)}
            value={campaign.fecha_inicio || ''} onChange={value => setCampaign({ ...campaign, fecha_inicio: value })} />
          <OptionalCampaignDate label="Fecha de finalización" enabled={withEnd} toggle={() => setWithEnd(!withEnd)}
            value={campaign.fecha_finalizacion || ''} onChange={value => setCampaign({ ...campaign, fecha_finalizacion: value })} />
        </div>
        <div className="grid items-start gap-4 md:grid-cols-2">
        <details className="rounded border p-3">
          <summary className="font-semibold hover:text-blue-800">Agentes asociados <span className="float-right">{campaign.agentes.length}</span></summary>
          <div className="mt-2 grid max-h-56 gap-1 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
            {agentsAvailable.map(agent => {
              const checked = campaign.agentes.some(row => row.id === agent.id);
              return <label key={agent.id} className="flex items-center gap-2 rounded p-2 enabled:cursor-pointer hover:bg-blue-50">
                <input type="checkbox" checked={checked} className="enabled:cursor-pointer" onChange={() => setCampaign({ ...campaign, agentes: checked ? campaign.agentes.filter(row => row.id !== agent.id) : [...campaign.agentes, agent] })} />
                {agent.nombre}
              </label>;
            })}
          </div>
        </details>
        <details className="space-y-2 rounded border p-3">
          <summary className="font-semibold hover:text-blue-800">Cuentas asociadas <span className="float-right">{campaign.cuentas.length}</span></summary>
          {campaign.cuentas.map(row => <div key={row.id} className="flex items-center gap-3">
            <Link href={`/dashboard/comercial/cuentas/${encodeURIComponent(row.id)}`} className="cursor-pointer text-blue-900 hover:underline">{row.nombre}</Link>
            <button type="button" className={button} aria-label={`Quitar ${row.nombre}`} onClick={() => setCampaign({ ...campaign, cuentas: campaign.cuentas.filter(item => item.id !== row.id) })}>×</button>
          </div>)}
          <button type="button" className={button} onClick={() => setPicking(true)}>Asociar cuentas</button>
        </details>
        </div>
      </fieldset>
      <button type="submit" disabled={busy || !campaign.nombre.trim()} className={button}>Guardar campaña</button>
    </form>
    {id && <section className="space-y-3 border-t pt-5">
      <h3 className="font-semibold">Tareas asociadas</h3>
      {campaign.tareas.map(row => <div key={row.id}><Link href={`/mis-tareas/${encodeURIComponent(row.id)}`} className="cursor-pointer text-blue-900 hover:underline">{row.nombre}</Link> <span className="text-sm text-gray-500">{row.estado.replaceAll('_', ' ')}</span></div>)}
      {!campaign.tareas.length && <p className="text-sm text-gray-600">Sin tareas asociadas.</p>}
      <form onSubmit={addTask} className="grid items-end gap-3 lg:grid-cols-4">
        <label>Nombre de la tarea<input required maxLength={250} value={task.nombre} onChange={event => setTask({ ...task, nombre: event.target.value })} className={field} /></label>
        <SearchableSelect label="Cuenta de la tarea" required disabled={busy} options={[{value:'-',label:'Sin cuenta'}, ...campaign.cuentas.map(row => ({ value: row.id, label: row.nombre }))]} value={task.cuenta} onChange={cuenta => setTask({ ...task, cuenta })} />
        <SearchableSelect label="Agente responsable" required disabled={busy} options={agents.filter(row => row.employee).map(row => ({ value: row.id, label: row.nombre }))} value={task.agente} onChange={agente => setTask({ ...task, agente })} />
        <button type="submit" className={button} disabled={busy || !task.cuenta || !task.agente || !task.nombre.trim()}>Añadir tarea</button>
      </form>
    </section>}
    {picking && <AccountPicker current={campaign.cuentas} onClose={() => setPicking(false)} onAdd={rows => {
      setCampaign({ ...campaign, cuentas: [...campaign.cuentas, ...rows] }); setPicking(false);
    }} />}
  </div>;
}

export function CampaignList() {
  const router = useRouter();
  const [rows, setRows] = useState<Campaign[]>();
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  useEffect(() => {
    const request = new AbortController();
    apiClient.get<Campaign[]>(campaignUrl, { signal: request.signal }).then(({ data }) => {
      if (!request.signal.aborted) setRows(data);
    }).catch(error => { if (!request.signal.aborted) setError(message(error, 'No se pudieron cargar las campañas.')); });
    return () => request.abort();
  }, []);
  const columns = [['nombre','Nombre'],['fecha_creacion','Fecha de creación'],['fecha_finalizacion','Fecha de finalización'],['estado','Estado'],['creada_por','Creada por'],['agentes','Agentes']] as const;
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const visible = (rows ?? []).filter(row =>
    normalize(row.nombre).includes(normalize(filters.nombre || '')) &&
    (!filters.estado || row.estado === filters.estado) &&
    (!filters.creada_por || row.creada_por === filters.creada_por) &&
    (!filters.agentes || row.agentes.some(agent => agent.id === filters.agentes)) &&
    matchesTableFilter(row.fecha_creacion, filters.fecha_creacion || '') &&
    matchesTableFilter(row.fecha_finalizacion, filters.fecha_finalizacion || ''));
  const pageCount = Math.max(1, Math.ceil(visible.length / 20)), current = Math.min(page, pageCount);
  const change = (key: string, value: string) => { setFilters(prev => ({ ...prev, [key]: value })); setPage(1); };
  const agentOptions = [...new Map((rows ?? []).flatMap(row => row.agentes.map(agent => [agent.id, agent.nombre] as const)))].sort((a,b) => a[1].localeCompare(b[1], 'es'));
  return <div className="space-y-4">
    <TableFilters>{columns.map(([key,label]) => {
      if (key.startsWith('fecha')) return <DatePartsInput key={key} label={label} value={filters[key] || ''} onChange={value => change(key,value)} />;
      const options = key === 'estado' ? Object.entries(states) : key === 'agentes' ? agentOptions : key === 'creada_por'
        ? [...new Set((rows ?? []).map(row => row.creada_por))].sort().map(value => [value,value]) : null;
      return <label key={key} className="block text-xs font-light">{label}{options
        ? <select value={filters[key] || ''} onChange={event => change(key,event.target.value)} className={`${field} cursor-pointer hover:border-blue-700`}>
            <option value="">Todos</option>{options.map(([value,name]) => <option key={value} value={value}>{name}</option>)}</select>
        : <input value={filters[key] || ''} onChange={event => change(key,event.target.value)} className={field} />}</label>;
    })}</TableFilters>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!rows && !error && <p role="status">Cargando campañas…</p>}
    {rows && <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
      <div className="flex justify-end bg-blue-950 px-3 pt-3">
        <Link href={`${campaignPage}/nueva`} className={`cursor-pointer hover:bg-blue-50 ${button}`}>Nueva campaña</Link>
      </div>
      <table className="min-w-full whitespace-nowrap text-left text-sm">
        <thead className="bg-blue-950 text-white"><tr>{['Nombre', 'Fecha de creación', 'Fecha de finalización', 'Estado', 'Creada por', 'Agentes'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody>{visible.slice((current-1)*20,current*20).map(row => <tr key={row.id} className="cursor-pointer border-t hover:bg-blue-50" onClick={() => router.push(`${campaignPage}/${encodeURIComponent(row.id)}`)}>
          <td className="p-3"><Link onClick={event => event.stopPropagation()} className="cursor-pointer font-medium text-blue-900 hover:underline" href={`${campaignPage}/${encodeURIComponent(row.id)}`}>{row.nombre}</Link></td>
          <td className="p-3">{row.fecha_creacion}</td><td className="p-3">{row.fecha_finalizacion || '—'}</td><td className="p-3">{states[row.estado]}</td><td className="p-3">{row.creada_por}</td><td className="p-3">{row.agentes.map(agent => agent.nombre).join(', ') || '—'}</td>
        </tr>)}</tbody>
      </table>
      {!visible.length && <p className="p-4">No hay campañas con estos filtros.</p>}
      <div className="flex items-center justify-end gap-3 border-t p-3">
        <button type="button" className={button} disabled={current <= 1} onClick={() => setPage(current-1)}>Anterior</button>
        <span>Página {current} de {pageCount}</span>
        <button type="button" className={button} disabled={current >= pageCount} onClick={() => setPage(current+1)}>Siguiente</button>
      </div>
    </div>}
  </div>;
}
