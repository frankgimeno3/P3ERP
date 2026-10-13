import {createHash} from 'node:crypto';
import {cents,validDate} from './CardSettlement.js';
import {ProveedorError} from './SupplierAdminRepository.js';
const fail=m=>{throw new ProveedorError(m,422);};
const number=s=>Number(s.replaceAll('.','').replace(',','.'));
const date=s=>s.replaceAll('.','/').replaceAll('-','/').split('/').reverse().join('-');
export function parseCardStatement(text,bank){
 if(bank==='Carrefour PASS')return parsePassStatement(text);
 const personal=/CREDITO SANTANDER/i.test(text)&&/Extracte de moviments/i.test(text);
 text=text.replace(/Període de liquidació/gi,'PERIODO DE LIQUIDACION').replace(/Data de càrrec/gi,'FECHA DE CARGO').replace(/Import a pagar/gi,'Importe a Pagar').replace(/rebut a pagar el/gi,'recibo a Pagar el').replace(/Contracte número/gi,'Contrato número').replace(/C - Comissions, despeses i interessos/gi,'C - Comisiones, Gastos e Intereses').replace(/Detall de l'import pendent de pagament/gi,'Detalle de importe pendiente de pago');
 text=text.replace(/\s+/g,' ').trim();let start,end,pay,total,digits,contract;const rows=[];
 if(bank==='Sabadell'){
  if(!/Liquidación del contrato de tarjeta de crédito/i.test(text)||!/bancsabadell\.com/i.test(text))fail('No es una liquidación Sabadell compatible.');
  const period=/comprendido entre (\d{2}-\d{2}-\d{4}) y (\d{2}-\d{2}-\d{4})/i.exec(text),payment=/Fecha del apunte (\d{2}\.\d{2}\.\d{4})/i.exec(text),amount=/Total importe a pagar ([\d.,]+) Euros/i.exec(text),card=/Número de tarjeta \d{4} \*+ \*+ (\d{4})/i.exec(text);
  if(!period||!payment||!amount||!card)fail('Faltan el período, la fecha, el importe o la tarjeta.');
  start=date(period[1]);end=date(period[2]);pay=date(payment[1]);total=number(amount[1]);digits=card[1];
  contract=/Contrato tarjeta: ([\d ]+)/i.exec(text)?.[1].replaceAll(' ','').trim();
  const detail=text.split('Detalle nuevas operaciones del periodo de liquidación').slice(1).join(' ');
  for(const m of detail.matchAll(/\b(0[1-9]|[12]\d|3[01])(0[1-9]|1[012]) (.+?) (-?[\d.]+,\d{2}) (-?[\d.]+,\d{2})(?= |$)/g)){
   const candidates=[Number(start.slice(0,4)),Number(end.slice(0,4))].map(y=>`${y}-${m[2]}-${m[1]}`),d=candidates.find(d=>validDate(d)&&d>=start&&d<=end);
   if(!d)fail('Una operación no encaja en el período del PDF.');
   rows.push({fecha:d,fecha_valor:d,concepto:m[3],importe:number(m[5])});
  }
 }else if(bank==='Santander'){
  if(!/BANCO SANTANDER/i.test(text)||!/(?:SANTANDER .*CREDITO|CREDITO SANTANDER)/i.test(text))fail('No es una liquidación Santander compatible.');
  const p=/PERIODO DE LIQUIDACI[ÓO]N (\d{2}\/\d{2}\/\d{4}) A (\d{2}\/\d{2}\/\d{4})/i.exec(text),t=/(?:Importe a Pagar|TOTAL MOVIMIENTOS) ([\d.,]+) €/i.exec(text),c=/\*{5,}(\d{6})/.exec(text);
  if(!p||!t||!c)fail('Faltan el período, el total o la identificación de la tarjeta.');
  start=date(p[1]);end=date(p[2]);total=number(t[1]);digits=c[1].slice(-4);contract=/Contrato n[úu]mero:? ([\d ]+)/i.exec(text)?.[1].replaceAll(' ','').trim();
  const exact=/recibo a Pagar el (\d{2}\/\d{2}\/\d{4})/i.exec(text),cargo=/FECHA DE CARGO (\d{2}) DE (\w+)/i.exec(text),months=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  if(exact)pay=date(exact[1]);else if(cargo){const mo=months.indexOf(cargo[2].toUpperCase())+1;pay=`${Number(end.slice(0,4))+(mo<Number(end.slice(5,7))?1:0)}-${String(mo).padStart(2,'0')}-${cargo[1]}`;}
  const beneficiary=/TARJETA BENEFICIARIO/i.test(text);
  const matches=[...text.matchAll(/(\d{2}[-/]\d{2}[-/]\d{4}) (\d{2}[-/]\d{2}[-/]\d{4}) (.+?)(?=\d{2}[-/]\d{2}[-/]\d{4} \d{2}[-/]\d{2}[-/]\d{4}|BANCO SANTANDER|TOTAL MOVIMIENTOS|$)/g)];
  for(const m of matches){if(/^(SALDO ANTERIOR|PAGO\b)/.test(m[3]))continue;const amounts=[...m[3].matchAll(/(-?[\d.]+,\d{2})(?: €)?/g)];if(!amounts.length)fail('Importe de una operación no reconocido.');const a=!beneficiary&&m[3].includes('IMPORTE EN DIVISA')?amounts.at(-1):amounts[0];rows.push({fecha:date(m[1]),fecha_valor:date(m[2]),concepto:m[3].slice(0,a.index).trim(),importe:number(a[1])});if(beneficiary){for(const fee of m[3].matchAll(/COMISION COMPRA MONEDA NO EURO ([\d.,]+) €/g))rows.push({fecha:date(m[1]),fecha_valor:date(m[2]),concepto:'COMISION COMPRA MONEDA NO EURO',importe:number(fee[1])});}}
  if(!beneficiary){const section=text.split('C - Comisiones, Gastos e Intereses')[1]?.split('Detalle de importe pendiente de pago')[0]||'';for(const m of section.matchAll(/(\d{2}-\d{2}-\d{4}) (.+?)(?=\d{2}-\d{2}-\d{4}|BANCO SANTANDER|$)/g)){const a=[...m[2].matchAll(/(-?[\d.]+,\d{2}) €/g)].at(-1);if(!a)fail('Comisión no reconocida.');rows.push({fecha:date(m[1]),fecha_valor:date(m[1]),concepto:m[2].split(/\d/)[0].trim(),importe:number(a[1])});}}
 }else fail('Selecciona Sabadell o Santander.');
 if(![start,end,pay].every(validDate)||start>end||end>pay||!rows.length||!Number.isFinite(total)||rows.some(r=>!validDate(r.fecha)||!validDate(r.fecha_valor)||!r.concepto||!Number.isFinite(r.importe)))fail('El documento no tiene datos completos y válidos.');
 if(rows.reduce((n,r)=>n+cents(r.importe),0)!==cents(total))fail('La suma extraída no coincide con el total del PDF. Importación bloqueada.');
 return {banco:bank,inicio:start,cierre:end,fecha:pay,total,ultimos_digitos:digits,contrato:contract,mes_extracto:end.slice(0,7),formato:personal?'santander_personal':'empresa',referencia:contract,rows};
}
export function parsePassStatement(text){
 text=text.replace(/\s+/g,' ').trim();
 if(!/Servicios Financieros Carrefour/i.test(text)||!/Detalle de tus operaciones a Contado Fin de Mes/i.test(text))fail('No es un extracto Carrefour PASS compatible.');
 const p=/Resumen de operaciones (\d{2}\/\d{2}\/\d{4}) al (\d{2}\/\d{2}\/\d{4})/.exec(text),client=/Número de Cliente: (\d+)/.exec(text),total=/Total compras realizadas a Contado Fin de Mes (\d{2}\/\d{2}\/\d{4}) ([\d.,]+) €/.exec(text),account=/Número de Cuenta: ES\d{2} (\d{4})/.exec(text);
 if(!p||!client||!total||!account)fail('Faltan el periodo, el cliente PASS, el banco de cargo o el total.');
 const debt=/Deuda a \d{2}\/\d{2}\/\d{4} ([\d.,]+) €/.exec(text);if(!debt||number(debt[1])!==0)fail('El extracto PASS incluye deuda a crédito: revisa ese desglose antes de importar.');
 const detail=text.split('Detalle de tus operaciones a Contado Fin de Mes')[1].split('Total compras realizadas a Contado Fin de Mes')[0];
 const rows=[...detail.matchAll(/(\d{2}\/\d{2}\/\d{4}) (.+?) (-?[\d.]+,\d{2}) €(?= |$)/g)].map(m=>({fecha:date(m[1]),fecha_valor:date(m[1]),concepto:m[2],importe:number(m[3])}));
 const start=date(p[1]),end=date(p[2]),pay=date(total[1]),amount=number(total[2]);
 if(![start,end,pay].every(validDate)||start>end||end>pay||!rows.length||rows.some(r=>!validDate(r.fecha)||r.fecha> end||r.fecha<new Date(Date.parse(start)-7*86400000).toISOString().slice(0,10)))fail('Las fechas del extracto PASS no son compatibles.');
 if(rows.reduce((sum,r)=>sum+cents(r.importe),0)!==cents(amount))fail('La suma extraída no coincide con el total PASS. Importación bloqueada.');
 const banco={'0081':'Sabadell','0049':'Santander'}[account[1]];if(!banco)fail('El banco de cargo PASS no está configurado.');
 return {banco,inicio:start,cierre:end,fecha:pay,total:amount,ultimos_digitos:null,formato:'carrefour_pass',referencia:client[1],mes_extracto:end.slice(0,7),rows,avisos:['Se excluyen las operaciones del próximo recibo y la mensualidad de crédito cuando la deuda es cero. Las fechas de operación se conservan aunque el banco incluya una compra anterior al inicio indicado.']};
}
export async function extractCardStatement(file,bank){
 if(!file||file.size>15*1024*1024||file.size<5)fail('Selecciona un PDF de hasta 15 MB.');
 const bytes=Buffer.from(await file.arrayBuffer());if(bytes.subarray(0,5).toString()!=='%PDF-')fail('El archivo no es un PDF.');
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 // Load the worker explicitly because the Next server bundle is not beside the PDF.js files.
 globalThis.pdfjsWorker=await import('pdfjs-dist/legacy/build/pdf.worker.mjs');let doc;
 try{doc=await getDocument({data:new Uint8Array(bytes),isEvalSupported:false}).promise;if(doc.numPages>100)fail('El PDF supera 100 páginas.');const pages=[];for(let n=1;n<=doc.numPages;n++){const t=await(await doc.getPage(n)).getTextContent();pages.push(t.items.map(i=>i.str).join(' '));}return {...parseCardStatement(pages.join(' '),bank),bytes,nombre:String(file.name||'liquidacion.pdf').slice(0,255),sha256:createHash('sha256').update(bytes).digest('hex')};}catch(e){if(e instanceof ProveedorError)throw e;fail('No se puede leer este PDF. Utiliza el documento original descargado del banco.');}finally{await doc?.destroy();}
}
