"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { PrevisionIngresosService } from "@/app/service/PrevisionIngresosService";
import AdditionalIncomeWizard from "./AdditionalIncomeWizard";
import ReceiptExcelModal from "./ReceiptExcelModal";

type TabKey = "todos" | "recibos" | "transfers" | "remesas";
type Column = { key: string; label: string; date?: boolean; money?: boolean };
const tabs: { key: TabKey; label: string }[] = [
  { key: "todos", label: "Todos" }, { key: "recibos", label: "Recibos" },
  { key: "transfers", label: "Transfers" }, { key: "remesas", label: "Remesas" },
];
const incomeColumns: Column[] = [
  { key: "id_orden", label: "Orden" }, { key: "cliente", label: "Cliente" },
  { key: "id_contrato", label: "Contrato" }, { key: "id_factura", label: "Factura" },
  { key: "numero_cobro", label: "Nº cobro" }, { key: "etiqueta_cobro", label: "Etiqueta" },
  { key: "fecha_teorica_cobro", label: "Fecha teórica", date: true }, { key: "fecha_real_cobro", label: "Fecha real", date: true },
  { key: "forma_cobro", label: "Forma cobro" }, { key: "banco_cobro", label: "Banco" },
  { key: "base_imponible", label: "Base imponible", money: true }, { key: "cobro_total", label: "Cobro total", money: true },
  { key: "cobrada", label: "Estado de cobro" },
];
const receiptColumns: Column[] = [
  { key: "numero_recibo", label: "Número de recibo" }, { key: "numero_remesa", label: "Número de remesa" },
  { key: "remesa_en_carpeta", label: "Remesa en carpeta" }, { key: "importe_remesa", label: "Importe remesa", money: true },
  { key: "fecha_creacion", label: "Fecha creación", date: true },
];
const remesaColumns: Column[] = [
  { key: "id_remesa", label: "Remesa" }, { key: "created_at", label: "Fecha de creación", date: true },
  { key: "updated_at", label: "Última actualización", date: true },
  { key: "remesa_en_carpeta", label: "Remesa en carpeta" }, { key: "numero_recibos", label: "Nº recibos" },
  { key: "importe_total", label: "Importe total", money: true }, { key: "fecha_teorica", label: "Fecha teórica", date: true },
  { key: "fecha_real_cobro", label: "Fecha de cobro", date: true }, { key: "cobrada", label: "Estado de cobro" },
  { key: "clientes", label: "Clientes" },
];
const receiptIncomeColumns = [...incomeColumns, ...receiptColumns];
const remesaDateFormatter = new Intl.DateTimeFormat("es-ES", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s/g, "");
const cellValue = (row: any, column: Column) => {
  const value = row[column.key];
  if (column.key === "cobrada") return value ? "Cobrada" : "Pendiente";
  if (column.key === "id_factura") return row.numero_factura || value || "-";
  if (column.key === "created_at" || column.key === "updated_at") {
    const date = typeof value === "string" && value.trim() ? new Date(value) : new Date(NaN);
    return Number.isNaN(date.getTime()) ? "-" : remesaDateFormatter.format(date);
  }
  if (column.money) return value == null || !Number.isFinite(Number(value)) ? "-" : Number(value).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  if (column.key === "id_orden" && row.es_excel) return "-";
  return String(value ?? "") || "-";
};

export default function PrevisionIngresosPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("todos");
  const [result, setResult] = useState<{ tab: TabKey; reloadKey: number; ordenes: any[]; error: string } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showAdditionalIncome, setShowAdditionalIncome] = useState(false);
  const [showReceiptExcel, setShowReceiptExcel] = useState(false);
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const loading = result?.tab !== tab || result?.reloadKey !== reloadKey;
  const ordenes = useMemo(() => loading ? [] : result?.ordenes ?? [], [loading, result]);
  const error = loading ? "" : result?.error ?? "";

  useEffect(() => {
    let active = true;
    const fetchOrdenes = async () => {
      try {
        const data = await PrevisionIngresosService.getOrdenes(tab);
        if (active) setResult({ tab, reloadKey, ordenes: Array.isArray(data) ? data : [], error: "" });
      } catch (err) {
        if (!active) return;
        console.error("Error fetching previsión de ingresos:", err);
        setResult({ tab, reloadKey, ordenes: [], error: "No se ha podido cargar la previsión de ingresos." });
      }
    };
    void fetchOrdenes();
    return () => { active = false; };
  }, [reloadKey, tab]);

  const columns = tab === "remesas" ? remesaColumns : tab === "transfers" ? incomeColumns : receiptIncomeColumns;
  const filterRows = [columns.slice(0, Math.ceil(columns.length / 2)), columns.slice(Math.ceil(columns.length / 2))];
  const ordenesFiltradas = useMemo(() => ordenes.filter(orden => columns.every(column => {
    if (column.date) {
      const value = cellValue(orden, column).split(/[ ,]/)[0].split("/");
      return ["dd", "mm", "yyyy"].every((part, index) => {
        const query = filters[column.key + "_" + part] || "";
        return !query || value[index]?.padStart(index === 2 ? 4 : 2, "0") === query.padStart(index === 2 ? 4 : 2, "0");
      });
    }
    const query = (filters[column.key] || "").trim();
    return !query || normalize(cellValue(orden, column)).includes(normalize(query));
  })), [ordenes, columns, filters]);

  return <div className="flex min-h-screen w-full flex-col bg-gray-200 text-slate-900">
    <MiddleNav tituloprincipal="Previsión ingresos" />
    <div className="min-h-screen w-full bg-gray-100 px-6 py-10 text-slate-900 xl:px-12">
      <div className="mb-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipo de ingreso">
            {tabs.map(item => <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} onClick={() => { setTab(item.key); setFilters({}); }} className={"cursor-pointer rounded px-4 py-2 text-sm transition " + (tab === item.key ? "bg-blue-950 text-white hover:bg-blue-900" : "bg-white text-gray-700 hover:bg-gray-200")}>{item.label}</button>)}
          </div>
          <div className="flex flex-wrap gap-2">
            {tab === "todos" && <button type="button" onClick={() => setShowAdditionalIncome(true)} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900 hover:shadow-md">Agregar ingreso sin contrato</button>}
            <button type="button" onClick={() => setShowReceiptExcel(true)} className="cursor-pointer rounded border border-blue-950 bg-white px-4 py-2 text-sm font-semibold text-blue-950 transition hover:bg-blue-50 hover:shadow-md">Agregar excel de recibos</button>
          </div>
        </div>
        <div className="overflow-x-auto rounded border border-gray-200 bg-white p-4">
          <div className="grid gap-3" style={{ gridTemplateRows: "repeat(2, auto)", minWidth: Math.ceil(columns.length / 2) * 140 }}>
            {filterRows.map((row, index) => <div key={index} className="grid gap-3" style={{ gridTemplateColumns: "repeat(" + row.length + ", minmax(0, 1fr))" }}>
              {row.map(column => column.date ? <fieldset key={column.key} className="min-w-0"><legend className="mb-1 text-xs font-medium text-slate-600">{column.label}</legend><div className="flex gap-1">{["dd", "mm", "yyyy"].map(part => <input key={part} aria-label={column.label + ": " + part} inputMode="numeric" maxLength={part === "yyyy" ? 4 : 2} placeholder={part} value={filters[column.key + "_" + part] || ""} onChange={e => setFilters(current => ({ ...current, [column.key + "_" + part]: e.target.value.replace(/\D/g, "") }))} className="min-w-0 w-full rounded border border-gray-300 px-1 py-2 text-sm outline-none focus:border-blue-950" />)}</div></fieldset> : <label key={column.key} className="min-w-0 text-xs font-medium text-slate-600">{column.label}<input type="search" value={filters[column.key] || ""} onChange={e => setFilters(current => ({ ...current, [column.key]: e.target.value }))} placeholder={"Filtrar " + column.label.toLowerCase()} className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm font-normal outline-none focus:border-blue-950" /></label>)}
            </div>)}
          </div>
          <button type="button" onClick={() => setFilters({})} disabled={!Object.values(filters).some(Boolean)} className="mt-3 cursor-pointer rounded px-2 py-1 text-sm text-blue-950 transition enabled:hover:bg-blue-50 disabled:cursor-default disabled:text-gray-400">Limpiar filtros</button>
        </div>
      </div>
      {notice && <p role="status" className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto bg-white">
        <table className="min-w-full">
          <thead className="bg-blue-950 text-white"><tr>{columns.map(column => <th key={column.key} className="whitespace-nowrap p-3 text-left font-light">{column.label}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={columns.length} className="p-6 text-center text-gray-500">{tab === "remesas" ? "Cargando remesas…" : "Cargando previsión…"}</td></tr> : ordenesFiltradas.length === 0 ? <tr><td colSpan={columns.length} className="p-6 text-center text-gray-500">No hay resultados para esta pestaña y sus filtros.</td></tr> : ordenesFiltradas.map(orden => {
              const interactive = tab !== "remesas" && !orden.es_adicional && !orden.es_excel;
              const open = () => router.push("/dashboard/administracion/control-administrativo/" + encodeURIComponent(orden.id_orden));
              return <tr key={tab === "remesas" ? orden.id_remesa : orden.id_orden} tabIndex={interactive ? 0 : undefined} onClick={interactive ? open : undefined} onKeyDown={interactive ? event => { if (event.key === "Enter") open(); } : undefined} className={"border-b border-gray-200 " + (interactive ? "cursor-pointer transition hover:bg-blue-50 focus:bg-blue-50" : orden.es_adicional ? "bg-emerald-50/40" : "")}>
                {columns.map(column => <td key={column.key} className="whitespace-nowrap p-3">{cellValue(orden, column)}</td>)}
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {showReceiptExcel && <ReceiptExcelModal onClose={() => setShowReceiptExcel(false)} onImported={count => { setNotice(count + " recibos importados o actualizados correctamente."); setReloadKey(current => current + 1); }} />}
      {showAdditionalIncome && <AdditionalIncomeWizard onClose={() => setShowAdditionalIncome(false)} onCreated={() => { setShowAdditionalIncome(false); setReloadKey(current => current + 1); }} />}
    </div>
  </div>;
}
