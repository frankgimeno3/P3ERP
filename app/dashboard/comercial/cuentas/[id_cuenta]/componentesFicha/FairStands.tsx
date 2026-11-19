'use client';

import { useEffect, useState } from 'react';
import SearchableSelect from '@/app/components/SearchableSelect';

export type FairStand = { id_feria: string; fecha: string; hall: string; stand: string };
export type FairEdition = {
  id_feria: string; id_feria_base: string; nombre_feria: string; titulo_especifico_edicion: string;
  fecha_inicio: string | null; fecha_incio: string;
};
const empty = { id_feria: '', fecha: '', hall: '', stand: '' };
const control = 'block rounded border bg-white px-3 py-2 enabled:cursor-pointer enabled:hover:border-blue-700';
const field = 'mt-1 w-full rounded border px-3 py-2';
const date = (row: FairEdition) => row.fecha_inicio?.slice(0, 10).split('-').reverse().join('/') || row.fecha_incio || '';
const editionName = (row: FairEdition) => row.titulo_especifico_edicion || row.nombre_feria || row.id_feria;

function StandEditor({ initial, editions, occupied, onClose, onConfirm }: {
  initial?: FairStand; editions: FairEdition[]; occupied: string[]; onClose: () => void; onConfirm: (stand: FairStand) => void;
}) {
  const [draft, setDraft] = useState(initial || empty);
  const group = (row: FairEdition) => row.id_feria_base || row.nombre_feria || row.id_feria;
  const [fair, setFair] = useState(() => {
    const row = editions.find(row => row.id_feria === initial?.id_feria);
    return row ? group(row) : '';
  });
  const choices = editions.filter(row => !occupied.includes(row.id_feria));
  const fairs = [...new Map(choices.map(row => [group(row), row.nombre_feria || editionName(row)])).entries()].map(([value, label]) => ({ value, label }));
  const editionsForFair = choices.filter(row => group(row) === fair);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/40 p-4">
    <section role="dialog" aria-modal="true" aria-label={initial ? 'Editar stand' : 'Añadir stand'} className="relative w-full max-w-lg space-y-4 rounded-lg bg-white p-6">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute right-3 top-2 cursor-pointer rounded px-2 text-xl hover:bg-gray-100">×</button>
      <h3 className="pr-8 text-lg font-semibold">{initial ? 'Editar stand' : 'Añadir stand'}</h3>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (draft.id_feria) onConfirm({ ...draft, hall: draft.hall.trim(), stand: draft.stand.trim() }); }}>
        <div><p className="mb-1">Feria</p><SearchableSelect label="Feria" required value={fair} options={fairs} onChange={value => { setFair(value); setDraft({ ...draft, id_feria: '', fecha: '' }); }} /></div>
        {fair && <div><p className="mb-1">Edición</p><SearchableSelect label="Edición" required value={draft.id_feria} options={editionsForFair.map(row => ({ value: row.id_feria, label: [editionName(row), date(row)].filter(Boolean).join(' · ') }))}
          onChange={value => {
            const row = editionsForFair.find(item => item.id_feria === value);
            setDraft({ ...draft, id_feria: value, fecha: row ? date(row) : '' });
          }} /></div>}
        {draft.id_feria && <div className="grid grid-cols-2 gap-3">
          <label>Hall<input maxLength={120} className={field} value={draft.hall} onChange={event => setDraft({ ...draft, hall: event.target.value })} /></label>
          <label>Stand<input maxLength={120} className={field} value={draft.stand} onChange={event => setDraft({ ...draft, stand: event.target.value })} /></label>
        </div>}
        <button type="submit" disabled={!draft.id_feria} className={`${control} disabled:opacity-50`}>Confirmar</button>
      </form>
    </section>
  </div>;
}

export default function FairStands({ editions, stands, legacy, onChange }: {
  editions: FairEdition[]; stands: FairStand[]; legacy: string; onChange: (stands: FairStand[]) => void;
}) {
  const [editor, setEditor] = useState<number | 'new'>();
  const [removing, setRemoving] = useState<number>();
  useEffect(() => {
    if (removing === undefined) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setRemoving(undefined); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [removing]);
  return <section className="space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold">Stands en próximas ferias</h3>
      <button type="button" aria-label="Añadir stand" className={control} disabled={!editions.length} onClick={() => setEditor('new')}>+</button>
    </div>
    {!stands.length && <p className="text-gray-600">Sin stands registrados.</p>}
    {stands.map((stand, index) => {
      const row = editions.find(row => row.id_feria === stand.id_feria);
      return <article key={stand.id_feria} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4 shadow">
        <div><p className="font-medium">{row ? editionName(row) : stand.id_feria}</p><p className="text-sm text-gray-600">{[stand.fecha, stand.hall && `Hall ${stand.hall}`, stand.stand && `Stand ${stand.stand}`].filter(Boolean).join(' · ') || 'Sin stand asignado'}</p></div>
        <div className="flex gap-2"><button type="button" className={control} disabled={!row} onClick={() => setEditor(index)}>Editar</button><button type="button" className={control} onClick={() => setRemoving(index)}>Eliminar</button></div>
      </article>;
    })}
    {legacy && <details className="rounded border p-3"><summary className="cursor-pointer hover:text-blue-800">Notas históricas de stands</summary><p className="mt-2 whitespace-pre-wrap">{legacy}</p></details>}
    {editor !== undefined && <StandEditor initial={typeof editor === 'number' ? stands[editor] : undefined}
      editions={editions} occupied={stands.filter((_, index) => index !== editor).map(row => row.id_feria)}
      onClose={() => setEditor(undefined)} onConfirm={stand => {
        onChange(editor === 'new' ? [...stands, stand] : stands.map((row, index) => index === editor ? stand : row));
        setEditor(undefined);
      }} />}
    {removing !== undefined && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-label="Eliminar stand" className="relative w-full max-w-md space-y-4 rounded-lg bg-white p-6">
      <button type="button" aria-label="Cerrar" className="absolute right-3 top-2 cursor-pointer px-2 text-xl hover:bg-gray-100" onClick={() => setRemoving(undefined)}>×</button>
      <h3 className="font-semibold">¿Eliminar el stand de la cuenta?</h3>
      <div className="flex gap-3"><button type="button" className={control} onClick={() => setRemoving(undefined)}>Cancelar</button>
        <button type="button" className={control} onClick={() => { onChange(stands.filter((_, index) => index !== removing)); setRemoving(undefined); }}>Eliminar</button></div>
    </section></div>}
  </section>;
}
