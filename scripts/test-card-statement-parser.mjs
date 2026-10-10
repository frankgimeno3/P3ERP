import assert from 'node:assert/strict';
import {parseCardStatement} from '../server/features/proveedor/CardStatementPdf.js';
// Sanitized examples retain the structure of the original bank documents.
const santander='BANCO SANTANDER SANTANDER BUSINESS CREDITO PERIODO DE LIQUIDACIÓN 28/08/2026 A 29/09/2026 ******001234 Importe a Pagar 10,00 € recibo a Pagar el 01/10/2026 Detalle de operaciones ';
const actual=santander+'27-08-2026 31-08-2026 COMPRA INTERNET Comercio 12,00 € 16-09-2026 21-09-2026 DEVOLUCION Comercio -2,00 € TOTAL MOVIMIENTOS 10,00 €';
const parsed=parseCardStatement(actual,'Santander');assert.equal(parsed.rows.length,2);assert.equal(parsed.total,10);assert.equal(parsed.rows[0].fecha,'2026-08-27');assert.equal(parsed.rows[0].fecha_valor,'2026-08-31');assert.equal(parsed.rows[1].importe,-2);
const foreign=santander+'15-09-2026 16-09-2026 COMPRA INTERNACIONAL Comercio 12,00 IMPORTE EN DIVISA USD 10,00 € TOTAL MOVIMIENTOS 10,00 €';assert.equal(parseCardStatement(foreign,'Santander').rows[0].importe,10);
const beneficiary=santander+'TARJETA BENEFICIARIO 15/09/2026 16/09/2026 COMPRA Comercio 9,90 € COMISION COMPRA MONEDA NO EURO 0,10 € TOTAL MOVIMIENTOS 10,00 €';assert.equal(parseCardStatement(beneficiary,'Santander').rows.length,2);
const sabadell='bancsabadell.com Liquidación del contrato de tarjeta de crédito comprendido entre 01-09-2026 y 30-09-2026 Fecha del apunte 05.10.2026 Total importe a pagar 10,00 Euros Número de tarjeta 1234 **** **** 5678 Detalle nuevas operaciones del periodo de liquidación 1509 Comercio 10,00 10,00';assert.equal(parseCardStatement(sabadell,'Sabadell').fecha,'2026-10-05');
assert.throws(()=>parseCardStatement(actual.replace('12,00','13,00'),'Santander'),/suma/);assert.throws(()=>parseCardStatement(actual,'Sabadell'));assert.throws(()=>parseCardStatement('Documento desconocido','Santander'));
console.log('PASS: real bank structures; foreign currency uses EUR; refunds signed; posting dates preserved; commissions included; mismatches and unknown formats blocked.');
