import type {jsPDF} from 'jspdf';
export type DocumentModel={title:string;reference:string;customer:string;details:string[];head:string[];body:string[][];totals:string[][];payments:string[][];paymentHead:string[];notes?:string;invoice?:boolean};
export const documentMoney=(value:any,currency='EUR')=>Number(value||0).toLocaleString('es-ES',{useGrouping:true,minimumFractionDigits:2,maximumFractionDigits:2})+' '+currency;
export const documentDate=(value:any)=>{const s=String(value||'');const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);return m?`${m[3]}/${m[2]}/${m[1]}`:s||'—';};
export function invoiceDocumentModel(invoice:any):DocumentModel {
 const fiscal=invoice.datos_fiscales||{},account=invoice.verifactu_estado_envio==='factura emitida'?{}:invoice.cuenta_documento||{},currency=invoice.moneda||'EUR';
 const value=(key:string,alias?:string)=>fiscal[key]||(alias&&fiscal[alias])||account[key]||'';
 const lines=invoice.lineas||[],orders=(invoice.ordenes||[]).filter((o:any)=>!o.cancelada);
 const surcharge=lines.reduce((n:number,l:any)=>n+Number(l.base_imponible||0)*Number(l.recargo_equivalencia_porcentaje||0)/100,0),withholding=lines.reduce((n:number,l:any)=>n+Number(l.base_imponible||0)*Number(l.retencion_porcentaje||0)/100,0);
 return {invoice:true,title:invoice.factura_tipo==='abono'?'FACTURA ABONO':invoice.verifactu_estado_envio==='factura emitida'?'FACTURA':'FACTURA PREVIA',reference:invoice.numero_factura||'Sin número',customer:value('nombre_fiscal')||invoice.nombre_empresa||'—',details:[value('direccion_facturacion','direccion'),[value('cp_facturacion','cp'),value('poblacion_facturacion','poblacion')].filter(Boolean).join(' '),value('pais_facturacion','pais'),`Código cliente: ${invoice.codigo_cliente||'—'}`,`NIF/CIF: ${value('vat_code')||'—'}`,`Fecha: ${documentDate(invoice.fecha_factura)}`].filter(Boolean),head:['Concepto','Cantidad','Precio','Importe'],body:lines.map((l:any)=>[[l.concepto,l.descripcion].filter(Boolean).join('\n'),l.precio_no_desglosado?'—':String(l.cantidad??1),l.precio_no_desglosado?'—':documentMoney(l.precio_unitario,currency),documentMoney(l.base_imponible,currency)]),totals:[['Base imponible',documentMoney(invoice.base_imponible,currency)],['I.V.A.',[...new Set(lines.map((l:any)=>l.iva_porcentaje??invoice.iva_porcentaje??0))].join(' / ')+' %'],['Importe I.V.A.',documentMoney(Number(invoice.importe_total)-Number(invoice.base_imponible)-surcharge+withholding,currency)],...(surcharge?[['Recargo',documentMoney(surcharge,currency)]]:[]),...(withholding?[['Retención',documentMoney(withholding,currency)]]:[]),['TOTAL',documentMoney(invoice.importe_total,currency)]],paymentHead:['Vencimiento','Forma de pago','Banco','Importe'],payments:orders.map((o:any)=>[documentDate(o.fecha_teorica_cobro),o.forma_cobro||invoice.forma_cobro||'—',o.banco_cobro||'—',documentMoney(o.cobro_total,currency)]),notes:invoice.factura_snapshot?.iban?`IBAN ${invoice.factura_snapshot.iban} ${invoice.factura_snapshot.swift||''}`:undefined};
}
export async function buildDocumentPdf(model:DocumentModel,logo?:string):Promise<jsPDF>{
 const [{jsPDF},{autoTable}]=await Promise.all([import('jspdf'),import('jspdf-autotable')]);
 const doc=new jsPDF({unit:'mm',format:'a4'});doc.setProperties({title:`${model.title} ${model.reference}`,author:'Proporción 3, S.A.'});
 if(logo)doc.addImage(logo,'PNG',14,16,83,22);
 doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(model.title,14,49);doc.setFontSize(10);doc.text(model.reference,14,56);
 const address=[model.customer,...model.details].flatMap(text=>doc.splitTextToSize(text,87));doc.setFont('courier','normal');doc.setFontSize(9);doc.rect(107,16,89,Math.max(45,address.length*4+8));doc.text(address,110,23);
 const start=Math.max(76,24+address.length*4);
 const common={theme:'grid' as const,margin:{left:14,right:14,top:16,bottom:18},styles:{fontSize:9,cellPadding:2.5,lineColor:0,lineWidth:0.15},headStyles:{fillColor:0,textColor:255},rowPageBreak:'avoid' as const};
 autoTable(doc,{...common,startY:start,head:[model.head],body:model.body.length?model.body:[model.head.map(()=> '—')]});
 let y=(doc as any).lastAutoTable.finalY+5;
 if(model.invoice&&doc.getNumberOfPages()===1)y=Math.max(y,220);
 if(y+model.totals.length*7>276){doc.addPage();y=18;}
 autoTable(doc,{...common,startY:y,body:model.totals,tableWidth:100,margin:{...common.margin,left:96},columnStyles:{0:{fontStyle:'bold'},1:{halign:'right'}}});
 y=(doc as any).lastAutoTable.finalY+7;
 if(model.payments.length){autoTable(doc,{...common,startY:y,head:[model.paymentHead],body:model.payments});y=(doc as any).lastAutoTable.finalY+7;}
 if(model.notes)autoTable(doc,{...common,startY:y,body:[[model.notes]],theme:'plain'});
 for(let i=1;i<=doc.getNumberOfPages();i++){doc.setPage(i);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(`${i} / ${doc.getNumberOfPages()}`,196,289,{align:'right'});}
 return doc;
}
export async function downloadDocumentPdf(model:DocumentModel,filename:string){
 const response=await fetch('/invoices/proporcion3-letterhead.png');if(!response.ok)throw new Error('No se pudo cargar el membrete.');
 const blob=await response.blob();const logo=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});
 const doc=await buildDocumentPdf(model,logo);doc.save(filename.replace(/[<>:"/\\|?*]/g,'_')+'.pdf');
}
