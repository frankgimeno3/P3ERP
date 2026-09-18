import { getPgPool } from '@/server/database/pgClient.js';
import catalog from '@/database/rds-table-catalog.json';

export const dynamic = 'force-dynamic';

type Column = { name: string; type: string; nullable: boolean; defaultValue: string | null; primary: boolean; description: string | null };
type Table = { name: string; description: string; columns: Column[] };

export default async function RdsPage() {
  const { rows } = await getPgPool().query(`
    SELECT cls.relname AS table_name, obj_description(cls.oid, 'pg_class') AS table_description,
      att.attname AS column_name, format_type(att.atttypid, att.atttypmod) AS column_type,
      NOT att.attnotnull AS nullable, pg_get_expr(def.adbin, def.adrelid) AS default_value,
      col_description(cls.oid, att.attnum) AS column_description,
      EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conrelid = cls.oid AND con.contype = 'p'
        AND att.attnum = ANY(con.conkey)) AS is_primary
    FROM pg_class cls
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    JOIN pg_attribute att ON att.attrelid = cls.oid AND att.attnum > 0 AND NOT att.attisdropped
    LEFT JOIN pg_attrdef def ON def.adrelid = cls.oid AND def.adnum = att.attnum
    WHERE ns.nspname = 'public' AND cls.relkind IN ('r', 'p')
    ORDER BY cls.relname, att.attnum
  `);
  const descriptions = new Map(catalog.map(table => [table.name, table.description]));
  const tables = new Map<string, Table>();
  for (const row of rows) {
    if (!tables.has(row.table_name)) tables.set(row.table_name, {
      name: row.table_name,
      description: row.table_description || descriptions.get(row.table_name) || 'Tabla sin descripción funcional.',
      columns: [],
    });
    tables.get(row.table_name)!.columns.push({
      name: row.column_name,
      type: row.column_type,
      nullable: row.nullable,
      defaultValue: row.default_value,
      primary: row.is_primary,
      description: row.column_description,
    });
  }

  return <main className="min-h-screen bg-gray-100 px-6 py-8 text-slate-900 lg:px-12">
    <h1 className="text-2xl font-semibold">Tablas RDS</h1>
    <p className="mt-2 text-sm text-slate-600">Esquema actual de PostgreSQL. Los nombres, columnas, tipos, claves y valores por defecto se leen directamente de RDS en cada visita.</p>
    <p className="mt-3 text-sm font-medium">{tables.size} tablas</p>
    <div className="mt-6 space-y-3">
      {[...tables.values()].map(table => <details key={table.name} className="group rounded-lg border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer rounded-lg px-5 py-4 transition hover:bg-blue-50 hover:text-blue-900">
          <span className="font-semibold">{table.name}</span>
          <span className="ml-3 text-sm text-slate-500">{table.columns.length} columnas</span>
          <p className="mt-1 text-sm font-normal text-slate-600">{table.description}</p>
        </summary>
        <div className="overflow-x-auto border-t border-slate-200">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50"><tr><th className="px-4 py-2">Columna</th><th className="px-4 py-2">Tipo</th><th className="px-4 py-2">Nulo</th><th className="px-4 py-2">Por defecto</th><th className="px-4 py-2">Descripción</th></tr></thead>
            <tbody>{table.columns.map(column => <tr key={column.name} className="border-t border-slate-100">
              <td className="px-4 py-2 font-mono">{column.name}{column.primary ? ' 🔑' : ''}</td>
              <td className="px-4 py-2">{column.type}</td>
              <td className="px-4 py-2">{column.nullable ? 'Sí' : 'No'}</td>
              <td className="px-4 py-2 font-mono text-xs">{column.defaultValue || '—'}</td>
              <td className="px-4 py-2">{column.description || '—'}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </details>)}
    </div>
  </main>;
}
