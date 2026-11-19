'use client';

import { useEffect, useRef, useState } from 'react';
import apiClient from '@/app/apiClient';

const pictures = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp']);

export default function MaterialThumbnail({ id, name, extension }: { id: string; name: string; extension?: string | null }) {
  const ext = extension?.toLowerCase() || name.match(/[.]([a-z0-9]+)$/i)?.[1]?.toLowerCase() || '';
  const image = pictures.has(ext);
  const wrapper = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!image || !wrapper.current) return;
    const controller = new AbortController();
    const load = () => apiClient.get<{ url: string }>(`/api/v1/produccion/gestiones-produccion/materiales/${encodeURIComponent(id)}/descarga`, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setUrl(data.url); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    if (typeof IntersectionObserver === 'undefined') { void load(); return () => controller.abort(); }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); void load(); }
    }, { rootMargin: '120px' });
    observer.observe(wrapper.current);
    return () => { observer.disconnect(); controller.abort(); };
  }, [id, image]);

  const word = ext === 'doc' || ext === 'docx' || ext === 'rtf';
  const sheet = ['xls', 'xlsx', 'csv', 'ods'].includes(ext);
  const color = ext === 'pdf' ? 'bg-red-50 text-red-700' : word ? 'bg-blue-50 text-blue-800' : sheet ? 'bg-green-50 text-green-800' : 'bg-slate-100 text-slate-600';
  return <div ref={wrapper} className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md ${color}`}>
    {image && url && !failed ? (
      // eslint-disable-next-line @next/next/no-img-element -- The signed URL is scoped to a private original.
      <img src={url} alt="" className="h-full w-full object-contain" onError={() => setFailed(true)} />
    ) : ext === 'msg' || ext === 'eml' ? (
      <svg role="img" aria-label="Correo electrónico" className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
    ) : <span className="text-sm font-bold" aria-label={word ? 'Word' : undefined}>{word ? 'W' : ext ? ext.toUpperCase() : 'Archivo'}</span>}
  </div>;
}
