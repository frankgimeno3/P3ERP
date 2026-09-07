'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BancoService } from '@/app/service/BancoService';
import { ProveedorService } from '@/app/service/ProveedorService';

interface LineaBanco {
  id_linea_banco: string; banco: string; fecha_operativa: string; fecha_valor: string; concepto: string;
  importe: number; saldo: number; estado_revision: boolean; comentarios: string; id_proveedor: string; nombre_proveedor: string;
}
interface Proveedor { id_proveedor: string; nombre_proveedor?: string; nombre_fiscal_proveedor?: string; }
const money = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

export default function LineaBancoDetallePage() {
  const { id_linea_banco } = useParams<{ id_linea_banco: string }>();
  const router = useRouter();
  const [linea, setLinea] = useState<LineaBanco | null>(null), [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [providerFilter, setProviderFilter] = useState(''), [saving, setSaving] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');

  useEffect(() => {
    Promise.all([BancoService.getLineaBanco(id_linea_banco), ProveedorService.getProveedores()])
      .then(([movement, providers]) => { setLinea(movement); setProveedores(Array.isArray(providers) ? providers : []); })
      .catch((e: any) => setError(e.message || 'No se pudo cargar el movimiento'));
  }, [id_linea_banco]);
  const shownProviders = useMemo(() => proveedores.filter((provider) => !providerFilter.trim() || [provider.id_proveedor, provider.nombre_proveedor, provider.nombre_fiscal_proveedor].join(' ').toLowerCase().includes(providerFilter.trim().toLowerCase())).slice(0, 12), [providerFilter, proveedores]);
  const selectedProvider = proveedores.find((provider) => provider.id_proveedor === linea?.id_proveedor);
  const save = async () => {
    if (!linea) return;
    try {
      setSaving(true); setError(''); setMessage('');
      const saved = await BancoService.updateLineaBanco(linea.id_linea_banco, { estado_revision: linea.estado_revision, comentarios: linea.comentarios, id_proveedor: linea.id_proveedor || null });
      setLinea({ ...linea, ...saved, nombre_proveedor: selectedProvider?.nombre_proveedor || selectedProvider?.nombre_fiscal_proveedor || '' });
      setMessage('Movimiento guardado.');
    } catch (e: any) { setError(e.message || 'No se pudo guardar el movimiento'); } finally { setSaving(false); }
  };
  if (error && !linea) return <div className="p-12 text-red-700">{error}</div>;
  if (!linea) return <div className="p-12 text-gray-500">Cargando movimiento…</div>;

  return <div className="min-h-screen bg-gray-100 px-12 py-8 text-gray-800">
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-semibold">Detalle del movimiento</h1><p className="mt-1 text-sm text-gray-500">{linea.concepto}</p></div><button type="button" onClick={() => router.push('/dashboard/direccion/bancos')} className="cursor-pointer rounded border border-gray-300 bg-white px-4 py-2 text-sm transition hover:bg-gray-50 hover:shadow-sm">← Volver a bancos</button></div>
      {error && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</p>}
      <div className={`rounded-lg border p-6 shadow-sm ${linea.estado_revision ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-xs font-semibold uppercase text-gray-500">ID</dt><dd className="mt-1 break-all">{linea.id_linea_banco}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-gray-500">Banco</dt><dd className="mt-1">{linea.banco}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-gray-500">Estado</dt><dd className="mt-1">{linea.estado_revision ? 'Revisado' : 'Sin revisar'}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-gray-500">Fecha operativa</dt><dd className="mt-1">{linea.fecha_operativa}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-gray-500">Fecha valor</dt><dd className="mt-1">{linea.fecha_valor}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-gray-500">Importe</dt><dd className="mt-1 font-semibold">{money(linea.importe)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-gray-500">Saldo</dt><dd className="mt-1">{money(linea.saldo)}</dd></div>
          <div className="md:col-span-2"><dt className="text-xs font-semibold uppercase text-gray-500">Concepto</dt><dd className="mt-1">{linea.concepto}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-gray-500">ID proveedor</dt><dd className="mt-1">{linea.id_proveedor || 'Sin asociar'}</dd></div>
          <div className="md:col-span-2"><dt className="text-xs font-semibold uppercase text-gray-500">Nombre proveedor</dt><dd className="mt-1">{selectedProvider?.nombre_proveedor || selectedProvider?.nombre_fiscal_proveedor || linea.nombre_proveedor || 'Sin asociar'}</dd></div>
        </dl>
      </div>
      <div className="mt-5 grid gap-5 rounded-lg bg-white p-6 shadow-sm md:grid-cols-2">
        <div><label className="block text-sm font-medium">Buscar y asociar proveedor<input type="search" value={providerFilter} onChange={e => setProviderFilter(e.target.value)} placeholder="ID o nombre del proveedor" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 outline-none transition hover:border-blue-900 focus:border-blue-950" /></label><div className="mt-2 max-h-52 overflow-y-auto rounded border border-gray-200"><button type="button" onClick={() => setLinea({ ...linea, id_proveedor: '', nombre_proveedor: '' })} className="w-full cursor-pointer border-b p-2 text-left text-sm transition hover:bg-blue-50">Sin proveedor</button>{shownProviders.map(provider => <button key={provider.id_proveedor} type="button" onClick={() => setLinea({ ...linea, id_proveedor: provider.id_proveedor, nombre_proveedor: provider.nombre_proveedor || provider.nombre_fiscal_proveedor || '' })} className={`flex w-full cursor-pointer justify-between gap-3 border-b p-2 text-left text-sm transition hover:bg-blue-50 ${linea.id_proveedor === provider.id_proveedor ? 'bg-blue-100' : ''}`}><span>{provider.nombre_proveedor || provider.nombre_fiscal_proveedor || 'Sin nombre'}</span><span className="shrink-0 text-gray-500">{provider.id_proveedor}</span></button>)}</div></div>
        <div className="space-y-4"><label className="flex cursor-pointer items-center gap-3 rounded border border-gray-200 p-3 transition hover:bg-green-50"><input type="checkbox" checked={linea.estado_revision} onChange={e => setLinea({ ...linea, estado_revision: e.target.checked })} className="cursor-pointer"/><span className="text-sm font-medium">Movimiento revisado</span></label><label className="block text-sm font-medium">Comentarios<textarea value={linea.comentarios} onChange={e => setLinea({ ...linea, comentarios: e.target.value })} rows={6} className="mt-1 w-full rounded border border-gray-300 p-3 outline-none transition hover:border-blue-900 focus:border-blue-950" /></label></div>
        <div className="flex justify-end md:col-span-2"><button type="button" onClick={save} disabled={saving} className="cursor-pointer rounded bg-blue-950 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-900 hover:shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400">{saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
      </div>
    </div>
  </div>;
}
