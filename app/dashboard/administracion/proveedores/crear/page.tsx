'use client';

import Link from 'next/link';
import SupplierCountrySelect from '@/app/components/SupplierCountrySelect';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import { canonicalSupplierName, supplierKey } from '@/server/features/proveedor/supplierNames.js';
import { isSupplierCountry } from '@/app/data/supplierCountries.js';

type Supplier = { id_proveedor: string; nombre_proveedor: string; nombre_fiscal_proveedor: string; vat_code: string };
const root = '/dashboard/administracion/proveedores';
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const fiscalKey = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
const button = 'rounded border px-4 py-2 enabled:cursor-pointer enabled:hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50';

export default function CreateSupplierPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [form, setForm] = useState({ nombre_proveedor: '', vat_code: '', nombre_fiscal_proveedor: '', pais_proveedor: '', moneda_proveedor: 'EUR' });
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/admin/proveedores', { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error('No se pudieron comprobar los proveedores existentes. Recarga la página para reintentar.'); return response.json(); })
      .then(data => { if (!Array.isArray(data)) throw new Error('Respuesta de proveedores no válida.'); setRows(data); })
      .catch(error => { if (error.name !== 'AbortError') setLoadError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const name = normalize(form.nombre_proveedor);
  const vat = fiscalKey(form.vat_code);
  const matches = rows.filter(row => step === 1
    ? name && (normalize(`${row.nombre_proveedor} ${row.nombre_fiscal_proveedor}`).includes(name) || supplierKey(canonicalSupplierName(row.nombre_proveedor)) === supplierKey(canonicalSupplierName(form.nombre_proveedor)))
    : vat && fiscalKey(row.vat_code || '').includes(vat));
  const duplicate = rows.some(row => supplierKey(canonicalSupplierName(row.nombre_proveedor)) === supplierKey(canonicalSupplierName(form.nombre_proveedor)) || (step > 1 && vat && fiscalKey(row.vat_code || '') === vat));
  const advance = (next: number) => { setStep(next); setReviewed(false); setError(''); };
  const save = async () => {
    if (saving || duplicate || loadError || loading || !form.nombre_proveedor.trim()) return;
    if (!isSupplierCountry(form.pais_proveedor)) { setError('Selecciona un país del listado.'); return; }
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/v1/admin/proveedores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo crear el proveedor.');
      router.push(`${root}/${encodeURIComponent(data.id_proveedor)}`);
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo crear el proveedor.'); setSaving(false); }
  };
  return <div className="min-h-screen bg-gray-100 text-gray-800"><MiddleNav tituloprincipal="Crear proveedor" /><main className="mx-auto max-w-3xl px-6 py-10">
    <Link href={root} className="mb-5 inline-block cursor-pointer rounded p-2 text-blue-950 hover:bg-blue-100">← Proveedores</Link>
    <ol className="mb-6 flex flex-wrap gap-4 text-sm">{['Nombre', 'Código fiscal', 'Resto de datos'].map((label, i) => <li key={label} aria-current={step === i + 1 ? 'step' : undefined} className={step === i + 1 ? 'font-bold text-blue-950' : 'text-gray-500'}>{i + 1}. {label}</li>)}</ol>
    <form className="space-y-5 rounded bg-white p-6 shadow" onSubmit={event => { event.preventDefault(); if (step === 3) void save(); else if (reviewed && !duplicate && !loading && !loadError && (step === 1 ? name : vat)) advance(step + 1); }}>
      <h1 className="text-xl font-semibold">{step === 1 ? 'Comprueba el nombre del proveedor' : step === 2 ? 'Comprueba el código fiscal' : 'Completa los datos del proveedor'}</h1>
      {step < 3 ? <>
        <label className="block text-sm">{step === 1 ? 'Nombre del proveedor (obligatorio)' : 'Código fiscal / CIF / VAT'}<input required maxLength={300} value={step === 1 ? form.nombre_proveedor : form.vat_code} onChange={event => { setForm({ ...form, [step === 1 ? 'nombre_proveedor' : 'vat_code']: event.target.value }); setReviewed(false); }} className="mt-1 w-full rounded border px-3 py-2" /></label>
        <div aria-live="polite" className="space-y-2">
          {loading ? <p>Buscando proveedores existentes…</p> : loadError ? <p role="alert" className="text-red-700">{loadError}</p> : (step === 1 ? name : vat) ? <>
            <p>{matches.length ? `${matches.length} coincidencia(s). Abre una ficha para comprobar si ya es tu proveedor.` : 'No se han encontrado coincidencias.'}</p>
            <ul className="max-h-64 overflow-y-auto divide-y">{matches.map(row => <li key={row.id_proveedor}><Link href={`${root}/${encodeURIComponent(row.id_proveedor)}`} className="block cursor-pointer rounded p-3 text-blue-950 hover:bg-blue-50">{row.nombre_proveedor} · {row.nombre_fiscal_proveedor || 'Sin nombre fiscal'} · {row.vat_code || 'Sin código fiscal'}</Link></li>)}</ul>
            {duplicate ? <p className="text-red-700">Ya existe un proveedor con ese nombre o código fiscal. Revisa su ficha o corrige el dato.</p> : <label className="flex cursor-pointer items-center gap-2 rounded p-2 text-sm hover:bg-blue-50"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} className="cursor-pointer" />He revisado las coincidencias y quiero continuar.</label>}
          </> : <p className="text-sm text-gray-500">Introduce el dato para buscar coincidencias.</p>}
        </div>
      </> : <>
        <dl className="rounded bg-gray-50 p-3"><dt className="text-sm text-gray-500">Nombre</dt><dd>{form.nombre_proveedor}</dd><dt className="mt-2 text-sm text-gray-500">Código fiscal</dt><dd>{form.vat_code || 'No indicado'}</dd></dl>
        <label className="block text-sm">Nombre fiscal<input maxLength={300} value={form.nombre_fiscal_proveedor} onChange={event => setForm({ ...form, nombre_fiscal_proveedor: event.target.value })} className="mt-1 w-full rounded border px-3 py-2" /></label>
        <label className="block text-sm">País (obligatorio)<SupplierCountrySelect value={form.pais_proveedor} onChange={value=>setForm({...form,pais_proveedor:value})} /></label>

        <label className="block text-sm">Moneda (código de 3 letras)<input required maxLength={3} pattern="[A-Za-z]{3}" value={form.moneda_proveedor} onChange={event => setForm({ ...form, moneda_proveedor: event.target.value.toUpperCase() })} className="mt-1 w-full rounded border px-3 py-2" /></label>
        <p className="text-sm text-gray-500">El identificador y las fechas de registro se generan automáticamente.</p>
      </>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        {step > 1 && <button type="button" disabled={saving} onClick={() => advance(step - 1)} className={button}>Volver</button>}
        {step === 2 && <button type="button" onClick={() => { setForm({ ...form, vat_code: '' }); advance(3); }} className={button}>No lo sé, saltar</button>}
        <button type="submit" disabled={saving || loading || !!loadError || duplicate || (step < 3 && (!reviewed || !(step === 1 ? name : vat)))} className={`${button} font-semibold text-blue-950`}>{saving ? 'Creando…' : step === 3 ? 'Crear proveedor y abrir ficha' : 'Continuar'}</button>
      </div>
    </form>
  </main></div>;
}
