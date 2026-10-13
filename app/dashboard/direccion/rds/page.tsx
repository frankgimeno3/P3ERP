
import SortableTable from '@/app/components/SortableTable';
import {getRdsSchema} from '@/server/features/database/RdsSchemaRepository.js';
import columnCatalog from '@/database/rds-column-catalog.json';
import catalog from '@/database/rds-table-catalog.json';

export const dynamic = 'force-dynamic';

export default async function RdsPage() {
  const relations=await getRdsSchema(catalog,columnCatalog);
  const tables=new Map(relations.map(table=>[table.name,table]));
  const tableCount=relations.filter(table=>table.kind==='table').length;
  const viewCount=relations.length-tableCount;
  const consultedAt=new Date();
  return <main className="min-h-screen bg-gray-100 px-6 py-8 text-slate-900 lg:px-12">
    <h1 className="text-2xl font-semibold">Tablas RDS</h1>
    <p className="mt-2 text-sm text-slate-600">Esquema actual de PostgreSQL. Tablas, vistas, columnas, tipos, claves, referencias y valores por defecto se leen directamente de RDS en cada visita.</p>
    <p className="mt-2 text-xs text-slate-500">Consultado: <time dateTime={consultedAt.toISOString()}>{new Intl.DateTimeFormat("es-ES",{dateStyle:"short",timeStyle:"medium",timeZone:"Europe/Madrid"}).format(consultedAt)}</time></p>
    <p className="mt-3 text-sm font-medium">{tableCount} tablas · {viewCount} vistas</p>
    <div className="mt-6 space-y-3">
      {[...tables.values()].map(table => <details key={table.name} className="group rounded-lg border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer rounded-lg px-5 py-4 transition hover:bg-blue-50 hover:text-blue-900">
          <span className="font-semibold">{table.name}</span><span className="ml-3 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{table.kind==='table'?'Tabla':table.kind==='view'?'Vista':'Vista materializada'}</span>
          <span className="ml-3 text-sm text-slate-500">{table.columns.length} columnas</span>
          <p className="mt-1 text-sm font-normal text-slate-600">{table.description}</p>
        </summary>
        <div className="overflow-x-auto border-t border-slate-200">
          <SortableTable className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50"><tr><th className="px-4 py-2">Columna</th><th className="px-4 py-2">Tipo</th><th className="px-4 py-2">Nulo</th><th className="px-4 py-2">Por defecto</th><th className="px-4 py-2">Referencias</th><th className="px-4 py-2">Descripción</th></tr></thead>
            <tbody>{table.columns.map(column => <tr key={column.name} className="border-t border-slate-100">
              <td className="px-4 py-2 font-mono">{column.name}{column.primary ? ' 🔑' : ''}</td>
              <td className="px-4 py-2">{column.type}</td>
              <td className="px-4 py-2">{column.nullable ? 'Sí' : 'No'}</td>
              <td className="px-4 py-2 font-mono text-xs">{column.defaultValue ?? '—'}</td>
              <td className="px-4 py-2 font-mono text-xs">{column.references.length?column.references.join(', '):'—'}</td>
              <td className="px-4 py-2">{column.description || '—'}</td>
            </tr>)}</tbody>
          </SortableTable>
        </div>
      </details>)}
    </div>
  </main>;
}
