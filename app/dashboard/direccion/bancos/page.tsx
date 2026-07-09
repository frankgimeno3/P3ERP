'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { BancoService } from '@/app/service/BancoService';

type Banco = 'Sabadell' | 'Santander';

interface LineaBanco {
  id_linea_banco: string;
  banco: Banco;
  fecha_operativa: string;
  fecha_valor: string;
  concepto: string;
  importe: number;
  saldo: number;
  estado_revision: boolean;
  comentarios: string;
}

interface ImportedLinea {
  id_linea_banco: string;
  banco: Banco;
  fecha_operativa: string;
  fecha_valor: string;
  concepto: string;
  importe: number;
  saldo: number;
}

type DateParts = { day: string; month: string; year: string };

const REQUIRED_COLUMNS = ['id_linea_banco', 'F.Operativa', 'F.Valor', 'Concepto', 'Importe', 'Saldo'];
const BANK_PREFIX: Record<Banco, string> = { Sabadell: 'sab', Santander: 'san' };

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
}

function formatCurrencyWithSymbol(value: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
}

function dateToComparable(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function datePartsToText(parts: DateParts) {
  if (!parts.day && !parts.month && !parts.year) return '';
  return [parts.day, parts.month, parts.year].filter(Boolean).join('/');
}

function datePartsToComparable(parts: DateParts) {
  if (parts.day.length !== 2 || parts.month.length !== 2 || parts.year.length !== 4) return '';
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function updateDateParts(parts: DateParts, field: keyof DateParts, value: string): DateParts {
  return { ...parts, [field]: value.replace(/\D/g, '').slice(0, field === 'year' ? 4 : 2) };
}

function DatePartsInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DateParts;
  onChange: (value: DateParts) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1 flex gap-1">
        <input value={value.day} onChange={(event) => onChange(updateDateParts(value, 'day', event.target.value))} placeholder="dd" className="w-14 rounded border border-gray-300 px-2 py-2 text-sm" />
        <input value={value.month} onChange={(event) => onChange(updateDateParts(value, 'month', event.target.value))} placeholder="mm" className="w-14 rounded border border-gray-300 px-2 py-2 text-sm" />
        <input value={value.year} onChange={(event) => onChange(updateDateParts(value, 'year', event.target.value))} placeholder="yyyy" className="w-20 rounded border border-gray-300 px-2 py-2 text-sm" />
      </div>
    </label>
  );
}

function isTransferClientPayment(linea: LineaBanco) {
  return linea.importe > 0 && /\b(transf|transferencia|transfer)\b/i.test(linea.concepto || '');
}

function parseNumber(value: unknown) {
  if (typeof value === 'number') return value;
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeDate(value: unknown) {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return '';
    return `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${parsed.y}`;
  }

  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (!match) return '';

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = match[3].length === 2 ? Number(`20${match[3]}`) : Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function getYearSuffix(date: string) {
  return date.slice(-2);
}

function getIdSerial(id: string) {
  const value = Number(id.split('_')[2]);
  return Number.isFinite(value) ? value : 0;
}

function sortByBankId(a: ImportedLinea, b: ImportedLinea) {
  const yearCompare = a.id_linea_banco.split('_')[1].localeCompare(b.id_linea_banco.split('_')[1]);
  if (yearCompare !== 0) return yearCompare;
  return getIdSerial(a.id_linea_banco) - getIdSerial(b.id_linea_banco);
}

export default function BancosPage() {
  const [lineas, setLineas] = useState<LineaBanco[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterBanco, setFilterBanco] = useState('');
  const [filterImporte, setFilterImporte] = useState('');
  const [filterFecha, setFilterFecha] = useState<DateParts>({ day: '', month: '', year: '' });
  const [filterRevision, setFilterRevision] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phase, setPhase] = useState(1);
  const [selectedBank, setSelectedBank] = useState<Banco>('Sabadell');
  const [importRows, setImportRows] = useState<ImportedLinea[]>([]);
  const [newRows, setNewRows] = useState<ImportedLinea[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importInfo, setImportInfo] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isInformeModalOpen, setIsInformeModalOpen] = useState(false);
  const [informeFechaInicio, setInformeFechaInicio] = useState<DateParts>({ day: '', month: '', year: '' });
  const [informeFechaFin, setInformeFechaFin] = useState<DateParts>({ day: '', month: '', year: '' });
  const [copyMessage, setCopyMessage] = useState('');

  const loadLineas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await BancoService.getLineasBanco();
      setLineas(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setError(error?.message || 'Error al cargar las lineas de banco');
      setLineas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLineas();
  }, []);

  const filteredLineas = useMemo(() => {
    const filterFechaText = datePartsToText(filterFecha);
    return lineas.filter((linea) => {
      const matchesBanco = !filterBanco || linea.banco === filterBanco;
      const matchesImporte = !filterImporte || String(linea.importe).includes(filterImporte.replace(',', '.'));
      const matchesFecha = !filterFechaText || linea.fecha_operativa.includes(filterFechaText) || linea.fecha_valor.includes(filterFechaText);
      const matchesRevision =
        !filterRevision ||
        (filterRevision === 'revisado' && linea.estado_revision) ||
        (filterRevision === 'pendiente' && !linea.estado_revision);

      return matchesBanco && matchesImporte && matchesFecha && matchesRevision;
    });
  }, [filterBanco, filterFecha, filterImporte, filterRevision, lineas]);

  const informeCobros = useMemo(() => {
    const fechaInicioComparable = datePartsToComparable(informeFechaInicio);
    const fechaFinComparable = datePartsToComparable(informeFechaFin);

    if (!fechaInicioComparable || !fechaFinComparable) {
      return { Sabadell: [] as LineaBanco[], Santander: [] as LineaBanco[] };
    }

    return lineas.reduce<Record<Banco, LineaBanco[]>>(
      (acc, linea) => {
        const fecha = dateToComparable(linea.fecha_operativa);
        if (!fecha || fecha < fechaInicioComparable || fecha > fechaFinComparable || !isTransferClientPayment(linea)) return acc;

        acc[linea.banco] = [...acc[linea.banco], linea];
        return acc;
      },
      { Sabadell: [], Santander: [] },
    );
  }, [informeFechaFin, informeFechaInicio, lineas]);

  const informeSnippet = useMemo(() => {
    const formatRows = (rows: LineaBanco[]) => {
      if (!rows.length) return 'Sin cobros por transferencia en el periodo';

      return rows
        .map((linea) => `${linea.fecha_operativa} | ${formatCurrencyWithSymbol(linea.importe)} | ${linea.concepto}`)
        .join('\n');
    };

    return `SABADELL:\n${formatRows(informeCobros.Sabadell)}\n\nSANTANDER:\n${formatRows(informeCobros.Santander)}`;
  }, [informeCobros]);

  const resetModal = () => {
    setPhase(1);
    setSelectedBank('Sabadell');
    setImportRows([]);
    setNewRows([]);
    setImportErrors([]);
    setImportInfo('');
    setImporting(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetModal();
  };

  const closeInformeModal = () => {
    setIsInformeModalOpen(false);
    setCopyMessage('');
  };

  const copyInforme = async () => {
    await navigator.clipboard.writeText(informeSnippet);
    setCopyMessage('Informe copiado');
  };

  const validateRows = (rows: ImportedLinea[]) => {
    const errors: string[] = [];
    const prefix = BANK_PREFIX[selectedBank];
    const existingIds = new Set(lineas.filter((linea) => linea.banco === selectedBank).map((linea) => linea.id_linea_banco));
    const seenIds = new Set<string>();

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const expectedYear = getYearSuffix(row.fecha_operativa);
      const expectedPattern = new RegExp(`^${prefix}_${expectedYear}_[0-9]+$`);

      if (!expectedPattern.test(row.id_linea_banco)) {
        errors.push(`Fila ${rowNumber}: id_linea_banco debe tener formato ${prefix}_${expectedYear}_numero.`);
      }

      if (seenIds.has(row.id_linea_banco)) errors.push(`Fila ${rowNumber}: id duplicado en el Excel (${row.id_linea_banco}).`);
      seenIds.add(row.id_linea_banco);

      if (!row.fecha_operativa) errors.push(`Fila ${rowNumber}: F.Operativa no es una fecha valida.`);
      if (!row.fecha_valor) errors.push(`Fila ${rowNumber}: F.Valor no es una fecha valida.`);
      if (!row.concepto) errors.push(`Fila ${rowNumber}: Concepto es obligatorio.`);
      if (!Number.isFinite(row.importe)) errors.push(`Fila ${rowNumber}: Importe no es numerico.`);
      if (!Number.isFinite(row.saldo)) errors.push(`Fila ${rowNumber}: Saldo no es numerico.`);
    });

    const sortedRows = [...rows].sort(sortByBankId);
    const firstNewIndex = sortedRows.findIndex((row) => !existingIds.has(row.id_linea_banco));
    const rowsToImport = firstNewIndex === -1 ? [] : sortedRows.slice(firstNewIndex);
    const existingAfterFirstNew = rowsToImport.filter((row) => existingIds.has(row.id_linea_banco));

    if (existingAfterFirstNew.length) {
      errors.push(`Hay ids ya existentes despues del primer nuevo: ${existingAfterFirstNew.map((row) => row.id_linea_banco).join(', ')}.`);
    }

    if (!rowsToImport.length) {
      setImportInfo('Todos los ids del Excel ya existen. No hay lineas nuevas para subir.');
    } else {
      setImportInfo(`Todo ok. Se importara a partir de ${rowsToImport[0].id_linea_banco}: ${rowsToImport.length} lineas nuevas.`);
    }

    setNewRows(errors.length ? [] : rowsToImport);
    setImportErrors(errors);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportErrors([]);
    setImportInfo('');
    setImportRows([]);
    setNewRows([]);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
    const headers = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 })[0] || [];
    const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));

    if (missingColumns.length) {
      setImportErrors([`Faltan columnas: ${missingColumns.join(', ')}.`]);
      setPhase(3);
      return;
    }

    const parsedRows = rawRows.map((row) => ({
      id_linea_banco: String(row.id_linea_banco ?? '').trim(),
      banco: selectedBank,
      fecha_operativa: normalizeDate(row['F.Operativa']),
      fecha_valor: normalizeDate(row['F.Valor']),
      concepto: String(row.Concepto ?? '').trim(),
      importe: parseNumber(row.Importe),
      saldo: parseNumber(row.Saldo),
    }));

    setImportRows(parsedRows);
    validateRows(parsedRows);
    setPhase(3);
  };

  const handleImport = async () => {
    if (!newRows.length) return;

    try {
      setImporting(true);
      await BancoService.importLineasBanco(newRows);
      await loadLineas();
      closeModal();
    } catch (error: any) {
      setImportErrors([error?.message || 'Error al importar el extracto']);
    } finally {
      setImporting(false);
    }
  };

  const updateLinea = async (linea: LineaBanco, changes: Partial<LineaBanco>) => {
    const updated = { ...linea, ...changes };
    setLineas((current) => current.map((item) => (item.id_linea_banco === linea.id_linea_banco ? updated : item)));
    setSavingId(linea.id_linea_banco);

    try {
      const saved = await BancoService.updateLineaBanco(linea.id_linea_banco, {
        estado_revision: updated.estado_revision,
        comentarios: updated.comentarios,
      });
      setLineas((current) => current.map((item) => (item.id_linea_banco === saved.id_linea_banco ? saved : item)));
    } catch (error: any) {
      setError(error?.message || 'Error al actualizar la linea');
      setLineas((current) => current.map((item) => (item.id_linea_banco === linea.id_linea_banco ? linea : item)));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 px-12 text-gray-800">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xl font-semibold text-gray-700">Bancos</p>
          <p className="text-sm text-gray-500">Lineas bancarias importadas y revision de movimientos</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsInformeModalOpen(true)}
            className="rounded border border-blue-950 px-4 py-2 text-sm font-medium text-blue-950 hover:bg-blue-50"
          >
            Informe de cobros
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
          >
            Añadir extracto
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-3 rounded bg-white p-4 shadow-sm">
        <select value={filterBanco} onChange={(event) => setFilterBanco(event.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los bancos</option>
          <option value="Sabadell">Sabadell</option>
          <option value="Santander">Santander</option>
        </select>
        <input value={filterImporte} onChange={(event) => setFilterImporte(event.target.value)} placeholder="Importe" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <div className="flex gap-1">
          <input value={filterFecha.day} onChange={(event) => setFilterFecha((current) => updateDateParts(current, 'day', event.target.value))} placeholder="dd" className="w-14 rounded border border-gray-300 px-2 py-2 text-sm" />
          <input value={filterFecha.month} onChange={(event) => setFilterFecha((current) => updateDateParts(current, 'month', event.target.value))} placeholder="mm" className="w-14 rounded border border-gray-300 px-2 py-2 text-sm" />
          <input value={filterFecha.year} onChange={(event) => setFilterFecha((current) => updateDateParts(current, 'year', event.target.value))} placeholder="yyyy" className="w-20 rounded border border-gray-300 px-2 py-2 text-sm" />
        </div>
        <select value={filterRevision} onChange={(event) => setFilterRevision(event.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          <option value="revisado">Revisado</option>
          <option value="pendiente">Pendiente</option>
        </select>
      </div>

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Banco</th>
              <th className="px-3 py-2 text-left">F. Operativa</th>
              <th className="px-3 py-2 text-left">F. Valor</th>
              <th className="px-3 py-2 text-left">Concepto</th>
              <th className="px-3 py-2 text-right">Importe</th>
              <th className="px-3 py-2 text-right">Saldo</th>
              <th className="px-3 py-2 text-center">Revisado</th>
              <th className="px-3 py-2 text-left">Comentarios</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="px-3 py-4 text-gray-500" colSpan={9}>Cargando lineas...</td></tr>
            )}
            {!loading && filteredLineas.length === 0 && (
              <tr><td className="px-3 py-4 text-gray-500" colSpan={9}>No hay lineas para mostrar.</td></tr>
            )}
            {!loading && filteredLineas.map((linea) => (
              <tr key={linea.id_linea_banco} className={`border-t border-gray-200 ${linea.estado_revision ? 'bg-green-50' : ''}`}>
                <td className="px-3 py-2 font-medium">{linea.id_linea_banco}</td>
                <td className="px-3 py-2">{linea.banco}</td>
                <td className="px-3 py-2">{linea.fecha_operativa}</td>
                <td className="px-3 py-2">{linea.fecha_valor}</td>
                <td className="max-w-md px-3 py-2">{linea.concepto}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(linea.importe)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(linea.saldo)}</td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={linea.estado_revision}
                    disabled={savingId === linea.id_linea_banco}
                    onChange={(event) => updateLinea(linea, { estado_revision: event.target.checked })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    defaultValue={linea.comentarios}
                    onBlur={(event) => {
                      if (event.target.value !== linea.comentarios) updateLinea(linea, { comentarios: event.target.value });
                    }}
                    className="w-72 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 text-gray-800">
          <div className="w-full max-w-2xl rounded bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-lg font-semibold">Importar extracto</p>
              <button type="button" onClick={closeModal} className="text-xl font-semibold text-gray-500 hover:text-gray-800">x</button>
            </div>

            <div className="mb-5 flex gap-2 text-xs">
              {[1, 2, 3].map((step) => (
                <span key={step} className={`rounded px-3 py-1 ${phase === step ? 'bg-blue-950 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  Fase {step}
                </span>
              ))}
            </div>

            {phase === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-700">El Excel debe contener exactamente estas columnas: id_linea_banco, F.Operativa, F.Valor, Concepto, Importe y Saldo.</p>
                <p className="text-sm text-gray-700">Los ids deben seguir el banco y aÃ±o: sab_yy_numero para Sabadell y san_yy_numero para Santander.</p>
                <label className="block">
                  <span className="text-sm font-medium">Banco</span>
                  <select value={selectedBank} onChange={(event) => setSelectedBank(event.target.value as Banco)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm">
                    <option value="Sabadell">Sabadell</option>
                    <option value="Santander">Santander</option>
                  </select>
                </label>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setPhase(2)} className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">Continuar</button>
                </div>
              </div>
            )}

            {phase === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-700">Sube el Excel del extracto de {selectedBank}.</p>
                <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                <div className="flex justify-between">
                  <button type="button" onClick={() => setPhase(1)} className="rounded border border-gray-300 px-4 py-2 text-sm">Volver</button>
                </div>
              </div>
            )}

            {phase === 3 && (
              <div className="space-y-4">
                <div className={`rounded border px-4 py-3 text-sm ${importErrors.length ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
                  {importErrors.length ? (
                    <ul className="list-inside list-disc space-y-1">
                      {importErrors.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  ) : (
                    <p>{importInfo}</p>
                  )}
                </div>
                <p className="text-sm text-gray-500">Filas leidas: {importRows.length}. Nuevas a subir: {newRows.length}.</p>
                <div className="flex justify-between">
                  <button type="button" onClick={() => setPhase(2)} className="rounded border border-gray-300 px-4 py-2 text-sm">Volver</button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={Boolean(importErrors.length) || !newRows.length || importing}
                    className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {importing ? 'Subiendo...' : 'Confirmar subida'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isInformeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 text-gray-800">
          <div className="w-full max-w-3xl rounded bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-lg font-semibold">Informe de cobros</p>
              <button type="button" onClick={closeInformeModal} className="text-xl font-semibold text-gray-500 hover:text-gray-800">x</button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <DatePartsInput label="Fecha inicio" value={informeFechaInicio} onChange={(value) => { setInformeFechaInicio(value); setCopyMessage(''); }} />
              <DatePartsInput label="Fecha fin" value={informeFechaFin} onChange={(value) => { setInformeFechaFin(value); setCopyMessage(''); }} />
            </div>

            {datePartsToComparable(informeFechaInicio) && datePartsToComparable(informeFechaFin) && datePartsToComparable(informeFechaInicio) > datePartsToComparable(informeFechaFin) && (
              <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                La fecha de inicio no puede ser posterior a la fecha de fin.
              </div>
            )}

            <textarea
              readOnly
              value={informeSnippet}
              className="h-72 w-full rounded border border-gray-300 bg-gray-50 p-3 font-mono text-sm"
            />

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Sabadell: {informeCobros.Sabadell.length} cobros. Santander: {informeCobros.Santander.length} cobros.
              </p>
              <div className="flex items-center gap-3">
                {copyMessage && <span className="text-sm text-green-700">{copyMessage}</span>}
                <button
                  type="button"
                  onClick={copyInforme}
                  disabled={!datePartsToComparable(informeFechaInicio) || !datePartsToComparable(informeFechaFin) || datePartsToComparable(informeFechaInicio) > datePartsToComparable(informeFechaFin)}
                  className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  Copiar snippet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
