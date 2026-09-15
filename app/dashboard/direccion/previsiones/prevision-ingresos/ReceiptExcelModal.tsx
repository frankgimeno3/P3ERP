"use client";
import { useEffect, useRef, useState } from "react";
import { PrevisionIngresosService } from "@/app/service/PrevisionIngresosService";

const columns = [
  ["numero_recibo", "Número de recibo"], ["numero_remesa", "Número de remesa"],
  ["remesa_en_carpeta", "Remesa en carpeta"], ["cliente", "Cliente"],
  ["importe_recibo", "Importe recibo"], ["importe_remesa", "Importe remesa"],
  ["fecha_creacion", "Fecha creación"], ["fecha_teorica", "Fecha cobro teórica"],
];
type Preview = { total: number; rows: Record<string, string | number | null>[] };

export default function ReceiptExcelModal({ onClose, onImported }: { onClose: () => void; onImported: (count: number) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const dialog = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const request = requestId;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); }
      if (event.key !== "Tab") return;
      const elements = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]');
      if (!elements?.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", keydown);
    return () => { request.current++; window.removeEventListener("keydown", keydown); previousFocus?.focus(); };
  }, []);

  const upload = async (action: "preview" | "import") => {
    if (!file || busy || (action === "import" && !preview)) return;
    const current = ++requestId.current;
    setBusy(true); setError("");
    try {
      const data = await PrevisionIngresosService.importRecibos(file, action);
      // A confirmed import still refreshes the page if the modal was closed while saving.
      if (action === "import") {
        onImported(data.imported);
        if (current === requestId.current) onClose();
      } else if (current === requestId.current) setPreview(data);
    } catch (err: any) {
      if (current === requestId.current) setError(err?.message || "No se ha podido procesar el Excel.");
    } finally { if (current === requestId.current) setBusy(false); }
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="receipt-excel-title" className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white text-slate-900 shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b px-6 py-4">
        <div><h2 id="receipt-excel-title" className="text-xl font-semibold text-blue-950">Agregar excel de recibos</h2><p className="mt-1 text-sm text-slate-600">Selecciona el archivo, revisa los datos y confirma la importación.</p></div>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border text-2xl transition hover:bg-gray-100">×</button>
      </header>
      <div className="space-y-5 p-6">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm">
          <p>La primera hoja debe incluir estas ocho columnas en su primera fila:</p>
          <div className="mt-3 overflow-x-auto"><table className="min-w-full"><thead><tr>{columns.map(([key, label]) => <th key={key} className="whitespace-nowrap border border-blue-200 px-3 py-2 text-left font-medium">{label}</th>)}</tr></thead></table></div>
          <p className="mt-3">Número de recibo es obligatorio: <strong>526058-004</strong> corresponde a la factura <strong>526058</strong>, recibo <strong>4</strong>. Se eliminan los espacios al principio y al final.</p>
          <p className="mt-2">Los recibos existentes se actualizan sin duplicarse. Los campos vacíos o «-» conservan los valores anteriores. La remesa se crea o actualiza al indicar su número y su total se calcula sumando sus recibos. Usa fechas de Excel o dd/mm/yyyy e importes numéricos o con coma decimal.</p>
        </div>
        <label className="block text-sm font-medium">Archivo Excel (.xlsx o .xls, máximo 10 MB y 5.000 recibos)
          <input type="file" accept=".xlsx,.xls" disabled={busy} onChange={event => { requestId.current++; setFile(event.target.files?.[0] || null); setPreview(null); setError(""); }} className="mt-2 block w-full cursor-pointer rounded border border-slate-300 p-2 transition enabled:hover:bg-slate-50 file:mr-4 file:cursor-pointer file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-950 disabled:cursor-default disabled:opacity-50 disabled:file:cursor-default" />
        </label>
        {preview && <div><h3 className="mb-2 font-semibold">{preview.total} recibos válidos. Vista previa de los primeros {preview.rows.length}.</h3><div className="overflow-x-auto rounded border"><table className="min-w-full text-sm"><thead className="bg-blue-950 text-white"><tr>{[...columns, ["numero_factura", "Factura detectada"], ["numero_cobro", "Nº recibo en factura"]].map(([key, label]) => <th key={key} className="whitespace-nowrap p-3 text-left font-medium">{label}</th>)}</tr></thead><tbody>{preview.rows.map(row => <tr key={String(row.numero_recibo)} className="border-b">{[...columns, ["numero_factura"], ["numero_cobro"]].map(([key]) => <td key={key} className="whitespace-nowrap p-3">{row[key] == null || row[key] === "" ? "-" : key.startsWith("importe_") ? Number(row[key]).toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : String(row[key])}</td>)}</tr>)}</tbody></table></div></div>}
        {error && <p role="alert" className="whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {busy && <p role="status" className="text-sm text-slate-600">{preview ? "Importando recibos. Si cierras el modal, la importación continuará." : "Validando el archivo…"}</p>}
        <footer className="flex justify-end gap-3 border-t pt-4">
          <button type="button" onClick={onClose} className="cursor-pointer rounded border px-4 py-2 transition hover:bg-gray-100">Cerrar</button>
          <button type="button" disabled={!file || busy} onClick={() => void upload(preview ? "import" : "preview")} className="cursor-pointer rounded bg-blue-950 px-4 py-2 font-semibold text-white transition enabled:hover:bg-blue-900 disabled:cursor-default disabled:bg-gray-300">{busy ? "Procesando…" : preview ? "Confirmar importación" : "Revisar Excel"}</button>
        </footer>
      </div>
    </section>
  </div>;
}
