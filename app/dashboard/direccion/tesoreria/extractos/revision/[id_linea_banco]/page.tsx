"use client";
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BankReviewWizard from '../../../BankReviewWizard';
export default function ReviewDetail({ params }: { params: Promise<{ id_linea_banco: string }> }) {
  const { id_linea_banco } = use(params), router = useRouter();
  const [line, setLine] = useState<any>(null), [all, setAll] = useState<any[]>([]), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(['/api/v1/direccion/bancos/'+encodeURIComponent(id_linea_banco), '/api/v1/direccion/bancos'].map(url => fetch(url, {signal:controller.signal,cache:'no-store'}).then(async r => {const data = await r.json();if (!r.ok) throw new Error(data.message || 'No se pudo cargar la revisión.');return data;})))
      .then(([l,a]) => {setLine(l);setAll(a);}).catch(e => {if(e.name !== 'AbortError') setError(e.message);});
    return () => controller.abort();
  }, [id_linea_banco]);
  return <main className="min-h-screen bg-gray-100 p-6 lg:p-12"><div className="mx-auto max-w-6xl">{error ? <p role="alert">{error}</p> : line ? <BankReviewWizard key={id_linea_banco} lines={[line]} all={all} onSaved={() => router.push('/dashboard/direccion/tesoreria/extractos/revision')} onClose={() => router.push('/dashboard/direccion/tesoreria/extractos/revision')} /> : <p>Cargando revisión…</p>}</div></main>;
}
