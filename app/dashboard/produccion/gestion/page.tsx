'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUrlState } from '@/app/lib/useUrlState';
import ModuleTabs from '@/app/components/ModuleTabs';
import TableFilters from '@/app/components/TableFilters';
import TableColumnFilter from '@/app/components/TableColumnFilter';
import SortableTable from '@/app/components/SortableTable';
import { matchesTableFilter } from '@/app/lib/dateFilters';
import apiClient from '@/app/apiClient';
import ContentIntakeModal from './ContentIntakeModal';

const contentColumns = [['id_contenido', 'ID contenido'], ['nombre_cuenta', 'Cuenta'], ['nombre_contenido', 'Contenido'], ['id_contrato', 'Contrato'], ['estado', 'Estado'], ['deadline_contenido', 'Fecha límite']] as const;
const magazineColumns = [['numero_publicacion', 'Número'], ['revista', 'Revista'], ['region', 'Región'], ['sector', 'Sector']] as const;
const emptyFilters = Object.fromEntries([...contentColumns, ...magazineColumns].map(([key]) => [key, '']));
export default function ProductionManagementPage() {
  const [type, setType] = useUrlState<string>('gestion.tipo', 'articulo'), [view, setView] = useUrlState<string>('gestion.vista', 'revista'), [magazine, setMagazine] = useUrlState<string>('gestion.revista', '');
  const [filters, setFilters] = useUrlState<Record<string, string>>('gestion.filtros', emptyFilters);
  const [rows, setRows] = useState<any[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [modal, setModal] = useState(false);
  const activeType = ['articulo', 'anuncio', 'otro'].includes(type) ? type : 'articulo';
  const magazineList = activeType !== 'otro' && view !== 'todos' && !magazine;
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setRows([]);
    const request = magazineList ? apiClient.get('/api/v1/produccion/gestiones-produccion', { signal: controller.signal }) : apiClient.get('/api/v1/produccion/gestion', { params: { tipo: activeType, revista: activeType !== 'otro' && view !== 'todos' ? magazine : '' }, signal: controller.signal });
    request.then(response => { if (!controller.signal.aborted) setRows(response.data || []); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [activeType, view, magazine, magazineList]);
  const columns = magazineList ? magazineColumns : contentColumns;
  const visible = rows.filter(row => columns.every(([key]) => matchesTableFilter(String(row[key] || '').toLocaleLowerCase('es'), (filters[key] || '').trim().toLocaleLowerCase('es'))));
  return <main className="min-h-screen bg-gray-100 p-6 text-slate-900 lg:p-12">
    <h1 className="mb-6 text-2xl font-semibold text-blue-950">Contenidos pendientes de publicar</h1>
    <div className="mb-5 rounded-lg border bg-white p-4"><button type="button" onClick={() => setModal(true)} className="cursor-pointer rounded bg-blue-950 px-5 py-3 text-white transition hover:bg-blue-800">Agregar contenidos</button></div>
    <ModuleTabs plain label="Tipo de contenido" value={activeType} items={[{ value: 'articulo', label: 'Artículos' }, { value: 'anuncio', label: 'Anuncios' }, { value: 'otro', label: 'Otros' }]} onChange={value => { setType(value); setMagazine(''); setView('revista'); setFilters({}); }} />
    <section role="tabpanel" className="rounded-b-lg border bg-white p-4 lg:p-5">
      {activeType !== 'otro' && <div className="mb-5 flex flex-wrap gap-2">{[['revista', 'Filtrar por revista'], ['todos', 'Mostrar todos']].map(([value, label]) => <button key={value} type="button" aria-pressed={view === value} onClick={() => { setView(value); setMagazine(''); setFilters({}); }} className={`cursor-pointer rounded border px-4 py-2 transition hover:bg-blue-100 ${view === value ? 'border-blue-950 bg-blue-50 font-semibold' : ''}`}>{label}</button>)}</div>}
      {!magazineList && activeType !== 'otro' && view !== 'todos' && <button type="button" onClick={() => { setMagazine(''); setFilters({}); }} className="mb-4 cursor-pointer rounded px-3 py-2 text-blue-900 hover:bg-blue-50">← Elegir otra revista</button>}
      {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-800">{error}</p>}
      <TableFilters>{columns.map(([key, label]) => <div key={key}><TableColumnFilter label={label} value={filters[key] || ''} onChange={value => setFilters(old => ({ ...old, [key]: value }))} /></div>)}</TableFilters>
      <div className="overflow-x-auto"><SortableTable className="w-full text-left text-xs"><thead className="bg-blue-950 text-white"><tr>{columns.map(([key, label]) => <th key={key} className="p-3">{label}</th>)}</tr></thead><tbody>{visible.map(row => <tr key={row.id_contenido || row.id_revista} className="border-t hover:bg-blue-50">{columns.map(([key]) => <td key={key} className="p-3">{magazineList ? <button type="button" onClick={() => { setMagazine(row.id_revista); setFilters({}); }} className="block w-full cursor-pointer text-left hover:text-blue-900 hover:underline">{String(row[key] || '—')}</button> : <Link href={`/dashboard/produccion/gestion/${encodeURIComponent(row.id_contenido)}`} className="block cursor-pointer hover:text-blue-900 hover:underline">{String(row[key] || '—')}</Link>}</td>)}</tr>)}</tbody></SortableTable></div>
      {loading ? <p role="status" className="p-5">Cargando…</p> : !visible.length && <p className="p-5">No hay {magazineList ? 'revistas' : 'contenidos pendientes'} con estos filtros.</p>}
    </section>
    {modal && <ContentIntakeModal onClose={() => setModal(false)} />}
  </main>;
}
