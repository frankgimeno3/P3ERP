'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/app/apiClient';
import SearchableSelect from '@/app/components/SearchableSelect';
import { validateContentIntake, validateIntakeFiles } from '@/app/lib/productionManagement.js';
import {contentMagazineFormats} from '@/app/lib/contentMagazineFormat';
import ProductionFilePicker,{uploadDescriptors,type ProductionUpload} from '@/app/components/ProductionFilePicker';
import Link from 'next/link';

const button = 'rounded border px-4 py-2 enabled:cursor-pointer enabled:hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50';
const input = 'mt-1 w-full rounded border border-gray-300 bg-white p-2 disabled:bg-gray-100';
const labels: Record<string, string> = { articulo: 'Artículo', anuncio: 'Anuncio', otro: 'Otro' };
export default function ContentIntakeModal({ onClose,contracted,magazine }: { onClose: () => void;contracted:boolean;magazine:boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(1), [data, setData] = useState<any>({ tipo: '', contratado: contracted,ambito:magazine?'revista':'otros', id_cuenta: '', id_contrato: '', id_contenido: '',id_servicio:'', sin_empresa: false, nombre: '', descripcion: '', para_revista: magazine, id_revista: '',formato_revista:'impreso_digital' });
  const [accounts, setAccounts] = useState<any[]>([]), [accountQuery, setAccountQuery] = useState(''), [options, setOptions] = useState<any>({ contracts: [], contents: [], magazines: [] }), [magazines, setMagazines] = useState<any[]>([]);
  const [files, setFiles] = useState<ProductionUpload[]>([]), [mode, setMode] = useState('archivos'), [error, setError] = useState(''), [busy, setBusy] = useState(false), [optionLoading, setOptionLoading] = useState(false), [started, setStarted] = useState(false), [progress, setProgress] = useState(''), [summary, setSummary] = useState<any>(null);
  const batch = useRef(''), uploaded = useRef<any[]>([]);
  useEffect(() => { batch.current = crypto.randomUUID(); }, []);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [onClose]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => apiClient.get('/api/v1/comercial/cuentas', { params: { limit: 100, clienteFiltro: accountQuery }, signal: controller.signal }).then(r => setAccounts(old => [...new Map([...old, ...(Array.isArray(r.data) ? r.data : r.data?.rows || [])].map(a => [a.id_cuenta, a])).values()])).catch(e => { if (!controller.signal.aborted) setError(e.message); }), 200);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [accountQuery]);
  useEffect(() => {
    const controller = new AbortController(); setOptionLoading(true);
    apiClient.get('/api/v1/produccion/gestion/opciones', { params: { id_cuenta: data.id_cuenta, id_contrato: data.id_contrato, id_contenido: data.id_contenido, tipo: data.tipo,ambito:data.ambito }, signal: controller.signal }).then(r => setOptions(r.data)).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setOptionLoading(false); });
    return () => controller.abort();
  }, [data.id_cuenta, data.id_contrato, data.id_contenido, data.tipo,data.ambito]);
  useEffect(() => { let active = true; apiClient.get('/api/v1/produccion/gestiones-produccion').then(r => { if (active) setMagazines(r.data || []); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  const descriptors = () => uploadDescriptors(files);
  const payload = () => ({ ...data, modo: mode, materiales: descriptors(), id_carga: batch.current });
  const change = (patch: any) => { setData((old: any) => ({ ...old, ...patch })); setError(''); setSummary(null); };
  const next = async () => {
    setError('');
    if (step === 1 && !data.tipo) { setError('Selecciona el tipo de contenido.'); return; }
    if (step === 2) {
      const errors = validateContentIntake(data);
      if (data.contratado && options.magazines.length && !data.id_revista) errors.push('Selecciona la revista del contenido.');
      if (errors.length) { setError(errors.join(' ')); return; }
    }
    if (step === 3) {
      const errors = validateIntakeFiles(descriptors(), mode);
      if (errors.length) { setError(errors.join(' ')); return; }
      setStep(4); setBusy(true);
      try { setSummary((await apiClient.post('/api/v1/produccion/gestion/validar', payload())).data); }
      catch (e: any) { setError(e.message); }
      finally { setBusy(false); }
      return;
    }
    setStep(step + 1);
  };
  const submit = async () => {
    if (busy || !summary) return;
    setBusy(true); setStarted(true); setError('');
    try {
      const body = payload();
      if (files.some((_, i) => !uploaded.current[i])) {
        setProgress('Preparando la subida…');
        const signed = (await apiClient.post('/api/v1/produccion/gestion/presign', body)).data.files;
        for (let i = 0; i < files.length; i++) {
          if (uploaded.current[i]) continue;
          setProgress(`Subiendo material ${i + 1} de ${files.length}: ${files[i].nombre_material}`);
          const response = await fetch(signed[i].uploadUrl, { method: 'PUT', headers: { 'Content-Type': body.materiales[i].contentType }, body: files[i].file });
          if (!response.ok) throw new Error(`No se pudo subir ${files[i].file.name}. Puedes reintentar.`);
          uploaded.current[i] = { ...body.materiales[i], mediaId: signed[i].mediaId, s3Key: signed[i].s3Key };
        }
      }
      setProgress('Registrando el contenido y sus materiales…');
      const result = (await apiClient.post('/api/v1/produccion/gestion', { ...body, materiales: uploaded.current })).data;
      router.push(`/dashboard/produccion/repositorio/contenidos/${encodeURIComponent(result.id_contenido)}`);
    } catch (e: any) { setError(e.message || 'No se pudo completar la subida. Puedes reintentar sin duplicar los materiales.'); }
    finally { setBusy(false); }
  };
  const magazineOptions = (data.contratado ? options.magazines : magazines).map((row: any) => ({ value: row.id_revista, label: `${row.revista} · ${row.edicion} · ${row.numero_publicacion}` }));
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="intake-title" className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 text-slate-900 shadow-xl">
    <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute right-3 top-2 rounded px-2 text-2xl cursor-pointer hover:bg-gray-100">×</button>
    <h2 id="intake-title" className="pr-8 text-xl font-semibold">{contracted?'Agregar contenido asociado a contrato':'Agregar contenidos sin contrato'}</h2><p className="mb-6 mt-1 text-sm text-slate-500">Paso {step} de 4 · {['Tipo de contenido', data.contratado ? 'Empresa, contrato y contenido' : 'Datos del contenido', 'Materiales', 'Confirmación'][step - 1]}</p>
    <p className="mb-4 text-sm text-slate-600">{contracted?'Selecciona un contenido pendiente que ya figure en el contrato para aportar sus materiales. Se conserva el contenido contratado y sus importes.':'Crea un contenido nuevo sin contrato y aporta sus materiales.'} {magazine?'Solo artículos y anuncios destinados a revista.':'Aquí se gestionan los contenidos de otros servicios.'}</p>
    {contracted&&<p className="mb-4 text-sm">Si aún no figura en ningún contrato, <Link href="/dashboard/comercial/contratos/crear" className="cursor-pointer text-blue-900 hover:underline">crea un contrato</Link> que lo contenga o acepta su propuesta.</p>}
    <form onSubmit={event => { event.preventDefault(); if (step < 4) void next(); else void submit(); }}>
      <fieldset disabled={busy || started} className="space-y-4">
        {step === 1 && <div className="flex flex-wrap gap-3">{Object.entries(labels).filter(([value])=>!magazine||value!=='otro').map(([value, label]) => <button key={value} type="button" aria-pressed={data.tipo === value} onClick={() => change({ tipo: value, id_contenido: '', id_revista: '', para_revista: magazine })} className={`${button} ${data.tipo === value ? 'border-blue-950 bg-blue-50 font-semibold' : ''}`}>{label}</button>)}</div>}
        {step === 2 && <>
          {!data.contratado && <label className="flex items-center gap-2 rounded p-2 has-enabled:cursor-pointer hover:bg-blue-50"><input type="checkbox" checked={data.sin_empresa} onChange={e => change({ sin_empresa: e.target.checked, id_cuenta: '' })} className="enabled:cursor-pointer" />Sin empresa</label>}
          {!data.sin_empresa && <div><span className="mb-1 block text-sm">Empresa / cuenta *</span><SearchableSelect label="Empresa / cuenta" value={data.id_cuenta} onChange={value => change({ id_cuenta: value, id_contrato: '', id_contenido: '', id_revista: '' })} options={accounts.map(a => ({ value: a.id_cuenta, label: a.nombre_empresa || a.id_cuenta }))} onSearchChange={setAccountQuery} /></div>}
          {data.contratado ? <><div><span className="mb-1 block text-sm">Contrato *</span><SearchableSelect label="Contrato" disabled={!data.id_cuenta || optionLoading} value={data.id_contrato} onChange={value => change({ id_contrato: value, id_contenido: '', id_revista: '' })} options={options.contracts.map((row: any) => ({ value: row.id_contrato, label: `${row.id_contrato} · ${row.nombre_contrato || 'Contrato'}` }))} /></div><div><span className="mb-1 block text-sm">Contenido contratado *</span><SearchableSelect label="Contenido contratado" disabled={!data.id_contrato || optionLoading} value={data.id_contenido} onChange={value => change({ id_contenido: value, id_revista: '' })} options={options.contents.map((row: any) => ({ value: row.id_contenido, label: `${row.id_contenido} · ${row.nombre_contenido}` }))} /></div>{data.id_contrato && !optionLoading && !options.contents.length && <p className="text-sm text-amber-800">Este contrato no tiene contenidos pendientes del tipo seleccionado.</p>}</> : <><label className="block text-sm">Nombre *<input maxLength={2000} value={data.nombre} onChange={e => change({ nombre: e.target.value })} className={input} /></label><label className="block text-sm">Descripción (opcional)<textarea maxLength={10000} value={data.descripcion} onChange={e => change({ descripcion: e.target.value })} className={input} /></label></>}
          {!contracted&&!magazine&&(options.services||[]).length>0&&<div><span className="mb-1 block text-sm">Servicio (opcional)</span><SearchableSelect label="Servicio" value={data.id_servicio} onChange={value=>change({id_servicio:value})} options={[{value:'',label:'Sin servicio asociado'},...(options.services||[]).map((row:any)=>({value:row.id_servicio,label:row.nombre_servicio_es||row.id_servicio}))]}/></div>}
          {((!data.contratado && data.para_revista) || (data.contratado && data.id_contenido && magazineOptions.length > 0)) && <div><span className="mb-1 block text-sm">Revista *</span><SearchableSelect label="Revista" value={data.id_revista} onChange={value => change({ id_revista: value })} options={magazineOptions} /></div>}
        </>}
        {step === 2 && !data.contratado && data.para_revista && <label className="block text-sm">Formato del contenido<select value={data.formato_revista} onChange={event=>change({formato_revista:event.target.value})} className={`${input} enabled:cursor-pointer enabled:hover:border-blue-900`}>{contentMagazineFormats.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
        {step === 3 && <><div className="flex gap-3">{[['archivos','Archivos individuales'],['zip','Archivo ZIP']].map(([value,label])=><button key={value} type="button" aria-pressed={mode===value} className={button} onClick={()=>{setMode(value);setFiles([]);setError('');}}>{label}</button>)}</div><ProductionFilePicker files={files} onChange={setFiles} onError={setError} disabled={busy||started} single={mode==='zip'} zipOnly={mode==='zip'}/></>}
      </fieldset>
      {step === 4 && <div className="space-y-3 rounded border bg-slate-50 p-4">{busy && !summary ? <p>Comprobando los datos…</p> : summary ? <><p className="font-semibold text-green-800">Todo está correcto. Puedes iniciar la subida.</p><p>{labels[data.tipo]} · {summary.nombre}</p><p>{summary.cuenta} · {data.contratado ? `Contrato ${data.id_contrato}` : 'Sin vínculo contratado'}</p><p>Destino: {magazine?'Contenido revista':'Otros contenidos'}</p>{summary.revista && <p>Revista: {summary.revista.revista} · {summary.revista.edicion} · {summary.revista.numero_publicacion}</p>}<ul className="list-disc pl-5">{files.map((row, index) => <li key={index}>{row.nombre_material}{row.descripcion && ` — ${row.descripcion}`}</li>)}</ul><p className="text-sm text-slate-500">{files.length} materiales. No se ha iniciado la subida hasta pulsar Subir.</p></> : <p className="text-red-800">Hay errores. Vuelve atrás para corregirlos.</p>}</div>}
      {error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-800">{error}</p>}{progress && <p role="status" className="mt-3 text-sm text-blue-900">{progress}</p>}
      <div className="mt-6 flex justify-between gap-3"><button type="button" disabled={busy || started || step === 1} onClick={() => { setStep(step - 1); setError(''); setSummary(null); }} className={button}>Anterior</button><button type="submit" disabled={busy || optionLoading || (step === 4 && !summary)} className="rounded bg-blue-950 px-5 py-2 text-white enabled:cursor-pointer enabled:hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-400">{busy ? 'Procesando…' : step === 4 ? started ? 'Reintentar subida' : 'Subir' : 'Continuar'}</button></div>
    </form>
  </section></div>;
}
