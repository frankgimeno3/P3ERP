'use client';

import { useEffect, useRef, useState } from 'react';

export type Catalogo = { nombre: string; url: string; fecha: string };
const empty = { nombre: '', url: '' };
const uploadDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', dateStyle: 'short' });
const action = 'cursor-pointer rounded px-2 py-1 text-blue-950 hover:bg-blue-100';

export default function CatalogosCuenta({ items, legacy, onChange }: {
  items: Catalogo[]; legacy: string; onChange: (items: Catalogo[]) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState(empty);
  const [error, setError] = useState('');
  useEffect(() => {
    if (index !== null && !dialog.current?.open) dialog.current?.showModal();
    if (index === null) dialog.current?.close();
  }, [index]);

  function edit(next: number) {
    setIndex(next);
    setError('');
    setDraft(items[next] || empty);
  }

  function save() {
    if (index === null) return;
    try {
      const url = new URL(draft.url.trim());
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
      if (!draft.nombre.trim()) throw new Error();
      const fecha = items[index]?.fecha || uploadDate.format(new Date());
      const item = { nombre: draft.nombre.trim(), url: url.href, fecha };
      onChange(index === -1 ? [...items, item] : items.map((row, current) => current === index ? item : row));
      setIndex(null);
    } catch {
      setError('Indica un nombre del catálogo y una URL HTTP o HTTPS válida.');
    }
  }

  return <section className="space-y-2">
    <h3 className="font-medium">Catálogos</h3>
    {legacy.trim() && <article className="break-words rounded border bg-white p-3 text-sm text-gray-600">{legacy}</article>}
    {!items.length && !legacy.trim() && <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-600">No hay catálogos.</p>}
    {items.map((item, current) => <article key={current} className="space-y-1 rounded border bg-white p-3">
      <a href={item.url} target="_blank" rel="noreferrer" className="block cursor-pointer break-all text-blue-950 hover:underline">{item.nombre}</a>
      <p className="text-sm">{item.fecha}</p><p className="break-all text-xs text-gray-600">{item.url}</p>
      <button type="button" className={action} onClick={() => edit(current)}>Editar</button>
      <button type="button" className={action} onClick={() => onChange(items.filter((_, candidate) => candidate !== current))}>Eliminar</button>
    </article>)}
    <button type="button" onClick={() => edit(-1)}
      className="cursor-pointer rounded-md bg-blue-950 px-4 py-2 font-medium text-white hover:bg-blue-800">Agregar catálogo</button>
    <dialog ref={dialog} onCancel={event => { event.preventDefault(); event.stopPropagation(); setIndex(null); }}
      className="m-auto w-[min(30rem,95vw)] rounded-xl p-5 shadow-xl backdrop:bg-black/40" aria-labelledby="catalogue-dialog">
      <form className="space-y-3" onSubmit={event => { event.preventDefault(); save(); }}>
        <div className="flex items-center justify-between"><h3 id="catalogue-dialog" className="font-semibold">{index === -1 ? 'Agregar catálogo' : 'Editar catálogo'}</h3>
          <button type="button" className={action} aria-label="Cerrar" onClick={() => setIndex(null)}>×</button></div>
        <label className="block">Nombre del catálogo<input required maxLength={250} value={draft.nombre} onChange={event => setDraft({ ...draft, nombre: event.target.value })} className="block w-full rounded border p-2" /></label>
        <label className="block">URL del catálogo<input required type="url" maxLength={2048} value={draft.url} onChange={event => setDraft({ ...draft, url: event.target.value })} className="block w-full rounded border p-2" /></label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button className={action}>Confirmar</button>
      </form>
    </dialog>
  </section>;
}
