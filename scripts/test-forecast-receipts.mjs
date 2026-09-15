import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import { parseReceiptExcel, RECEIPT_COLUMNS } from '../server/features/prevision/ReceiptExcel.js';
import { mergeReceiptForecast } from '../server/features/prevision/ReceiptImportRepository.js';

const original = ['526058-004  ', 'REM-10', 'Carpeta A', 'Cliente de prueba', '1.234,56 €', 2400, '14/09/2026', '30/09/2026'];
function excel(rows, headers = RECEIPT_COLUMNS, options = {}) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'Recibos');
  if (options.date1904) wb.Workbook = { WBProps: { date1904: true } };
  return XLSX.write(wb, { type: 'buffer', bookType: options.bookType || 'xlsx' });
}
const [receipt] = parseReceiptExcel(excel([original]));
assert.equal(receipt.numero_factura, '526058');
assert.equal(receipt.numero_cobro, 4);
assert.equal(receipt.numero_recibo, '526058-004');
assert.equal(receipt.importe_recibo, 1234.56);
assert.equal(receipt.fecha_teorica, '30/09/2026');
assert.deepEqual(parseReceiptExcel(excel([original], RECEIPT_COLUMNS, { bookType: 'xls' })), [receipt]);
assert.throws(() => parseReceiptExcel(excel([original], RECEIPT_COLUMNS.slice(1))), /Falta la columna/);
assert.throws(() => parseReceiptExcel(excel([original, original])), /Fila 3.*repetido/);
for (const value of ['', '526058', '526058-000', '526058-x', '526058-2147483648']) {
  assert.throws(() => parseReceiptExcel(excel([[value, ...original.slice(1)]])), /Fila 2.*obligatorio/);
}
for (const value of ['31/02/2026', '29/02/2025', '09/14/2026', 'invalid', 60]) {
  const row = [...original]; row[6] = value;
  assert.throws(() => parseReceiptExcel(excel([row])), /Fila 2.*Fecha creación/);
}
const serial = [...original]; serial[6] = 46279;
assert.equal(parseReceiptExcel(excel([serial]))[0].fecha_creacion, '14/09/2026');
serial[6] = 0;
assert.equal(parseReceiptExcel(excel([serial], RECEIPT_COLUMNS, { date1904: true }))[0].fecha_creacion, '01/01/1904');
assert.throws(() => parseReceiptExcel(excel([])), /no contiene recibos/);
const badAmount = [...original]; badAmount[4] = '1,2,3';
assert.throws(() => parseReceiptExcel(excel([badAmount])), /Importe recibo/);
const blank = parseReceiptExcel(excel([['000012-1']]))[0];
assert.equal(blank.numero_factura, '000012');
assert.equal(blank.numero_recibo, '000012-001');
assert.equal(blank.importe_recibo, null);
assert.equal(blank.fecha_creacion, null);
const reordered = [...RECEIPT_COLUMNS].reverse();
assert.deepEqual(parseReceiptExcel(excel([[...original].reverse()], reordered)), [receipt]);

const emptyRemesa=[...original];emptyRemesa[1]='-';emptyRemesa[2]='-';emptyRemesa[5]='-';
const parsedEmpty=parseReceiptExcel(excel([emptyRemesa]))[0];assert.equal(parsedEmpty.numero_remesa,'');assert.equal(parsedEmpty.remesa_en_carpeta,'');assert.equal(parsedEmpty.importe_remesa,null);
const order={id_orden:'ORDER-1',id_factura:'526058',numero_cobro:4,forma_cobro:'Recibo',cobro_total:100,fecha_teorica_cobro:'15/09/2026'};
const merged=mergeReceiptForecast([order],[{...receipt,id_orden:'ORDER-1',id_remesa:'REM-1',importe_total:300}]);
assert.equal(merged.length,1);assert.equal(merged[0].cobro_total,100);assert.equal(merged[0].importe_remesa,300);assert.equal(merged[0].numero_recibo,'526058-004');
console.log('PASS: Excel parsing, hyphen placeholders, required receipt numbers, dates, amounts, duplicate detection and canonical order/remittance values.');
