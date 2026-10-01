'use client';
import { useRef, useState } from 'react';
import SupplierCountrySelect from '@/app/components/SupplierCountrySelect';
import SearchableSelect from '@/app/components/SearchableSelect';

const currencyCodes = (Intl as typeof Intl & { supportedValuesOf: (key: string) => string[] }).supportedValuesOf('currency');

export default function SupplierDataFields({ supplier, onSaved }: { supplier: any; onSaved: (supplier: any) => void }) {
  const [draft, setDraft] = useState(supplier);
  const latest = useRef(supplier);
  const pending = useRef(false);
  const busy = useRef(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    if (busy.current) return;
    busy.current = true;
    setError('');
    try {
      while (pending.current) {
        const snapshot = latest.current;
        if (!snapshot.nombre_proveedor.trim()) {
          setStatus('');
          setError('El nombre es obligatorio. Los cambios todavía no se han guardado.');
          break;
        }
        if (!snapshot.pais_proveedor || !snapshot.moneda_proveedor) {
          setStatus('');
          setError('Selecciona un país y una moneda para guardar los cambios.');
          break;
        }
        pending.current = false;
        setStatus('Guardando…');
        const response = await fetch(`/api/v1/admin/proveedores/${encodeURIComponent(snapshot.id_proveedor)}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre_proveedor: snapshot.nombre_proveedor,
            nombre_fiscal_proveedor: snapshot.nombre_fiscal_proveedor || '', vat_code: snapshot.vat_code || '',
            pais_proveedor: snapshot.pais_proveedor || '', moneda_proveedor: snapshot.moneda_proveedor || '',
            Comentarios_proveedor: snapshot.Comentarios_proveedor || '' }),
        });
        const saved = await response.json();
        if (!response.ok) throw new Error(saved.message || 'No se han podido guardar los cambios.');
        onSaved(saved);
        if (!pending.current) setStatus('Cambios guardados.');
      }
    } catch (cause: any) {
      pending.current = true;
      setStatus('');
      setError(cause.message || 'No se han podido guardar los cambios.');
    } finally { busy.current = false; }
  };
  const change = (key: string, value: string) => {
    latest.current = { ...latest.current, [key]: value };
    setDraft(latest.current);
    pending.current = true;
    void save();
  };
  return <div className="w-full space-y-5">
    <div className="grid grid-cols-2 gap-5">
    <label className="block font-medium">Nombre<input className="mt-2 block w-full rounded border bg-white px-3 py-2 font-normal" value={draft.nombre_proveedor || ''} onChange={event => change('nombre_proveedor', event.target.value)} /></label>
    <label className="block font-medium">Identificador<input readOnly className="mt-2 block w-full cursor-not-allowed rounded border bg-gray-100 px-3 py-2 font-normal text-gray-600" value={draft.id_proveedor || ''} /></label>
    {([['nombre_fiscal_proveedor', 'Nombre fiscal'], ['vat_code', 'CIF/VAT']] as const).map(([key, label]) => <label key={key} className="block font-medium">{label}<input className="mt-2 block w-full rounded border bg-white px-3 py-2 font-normal" value={draft[key] || ''} onChange={event => change(key, event.target.value)} /></label>)}
    <div className="font-medium">País<div className="mt-2 font-normal"><SupplierCountrySelect value={draft.pais_proveedor || ''} onChange={value => change('pais_proveedor', value)} /></div></div>
    <div className="font-medium">Moneda<div className="mt-2 font-normal"><SearchableSelect label="Moneda" required options={Array.from(new Set([...currencyCodes, supplier.moneda_proveedor].filter(Boolean))).map(value => ({ value, label: value }))} value={draft.moneda_proveedor || ''} onChange={value => change('moneda_proveedor', value)} /></div></div>
    </div>
    <label className="block font-medium">Comentarios del proveedor<textarea rows={5} className="mt-2 block w-full rounded border bg-white p-3 font-normal" value={draft.Comentarios_proveedor || ''} onChange={event => change('Comentarios_proveedor', event.target.value)} /></label>
    <p role="status" aria-live="polite" className="text-sm text-gray-600">{status}</p>
    {error && <div role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}<button type="button" onClick={() => void save()} className="ml-3 cursor-pointer rounded border px-3 py-1 hover:bg-red-100">Reintentar guardado</button></div>}
  </div>;
}
