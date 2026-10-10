'use client';
import { useEffect, useState } from 'react';
import { OrdenService } from '@/app/service/OrdenService';

export default function CollectionClosureModal({ order, onSaved, onClose }: { order: any; onSaved: (order: any) => void; onClose: () => void }) {
  const [reason, setReason] = useState(''), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const reopening = Boolean(order.cobro_cerrado);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose, saving]);
  async function confirm(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      onSaved(await OrdenService.changeCollectionClosure(order.id_orden, { action: reopening ? 'reabrir_cobro' : 'cerrar_cobro', version: order.updated_at, reason }));
    } catch (e: any) { setError(e?.response?.data?.message || e.message || 'No se pudo guardar el cierre.'); }
    finally { setSaving(false); }
  }
  const button = 'rounded border px-4 py-2 enabled:cursor-pointer enabled:hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50';
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"><form onSubmit={confirm} role="dialog" aria-modal="true" aria-labelledby="collection-closure-title" className="w-full max-w-xl space-y-4 rounded-xl bg-white p-6 text-slate-900 shadow-xl">
    <header className="flex items-center justify-between gap-4"><h2 id="collection-closure-title" className="text-xl font-semibold">{reopening ? 'Reabrir gestión del cobro' : 'Cerrar cobro por acuerdo'}</h2><button type="button" aria-label="Cerrar" disabled={saving} onClick={onClose} className="rounded px-3 text-2xl enabled:cursor-pointer enabled:hover:bg-gray-100 disabled:opacity-50">×</button></header>
    <p>{reopening ? 'El saldo sin cobrar volverá a las reclamaciones y previsiones. Se conserva el motivo del cierre anterior.' : 'El saldo pendiente dejará de reclamarse y de sumarse como ingreso previsto. Los importes de la factura y los cobros reales se conservan. Este cierre no registra un ingreso ni emite un abono fiscal.'}</p>
    {!reopening && <><p>Saldo pendiente: {Number(order.importe_pendiente ?? order.cobro_total).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}.</p><label className="block text-sm font-normal">Motivo del cierre<textarea required maxLength={3000} rows={4} disabled={saving} value={reason} onChange={event => setReason(event.target.value)} className="mt-1 w-full rounded border p-3 disabled:bg-gray-100" /></label></>}
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <footer className="flex justify-end gap-3"><button type="button" disabled={saving} className={button} onClick={onClose}>Cancelar</button><button type="submit" disabled={saving || !reopening && !reason.trim()} className={button}>{saving ? 'Guardando…' : reopening ? 'Confirmar reapertura' : 'Confirmar cierre'}</button></footer>
  </form></div>;
}
