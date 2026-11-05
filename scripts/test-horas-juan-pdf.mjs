import assert from 'node:assert/strict';
import { createHorasJuanPdf } from '../server/features/horasJuan/HorasJuanPdf.js';
import { juanDateEs, juanReportBlocks, validateJuanReport } from '../app/lib/horasJuanReport.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const base={tipo:'normal',mes:10,anio:2026,fecha:new Date(2026,10,4),horas:29.5,horas_enteras:29,minutos:30,precio_hora:15,importe_generado:442.5,importe_ajuste:0,importe_pagar:442.5};
assert.equal(juanDateEs(base.fecha),'04.11.2026');
assert.equal(juanDateEs('2026-11-04T00:00:00.000Z'),'04.11.2026');
for(const fecha of ['2026-02-30','Wed Nov 04',null,new Date('invalid')]) assert.ok(validateJuanReport({...base,fecha}).length);
for(const key of ['mes','anio','fecha','horas','horas_enteras','minutos','precio_hora','importe_generado','importe_ajuste','importe_pagar']) {
 for(const value of [null,undefined,'']) assert.throws(()=>createHorasJuanPdf({...base,[key]:value}),/No se puede guardar/);
}
for(const report of [base,{...base,tipo:'anticipo',horas:null,horas_enteras:null,minutos:null,importe_generado:null,importe_anticipo:400},{...base,tipo:'informativa',importe_anticipo:400,importe_ajuste:42.5,importe_pagar:null},{...base,importe_ajuste:-10,motivo_ajuste:'Compensación de informes anteriores '.repeat(100)}]) {
 assert.deepEqual(validateJuanReport(report),[]);
 const pdf=await getDocument({data:new Uint8Array(createHorasJuanPdf(report)),useSystemFonts:true}).promise;
 let text='';
 for(let page=1;page<=pdf.numPages;page++) {
  const items=(await (await pdf.getPage(page)).getTextContent()).items;
  for(const item of items) {assert.ok(item.transform[4]>=49);assert.ok(item.transform[4]+item.width<546);assert.ok(item.transform[5]>40);}
  text+=items.map(i=>i.str).join(' ')+' ';
 }
 const compact=s=>s.replace(/\s/g,'');
 for(const block of juanReportBlocks(report)) assert.ok(compact(text).includes(compact(block.text)),block.text);
 assert.ok(!text.includes('undefined'));
 if(report.tipo==='informativa') assert.ok(!text.includes('RECIBÍ:'));
 await pdf.destroy();
}
console.log('Horas Juan: validación, fechas, tres tipos, contenido completo y paginación correctos.');
