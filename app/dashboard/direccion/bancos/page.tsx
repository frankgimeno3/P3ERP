'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  id_linea_banco?: string;
  banco: Banco;
  fecha_operativa: string;
  fecha_valor: string;
  concepto: string;
  importe: number;
  saldo: number;
}

type DateParts = { day: string; month: string; year: string };

const SABADELL_COLUMNS = ['F. Operativa', 'Concepto', 'F. Valor', 'Importe', 'Saldo', 'Referencia 1', 'Referencia 2'];
const SANTANDER_COLUMNS = ['Fecha Operación', 'Fecha Valor', 'Concepto', 'Importe', 'Divisa', 'Saldo', 'Divisa', 'Código', 'Número de documento', 'Referencia 1', 'Referencia 2', 'Información adicional'];

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

function getIdSerial(id = '') {
  const value = Number(id.split('_')[3]?.replace(/\./g, ''));
  return Number.isFinite(value) ? value : 0;
}

function getIdYear(id = '') {
  return id.split('_')[2] || '';
}

function movementFingerprint(row: Pick<ImportedLinea, 'fecha_operativa' | 'fecha_valor' | 'concepto' | 'importe' | 'saldo'>) {
  return [row.fecha_operativa, row.fecha_valor, row.concepto.trim().replace(/\s+/g, ' ').toLowerCase(), Number(row.importe).toFixed(2), Number(row.saldo).toFixed(2)].join('|');
}

function sortByBankId(a: ImportedLinea, b: ImportedLinea) {
  const yearCompare = getIdYear(a.id_linea_banco).localeCompare(getIdYear(b.id_linea_banco));
  if (yearCompare !== 0) return yearCompare;
  return getIdSerial(a.id_linea_banco) - getIdSerial(b.id_linea_banco);
}

export default function BancosPage() {
  const router = useRouter();
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
  const [importReadCount, setImportReadCount] = useState(0);
  const [newRows, setNewRows] = useState<ImportedLinea[]>([]);
  const [sourceRows, setSourceRows] = useState<ImportedLinea[]>([]);
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

  const resetModal = useCallback(() => {
    setPhase(1);
    setSelectedBank('Sabadell');
    setImportReadCount(0);
    setNewRows([]);
    setSourceRows([]);
    setImportErrors([]);
    setImportInfo('');
    setImporting(false);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetModal();
  }, [resetModal]);

  useEffect(() => {
    if (!isModalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !importing) closeModal();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [closeModal, importing, isModalOpen]);

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

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      if (!row.fecha_operativa) errors.push(`Fila ${rowNumber}: la fecha operativa no es válida.`);
      if (!row.fecha_valor) errors.push(`Fila ${rowNumber}: la fecha valor no es válida.`);
      if (!row.concepto) errors.push(`Fila ${rowNumber}: Concepto es obligatorio.`);
      if (!Number.isFinite(row.importe)) errors.push(`Fila ${rowNumber}: Importe no es numérico.`);
      if (!Number.isFinite(row.saldo)) errors.push(`Fila ${rowNumber}: Saldo no es numérico.`);
    });

    const firstDate = rows.find((row) => dateToComparable(row.fecha_operativa));
    const lastDate = [...rows].reverse().find((row) => dateToComparable(row.fecha_operativa));
    const descending = Boolean(firstDate && lastDate && dateToComparable(firstDate.fecha_operativa)! > dateToComparable(lastDate.fecha_operativa)!);
    const chronological = descending ? [...rows].reverse() : [...rows];
    const existing = lineas.filter((linea) => linea.banco === selectedBank).sort(sortByBankId);
    const previous = new Uint32Array(chronological.length + 1);
    existing.forEach((stored) => {
      const current = new Uint32Array(chronological.length + 1);
      chronological.forEach((incoming, index) => {
        current[index + 1] = movementFingerprint(stored) === movementFingerprint(incoming)
          ? previous[index] + 1
          : Math.max(previous[index + 1], current[index]);
      });
      previous.set(current);
    });
    const matchingSequenceLength = previous[chronological.length];
    const newCount = chronological.length - matchingSequenceLength;
    setImportInfo(newCount
      ? `Orden detectado: ${descending ? 'más nuevo a más antiguo' : 'más antiguo a más nuevo'}. Se han encontrado ${matchingSequenceLength} movimientos ya registrados y ${newCount} movimientos para intercalar.`
      : `Orden detectado: ${descending ? 'más nuevo a más antiguo' : 'más antiguo a más nuevo'}. La secuencia completa ya está registrada.`);
    setNewRows(errors.length ? [] : chronological.slice(0, newCount));
    setImportErrors(errors);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportErrors([]);
    setImportInfo('');
    setImportReadCount(0);
    setNewRows([]);
    setSourceRows([]);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
    setImportReadCount(rawRows.length);
    const headers = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 })[0] || [];
    const expectedColumns = selectedBank === 'Santander' ? SANTANDER_COLUMNS : SABADELL_COLUMNS;
    const missingColumns = expectedColumns
      .filter((column, index) => headers[index] !== column);

    if (missingColumns.length) {
      setImportErrors([selectedBank === 'Santander'
        ? `El formato no coincide con el Excel de Santander. Se esperaban, en este orden: ${SANTANDER_COLUMNS.join(', ')}.`
        : `El formato no coincide con el Excel de Sabadell. Se esperaban, en este orden: ${SABADELL_COLUMNS.join(', ')}.`]);
      setPhase(3);
      return;
    }

    const parsedRows = rawRows.map((row) => ({
      banco: selectedBank,
      fecha_operativa: normalizeDate(row[selectedBank === 'Santander' ? 'Fecha Operación' : 'F. Operativa']),
      fecha_valor: normalizeDate(row[selectedBank === 'Santander' ? 'Fecha Valor' : 'F. Valor']),
      concepto: String(row.Concepto ?? '').trim(),
      importe: parseNumber(row.Importe),
      saldo: parseNumber(row.Saldo),
    }));

    setSourceRows(parsedRows);
    validateRows(parsedRows);
    setPhase(3);
  };

  const handleImport = async () => {
    if (!newRows.length || !sourceRows.length) return;

    try {
      setImporting(true);
      await BancoService.importLineasBanco(selectedBank, sourceRows);
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
          <button type="button" onClick={() => router.push('/dashboard/direccion/previsiones/prevision-gastos')} className="cursor-pointer rounded border border-blue-950 px-4 py-2 text-sm font-medium text-blue-950 transition hover:bg-blue-50 hover:shadow-sm">Gestión de previsión de gastos</button>
          <button type="button" onClick={() => router.push('/dashboard/direccion/previsiones/prevision-ingresos')} className="cursor-pointer rounded border border-blue-950 px-4 py-2 text-sm font-medium text-blue-950 transition hover:bg-blue-50 hover:shadow-sm">Gestión de previsión de ingresos</button>
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
              <button type="button" onClick={closeModal} disabled={importing} aria-label="Cerrar" className="cursor-pointer text-2xl font-semibold text-gray-500 transition hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40">×</button>
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
                <label className="block">
                  <span className="text-sm font-medium">Banco</span>
                  <select value={selectedBank} onChange={(event) => setSelectedBank(event.target.value as Banco)} className="mt-1 w-full cursor-pointer rounded border border-gray-300 px-3 py-2 text-sm transition hover:border-blue-950">
                    <option value="Sabadell">Sabadell</option>
                    <option value="Santander">Santander</option>
                  </select>
                </label>
                {selectedBank === 'Santander' ? (
                  <div className="rounded border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                    <p className="font-semibold">Formato esperado del Excel de Banco Santander</p>
                    <p className="mt-1">La primera hoja debe contener, en este orden, las columnas: {SANTANDER_COLUMNS.join(', ')}.</p>
                    <p className="mt-2">La aplicación transformará automáticamente <strong>Fecha Operación</strong> en fecha operativa, <strong>Fecha Valor</strong> en fecha valor y conservará <strong>Concepto</strong>, <strong>Importe</strong> y <strong>Saldo</strong>. Las columnas restantes se validan como parte del formato oficial, pero no se almacenan porque no son necesarias para la conciliación.</p>
                    <p className="mt-2">No debes añadir ningún identificador: se generará respetando el orden original, con el formato <strong>banc_san_26_000.000.001</strong>.</p>
                  </div>
                ) : (
                  <div className="rounded border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                    <p className="font-semibold">Formato esperado del Excel de Banco Sabadell</p>
                    <p className="mt-1">La primera hoja debe contener, en este orden, las columnas: {SABADELL_COLUMNS.join(', ')}.</p>
                    <p className="mt-2">La aplicación transformará automáticamente <strong>F. Operativa</strong> en fecha operativa, <strong>F. Valor</strong> en fecha valor y conservará <strong>Concepto</strong>, <strong>Importe</strong> y <strong>Saldo</strong>. Las referencias se validan como parte del formato del banco, pero no se almacenan.</p>
                    <p className="mt-2">No debes añadir identificadores. El sistema detectará el sentido cronológico del Excel, comparará la secuencia completa con los movimientos existentes e intercalará únicamente los que falten usando identificadores como <strong>banc_sab_26_000.000.001</strong>.</p>
                  </div>
                )}
                <div className="flex justify-end">
                  <button type="button" onClick={() => setPhase(2)} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-900 hover:shadow-sm">Continuar</button>
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
                <p className="text-sm text-gray-500">Filas leídas: {importReadCount}. Nuevas a subir: {newRows.length}.</p>
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
