'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/app/apiClient';
import TableFilters from '@/app/components/TableFilters';
import TableColumnFilter from '@/app/components/TableColumnFilter';
import TaskDescription from './TaskDescription';
import { taskStates } from './TaskList';
import { taskCalendarDay, taskCalendarMonth } from '@/app/lib/myTaskCalendar.js';

export default function MyTaskCalendar() {
  const [month, setMonth] = useState(() => { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit' }).formatToParts(new Date()); return new Date(Number(parts.find(p => p.type === 'year')?.value), Number(parts.find(p => p.type === 'month')?.value) - 1, 1); });
  const [rows, setRows] = useState<any[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [filters, setFilters] = useState<Record<string, string>>({}), [highlight, setHighlight] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    apiClient.get('/api/v1/tareas', { signal: controller.signal }).then(r => setRows(r.data || [])).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const year = month.getFullYear(), monthIndex = month.getMonth(), monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const matches = rows.filter(row => ['nombre', 'estado', 'nombre_cuenta', 'descripcion'].every(key => String(key === 'estado' ? taskStates[row.estado] : row[key] || '').toLocaleLowerCase('es').includes((filters[key] || '').trim().toLocaleLowerCase('es'))));
  const visible = matches.filter(row => !taskCalendarDay(row) || taskCalendarDay(row).startsWith(monthKey)).sort((a, b) => (taskCalendarDay(a) || '9999').localeCompare(taskCalendarDay(b) || '9999'));
  const weeks = taskCalendarMonth(year, monthIndex);
  const title = month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(' de ', ' - ');
  const taskLink = (row: any) => `/tareas/${encodeURIComponent(row.id)}`;
  return <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
    <div className="min-w-0 rounded-lg border bg-white"><header className="flex items-center justify-between gap-3 border-b p-4"><button type="button" aria-label="Mes anterior" onClick={() => { setMonth(new Date(year, monthIndex - 1, 1)); setHighlight(''); }} className="cursor-pointer rounded border px-3 py-2 hover:bg-blue-50">←</button><h2 className="text-center text-lg font-semibold capitalize">{title}</h2><button type="button" aria-label="Mes siguiente" onClick={() => { setMonth(new Date(year, monthIndex + 1, 1)); setHighlight(''); }} className="cursor-pointer rounded border px-3 py-2 hover:bg-blue-50">→</button></header>
      <div className="overflow-x-auto"><div className="min-w-[570px]"><div className="grid grid-cols-6 bg-slate-100 text-center text-xs font-semibold">{['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(day => <div key={day} className="p-2">{day}</div>)}</div>
        {weeks.map((week: Array<number | null>, index: number) => <div key={index} className="grid grid-cols-6">{week.map((day, column) => { const date = `${monthKey}-${String(day).padStart(2, '0')}`; return <div key={column} className={`min-h-28 min-w-0 border-r border-t p-1 ${day ? '' : 'bg-slate-50'}`}>{day && <><span className="mb-1 block px-1 text-xs font-medium">{day}</span>{visible.filter(row => taskCalendarDay(row) === date).map(row => <Link key={row.id} data-calendar-task={row.id} href={taskLink(row)} onMouseEnter={() => setHighlight(row.id)} onMouseLeave={() => setHighlight('')} onFocus={() => setHighlight(row.id)} onBlur={() => setHighlight('')} className={`mb-1 block cursor-pointer break-words rounded border-2 px-1 py-1 text-xs transition hover:bg-blue-100 ${highlight === row.id ? 'border-blue-600 bg-blue-50' : 'border-transparent bg-slate-100'}`}>{row.nombre}</Link>)}</>}</div>; })}</div>)}
      </div></div><p className="border-t p-3 text-xs text-slate-500">De lunes a sábado. Las tareas sin fecha y las de domingo aparecen en las tarjetas de la derecha.</p>
    </div>
    <aside className="min-w-0 space-y-3"><TableFilters>{[['nombre', 'Tarea'], ['estado', 'Estado'], ['nombre_cuenta', 'Cuenta'], ['descripcion', 'Descripción']].map(([key, label]) => <div key={key}>{key === 'estado' ? <label className="block text-xs font-extralight"><span className="mb-1 block">Estado</span><select aria-label="Filtrar Estado" value={filters.estado || ''} onChange={e => setFilters(old => ({ ...old, estado: e.target.value }))} className="w-full cursor-pointer rounded border bg-white p-2 font-normal hover:border-blue-900"><option value="">Todos los estados</option>{Object.values(taskStates).map(state => <option key={state}>{state}</option>)}</select></label> : <TableColumnFilter label={label} value={filters[key] || ''} onChange={value => setFilters(old => ({ ...old, [key]: value }))} />}</div>)}</TableFilters><h3 className="text-sm font-semibold">Tareas del mes y sin fecha ({visible.length})</h3>
      {loading && <p role="status">Cargando tareas…</p>}{error && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}
      <div className="max-h-[75vh] space-y-3 overflow-y-auto p-1">{visible.map(row => <article key={row.id} data-task-card={row.id} onMouseEnter={() => setHighlight(row.id)} onMouseLeave={() => setHighlight('')} onFocus={() => setHighlight(row.id)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHighlight(''); }} className={`rounded-lg border-2 bg-white p-3 transition ${highlight === row.id ? 'border-blue-600' : 'border-slate-200'}`}><Link href={taskLink(row)} className="cursor-pointer font-semibold text-blue-950 hover:underline">{row.nombre}</Link><p className="my-2 text-xs text-slate-500">{taskStates[row.estado]} · {row.nombre_cuenta || 'Sin cuenta'}</p><p className="mb-2 text-xs">{taskCalendarDay(row) ? new Date(taskCalendarDay(row) + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Sin fecha'}</p><div className="text-sm text-slate-700"><TaskDescription value={row.descripcion || ''} title={row.nombre} /></div></article>)}</div>
      {!loading && !error && !visible.length && <p className="text-sm text-slate-500">No hay tareas en este mes con estos filtros.</p>}
    </aside>
  </section>;
}
