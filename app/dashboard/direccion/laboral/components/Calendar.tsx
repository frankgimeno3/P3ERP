'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DateFields, DeleteButton, Field, Form, Header, Modal, Notice, YearField, dateLabel, isoDate, months, request, root, useResource } from './ui';

const categories = {
  vacaciones: { label: 'Vacaciones', color: 'bg-emerald-100 text-emerald-900' },
  festivo_nacional: { label: 'Festivo nacional', color: 'bg-red-100 text-red-900' },
  festivo_autonomico: { label: 'Festivo autonómico', color: 'bg-orange-100 text-orange-900' },
  festivo_barcelona: { label: 'Festivo Barcelona', color: 'bg-amber-100 text-amber-900' },
  festivo_convenio: { label: 'Festivo convenio', color: 'bg-purple-100 text-purple-900' },
  deadline_revista: { label: 'Deadline revista', color: 'bg-blue-100 text-blue-900' },
  publicacion_revista: { label: 'Publicación revista', color: 'bg-cyan-100 text-cyan-900' },
  feria: { label: 'Feria', color: 'bg-pink-100 text-pink-900' },
};
type Category = keyof typeof categories;
type Event = { id: string; anio: number; tipo: Category; titulo: string; inicio: string; fin: string; comentarios: string };
type CalendarData = { anio: number; eventos: Event[] };

export function CalendarList() {
  const router = useRouter(), { data, loading, error } = useResource<Array<{ anio: number; eventos: number }>>('calendarios');
  const [adding, setAdding] = useState(false), [year, setYear] = useState(new Date().getFullYear());
  return <><Header title="Calendario laboral"><button className="laboral-button" onClick={() => setAdding(true)}>Agregar año</button></Header><section className="laboral-card"><Notice error={error} /><table><thead><tr><th>Año</th><th>Eventos</th></tr></thead><tbody>{data?.map(row => <tr key={row.anio} data-interactive tabIndex={0} onClick={() => router.push(`${root}/calendario-laboral/${row.anio}`)} onKeyDown={e => { if (e.key === 'Enter') router.push(`${root}/calendario-laboral/${row.anio}`); }}><td><Link href={`${root}/calendario-laboral/${row.anio}`} className="rounded text-blue-900 hover:underline">{row.anio}</Link></td><td>{row.eventos}</td></tr>)}</tbody></table>{loading ? <p className="p-4">Cargando años…</p> : !data?.length && !error && <p className="p-4 text-slate-500">Agrega un año para empezar a configurar su calendario.</p>}</section>{adding && <Modal title="Agregar calendario anual" onClose={() => setAdding(false)}><Form label="Abrir calendario" onSave={async () => { const result = await request<{ anio: number }>('calendarios','POST',{ anio: year }); router.push(`${root}/calendario-laboral/${result.anio}`); }}><YearField value={year} onChange={setYear} /></Form></Modal>}</>;
}

export function CalendarDetail({ year }: { year: string }) {
  const { data, loading, error, reload } = useResource<CalendarData>(`calendarios/${year}`);
  const [editing, setEditing] = useState<Partial<Event> | null>(null);
  const startEvent = (date: string, tipo: Category = 'deadline_revista') => setEditing({ anio: Number(year), inicio: date, fin: date, tipo, titulo: '', comentarios: '' });
  return <><Header title={`Calendario laboral ${year}`} back={`${root}/calendario-laboral`}><button disabled={!data || loading || !!error} className="laboral-button" onClick={() => startEvent(`${year}-01-01`,'vacaciones')}>Agregar periodo o evento</button></Header><Notice error={error} />{loading && <p>Cargando calendario…</p>}{data && !error && !loading && <>
    <section className="laboral-card mb-5"><h2 className="mb-3 text-lg font-semibold text-blue-950">Vacaciones, festivos y eventos</h2><div className="mb-4 flex flex-wrap gap-2">{Object.entries(categories).map(([key,category]) => <button key={key} className={`rounded px-3 py-2 ${category.color}`} onClick={() => startEvent(`${year}-01-01`,key as Category)}>+ {category.label}</button>)}</div><div className="overflow-x-auto"><table><thead><tr><th>Tipo</th><th>Nombre</th><th>Desde</th><th>Hasta</th><th>Comentarios</th><th>Acciones</th></tr></thead><tbody>{data.eventos.map(event => <tr key={event.id}><td><span className={`rounded px-2 py-1 ${categories[event.tipo].color}`}>{categories[event.tipo].label}</span></td><td>{event.titulo}</td><td>{dateLabel(event.inicio)}</td><td>{dateLabel(event.fin)}</td><td className="max-w-sm whitespace-pre-wrap">{event.comentarios || '—'}</td><td><div className="flex gap-2"><button className="laboral-secondary" onClick={() => setEditing(event)}>Editar</button><DeleteButton path={`eventos/${event.id}`} onDeleted={reload} /></div></td></tr>)}</tbody></table></div>{!data.eventos.length && <p className="py-4 text-slate-500">Aún no hay periodos ni eventos. Agrega los festivos y vacaciones de este año.</p>}</section>
    <section className="laboral-card"><h2 className="text-lg font-semibold text-blue-950">Calendario de {year}</h2><p className="mb-4 mt-1 text-slate-500">Pulsa un día para añadir un deadline, una publicación, una feria u otro elemento.</p><div className="mb-5 flex flex-wrap gap-2">{Object.entries(categories).map(([key,category]) => <span key={key} className={`rounded px-2 py-1 text-xs ${category.color}`}>{category.label}</span>)}</div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{months.map((month,index) => {
      const count = new Date(Number(year),index + 1,0).getDate(), offset = (new Date(Number(year),index,1).getDay() + 6) % 7;
      return <div key={month} className="rounded border border-slate-200 p-3"><h3 className="mb-3 font-semibold text-blue-950">{month}</h3><div className="grid grid-cols-7 gap-1 text-center text-xs">{['L','M','X','J','V','S','D'].map((label,i) => <span key={i} className="py-1 text-slate-500">{label}</span>)}{Array.from({ length: offset },(_,i) => <span key={`empty-${i}`} />)}{Array.from({ length: count },(_,i) => {
        const date = `${year}-${String(index + 1).padStart(2,'0')}-${String(i + 1).padStart(2,'0')}`, events = data.eventos.filter(e => date >= e.inicio && date <= e.fin);
        const description = events.map(e => `${categories[e.tipo].label}: ${e.titulo}`).join('; ');
        return <button key={date} aria-label={`${dateLabel(date)}${description ? `: ${description}` : ''}. Agregar elemento`} title={description || 'Agregar elemento'} className={`min-h-12 rounded border border-transparent p-1 hover:border-blue-800 ${events.length ? categories[events[0].tipo].color : (offset + i) % 7 >= 5 ? 'bg-slate-100 text-slate-500' : 'bg-white text-slate-800'}`} onClick={() => startEvent(date)}><span className="block">{i + 1}</span>{events.length > 0 && <span className="block text-[10px]">{events.length} {events.length === 1 ? 'evento' : 'eventos'}</span>}</button>;
      })}</div></div>;
    })}</div></section>
  </>}{editing && <Modal title={editing.id ? 'Editar elemento del calendario' : 'Agregar elemento del calendario'} onClose={() => setEditing(null)}><EventForm initial={editing} onSaved={() => { setEditing(null); reload(); }} /></Modal>}</>;
}

function EventForm({ initial, onSaved }: { initial: Partial<Event>; onSaved: () => void }) {
  const [form,setForm] = useState({ anio: initial.anio!, tipo: initial.tipo || 'vacaciones', titulo: initial.titulo || '', inicio: initial.inicio || '', fin: initial.fin || '', comentarios: initial.comentarios || '' });
  return <Form onSave={async () => { await request(`eventos${initial.id ? `/${initial.id}` : ''}`,initial.id ? 'PUT' : 'POST',{ ...form,inicio: isoDate(form.inicio),fin: isoDate(form.fin) }); onSaved(); }}><Field label="Tipo"><select value={form.tipo} onChange={e => setForm({ ...form,tipo: e.target.value as Category })}>{Object.entries(categories).map(([key,category]) => <option key={key} value={key}>{category.label}</option>)}</select></Field><Field label="Nombre"><input required maxLength={300} value={form.titulo} onChange={e => setForm({ ...form,titulo: e.target.value })} placeholder="Nombre del festivo, revista, feria o periodo" /></Field><div className="grid gap-4 sm:grid-cols-2"><DateFields label="Desde" value={form.inicio} onChange={inicio => setForm({ ...form,inicio })} /><DateFields label="Hasta" value={form.fin} onChange={fin => setForm({ ...form,fin })} /></div><Field label="Comentarios"><textarea value={form.comentarios} onChange={e => setForm({ ...form,comentarios: e.target.value })} /></Field></Form>;
}
