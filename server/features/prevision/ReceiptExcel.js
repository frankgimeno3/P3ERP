import XLSX from 'xlsx';
export { amount as parseImportAmount, date as parseImportDate };

export const RECEIPT_COLUMNS = ['Número de recibo', 'Número de remesa', 'Remesa en carpeta', 'Cliente', 'Importe recibo', 'Importe remesa', 'Fecha creación', 'Fecha cobro teórica'];
const clean = (value) => String(value ?? '').trim();
const present = value => clean(value) === '-' ? '' : clean(value);
const headerKey = (value) => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');

function amount(value) {
  if (!present(value)) return null;
  let text = clean(value).replace(/[\s€]/g, '');
  if (typeof value === 'string' && /^-?\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text)) text = text.replace(/\./g, '');
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) throw new Error('importe no válido');
  const result = Number(text);
  if (!Number.isFinite(result) || Math.abs(result) >= 1e12) throw new Error('importe fuera de rango');
  return result;
}

function date(value, date1904) {
  if (!present(value)) return null;
  let d, m, y;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value, { date1904 });
    if (!parsed) throw new Error('fecha no válida');
    ({ d, m, y } = parsed);
  } else {
    const text = clean(value);
    const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.exec(text);
    if (local) [, d, m, y] = local.map(Number);
    else if (iso) [, y, m, d] = iso.map(Number);
    else throw new Error('usa una fecha Excel o dd/mm/yyyy');
  }
  const check = new Date(Date.UTC(y, m - 1, d));
  if (y < 1900 || y > 9999 || check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) throw new Error('fecha no válida');
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export function parseReceiptExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false, sheetRows: 5002 });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('El Excel no contiene ninguna hoja.');
  const range = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref'] || 'A1');
  if (range.e.r > 5000 || range.e.c > 100) throw new Error('El Excel admite hasta 5.000 recibos y 101 columnas.');
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true, blankrows: true });
  const headers = (matrix[0] || []).map(headerKey);
  const indexes = RECEIPT_COLUMNS.map(column => {
    const key = headerKey(column);
    if (!headers.includes(key)) throw new Error(`Falta la columna «${column}».`);
    if (headers.indexOf(key) !== headers.lastIndexOf(key)) throw new Error(`La columna «${column}» está repetida.`);
    return headers.indexOf(key);
  });
  const rows = [], errors = [], seen = new Set();
  matrix.slice(1).forEach((cells, index) => {
    if (cells.every(cell => clean(cell) === '')) return;
    try {
      const values = indexes.map(i => cells[i] ?? '');
      const receipt = /^(\d+)-(\d+)$/.exec(clean(values[0]));
      if (!receipt || !Number.isSafeInteger(Number(receipt[2])) || Number(receipt[2]) < 1 || Number(receipt[2]) > 2147483647) throw new Error('Número de recibo obligatorio con formato factura-recibo, por ejemplo 526058-004.');
      const numeroFactura = receipt[1], numeroCobro = Number(receipt[2]);
      const numeroRecibo = `${numeroFactura}-${String(numeroCobro).padStart(3, '0')}`;
      if (seen.has(numeroRecibo)) throw new Error(`El recibo ${numeroRecibo} está repetido en el archivo.`);
      const parseField = (i, parser) => { try { return parser(values[i]); } catch (error) { throw new Error(`${RECEIPT_COLUMNS[i]}: ${error.message}`); } };
      const row = {
        numero_recibo: numeroRecibo, numero_factura: numeroFactura, numero_cobro: numeroCobro,
        numero_remesa: present(values[1]), remesa_en_carpeta: present(values[2]), cliente: present(values[3]),
        importe_recibo: parseField(4, amount), importe_remesa: parseField(5, amount),
        fecha_creacion: parseField(6, v => date(v, workbook.Workbook?.WBProps?.date1904)),
        fecha_teorica: parseField(7, v => date(v, workbook.Workbook?.WBProps?.date1904)),
      };
      seen.add(numeroRecibo);
      rows.push(row);
    } catch (error) { errors.push(`Fila ${index + 2}: ${error.message}`); }
  });
  if (errors.length) throw new Error(errors.slice(0, 20).join('\n') + (errors.length > 20 ? `\nY ${errors.length - 20} errores más.` : ''));
  if (!rows.length) throw new Error('El Excel no contiene recibos.');
  return rows;
}
