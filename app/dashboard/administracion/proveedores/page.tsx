'use client';
import { useEffect, useMemo, useState } from 'react';
import TableColumnFilter from '@/app/components/TableColumnFilter';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import { useRouter } from 'next/navigation';
import { ProveedorService } from '@/app/service/ProveedorService';

const money = (value?: number) => Number(value || 0) ? `${Number(value).toLocaleString('es-ES')} EUR` : '-';
export default function ProveedoresPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => { ProveedorService.getProveedores().then(data => setRows(Array.isArray(data) ? data : [])).catch(() => setError('No se han podido cargar los proveedores.')).finally(() => setLoading(false)); }, []);
  const [columns, setColumns] = useState<Record<string,string>>({});
  const fields=['nombre_proveedor','nombre_fiscal_proveedor','vat_code','pais_proveedor','moneda_proveedor','numero_pagos','total_pagos','ultimo_pago'];
  const shown = useMemo(() => { return rows.filter(row => Object.entries(columns).every(([key, value]) => String(key==='total_pagos'?money(row[key]):row[key]??'').toLowerCase().includes(value.trim().toLowerCase()))); }, [rows, columns]);
  return <div className="min-h-screen bg-gray-100 text-gray-700"><MiddleNav tituloprincipal="Proveedores" /><main className="px-12 py-10"><div className="mb-4 flex justify-end"><button onClick={() => router.push('/dashboard/administracion/proveedores/crear')} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-900">Crear proveedor</button></div>{error && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="overflow-x-auto bg-white"><table className="min-w-full"><thead className="bg-blue-950 text-white"><tr>{['Proveedor','Nombre fiscal','VAT','País','Moneda','Pagos','Total pagos','Último pago'].map((label,index) => <th key={label} className="p-2 text-left font-light first:pl-6"><TableColumnFilter label={label} value={columns[fields[index]]||''} onChange={value=>setColumns(current=>({...current,[fields[index]]:value}))}/></th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={8} className="p-6 text-center text-gray-500">Cargando proveedores...</td></tr> : shown.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-gray-500">No hay proveedores.</td></tr> : shown.map(row => <tr key={row.id_proveedor} onClick={() => router.push(`/dashboard/administracion/proveedores/${encodeURIComponent(row.id_proveedor)}`)} className="cursor-pointer transition hover:bg-blue-50"><td className="border-b p-2">{row.nombre_proveedor || '-'}</td><td className="border-b p-2">{row.nombre_fiscal_proveedor || '-'}</td><td className="border-b p-2">{row.vat_code || '-'}</td><td className="border-b p-2">{row.pais_proveedor || '-'}</td><td className="border-b p-2">{row.moneda_proveedor || '-'}</td><td className="border-b p-2">{row.numero_pagos}</td><td className="border-b p-2">{money(row.total_pagos)}</td><td className="border-b p-2">{row.ultimo_pago || '-'}</td></tr>)}</tbody></table></div></main></div>;
}
