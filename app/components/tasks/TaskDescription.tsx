'use client';
import { useEffect, useState } from 'react';

export function taskDescriptionPreview(value: string, limit = 55) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  return { text: words.length > limit ? words.slice(0, limit).join(' ') + '…' : value || '—', truncated: words.length > limit };
}
export default function TaskDescription({ value, title = 'Descripción de la tarea' }: { value: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const preview = taskDescriptionPreview(value);
  useEffect(() => { if (!open) return; const close = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [open]);
  return <><p className="whitespace-pre-line break-words">{preview.text}</p>{preview.truncated && <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(true); }} className="mt-2 cursor-pointer rounded border border-blue-200 px-3 py-1 text-sm text-blue-900 hover:bg-blue-50">Abrir</button>}{open && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onClick={e => e.stopPropagation()}><section role="dialog" aria-modal="true" aria-label={title} className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 text-slate-900 shadow-xl"><button type="button" aria-label="Cerrar descripción" onClick={() => setOpen(false)} className="absolute right-3 top-2 cursor-pointer rounded px-2 text-2xl hover:bg-slate-100">×</button><h2 className="mb-5 pr-8 text-lg font-semibold">{title}</h2><p className="whitespace-pre-wrap break-words text-sm leading-7">{value}</p></section></div>}</>;
}
