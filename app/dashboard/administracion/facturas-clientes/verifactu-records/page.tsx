"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { FacturaService } from "@/app/service/FacturaService";

const columns = ["id","invoice_id","record_type","issuer_nif","issuer_name","invoice_series","invoice_number","invoice_date","customer_nif","customer_name","invoice_type","tax_breakdown_json","total_amount","previous_record_id","previous_invoice_number","previous_invoice_date","previous_hash","current_hash","generated_at","aeat_status","aeat_csv","aeat_error_code","aeat_error_description","xml_payload","xml_response","sent_at","accepted_at","software_version","installation_id","created_at"];
const text = (value: unknown) => typeof value === "object" ? JSON.stringify(value) : String(value ?? "");

export default function VerifactuRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { FacturaService.getVerifactuRecords().then(v => setRecords(Array.isArray(v) ? v : [])).catch(() => setError("No se pudieron cargar los registros.")); }, []);
  const visibleColumns = complete ? columns : columns.slice(0, 2);
  const filtered = useMemo(() => records.filter(record => visibleColumns.every(column => !filters[column]?.trim() || text(record[column]).toLowerCase().includes(filters[column].trim().toLowerCase()))), [records, filters, complete]);

  return <div className="min-h-screen bg-gray-100 text-gray-700">
    <MiddleNav tituloprincipal="Registros VERI*FACTU" />
    <main className="p-6 lg:p-12">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <p className="font-medium text-blue-950">Se muestra la tabla en vista {complete ? "completa" : "simplificada"}</p>
        <button type="button" onClick={() => setComplete(value => !value)} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm text-white transition hover:bg-blue-800">
          {complete ? "Pasar a vista simplificada" : "Ampliar a datos completos"}
        </button>
      </div>
      <div className="mb-4 flex justify-end"><Link href="/dashboard/administracion/facturas-clientes" className="cursor-pointer rounded border border-blue-950 px-4 py-2 text-sm text-blue-950 transition hover:bg-blue-50">Volver a facturas</Link></div>
      {error && <p className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="overflow-x-auto rounded-xl bg-white shadow"><table className="min-w-full text-xs">
        <thead className="bg-blue-950 text-white"><tr>{visibleColumns.map(column => <th key={column} className="p-3 text-left font-medium">{column}</th>)}</tr>
          <tr className="bg-white text-gray-700">{visibleColumns.map(column => <th key={column} className="p-2"><input aria-label={`Filtrar ${column}`} value={filters[column] || ""} onChange={event => setFilters(current => ({...current, [column]: event.target.value}))} className="w-full min-w-40 rounded border border-blue-200 px-2 py-1.5 outline-none transition focus:border-blue-950" placeholder={`Filtrar ${column}`} /></th>)}</tr>
        </thead>
        <tbody>{filtered.map(record => <tr key={record.id} className="border-t transition hover:bg-blue-50">{visibleColumns.map(column => <td key={column} className="max-w-xs truncate p-3" title={text(record[column])}>{text(record[column]) || "—"}</td>)}</tr>)}
          {!filtered.length && !error && <tr><td colSpan={visibleColumns.length} className="p-8 text-center text-gray-500">No hay registros que coincidan con los filtros.</td></tr>}
        </tbody>
      </table></div>
    </main>
  </div>;
}
