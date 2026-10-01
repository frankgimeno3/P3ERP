// Offline audit: no database connection, deletion or import.
import fs from 'node:fs';
import path from 'node:path';
const folder=path.resolve(process.env.USERPROFILE,'OneDrive/Escritorio/importacion-administracion-produccion-20260920');
const read=name=>JSON.parse(fs.readFileSync(path.join(folder,`${name}.json`),'utf8'));
const source=read('source'),admin=Object.values(source)[0],production=Object.entries(source).slice(1).flatMap(([sheet,rows])=>rows.map(row=>({...row,sourceSheet:sheet})));
const text=value=>String(value??'').trim();
const norm=value=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const group=(rows,key)=>rows.reduce((all,row)=>{(all[key(row)]??=[]).push(row);return all;},{});
const accounts=read('comercial_cuentas');
const missing=new Map();
for(const row of [...admin,...production]){
 const code=text(row['CODIGO CRM']),name=text(row.CLIENTE);
 // Excel numeric codes identify Edisoft accounts; names are suggestions only.
 let hits=accounts.filter(a=>text(a.id_edisoft)===code);
 if(!hits.length&&/^ACC\d+$/.test(code))hits=accounts.filter(a=>a.id_cuenta===code);
 if(hits.length!==1){
  const entry=missing.get(code)||{code,names:[],candidates:[]};
  if(!entry.names.includes(name))entry.names.push(name);
  const tokens=norm(name);
  for(const a of accounts.filter(a=>tokens.length>=5&&(norm(a.nombre_empresa).includes(tokens)||tokens.includes(norm(a.nombre_empresa)))))if(!entry.candidates.some(c=>c.id===a.id_cuenta))entry.candidates.push({id:a.id_cuenta,name:a.nombre_empresa,crm:a.id_edisoft});
  missing.set(code,entry);
 }
}
const contractGroups=group(admin,row=>text(row['CONTRATO ASOCIADO']));
const priceIssues=Object.entries(contractGroups).filter(([code])=>/^C\d{2}\.\d/.test(code)).map(([code,rows])=>{
 const bases=[...new Set(rows.map(row=>Number(row['IMPORTE TOTAL BI CONTRATO']||0)))];
 const base=bases.reduce((sum,n)=>sum+n,0),total=Math.round(rows.reduce((sum,row)=>sum+Number(row['IMPORTE CON IVA']||0),0)*100)/100;
 return {code,base,total,rows:rows.map(r=>r.sourceRow),rate:base?total/base:null};
}).filter(row=>row.base>0&&row.total>0&&![1,1.04,1.1,1.21].some(rate=>Math.abs(row.total-row.base*rate)<=Math.max(0.02,row.rows.length*0.005)+0.000001));
const duplicateOrders=Object.entries(group(admin,row=>text(row.ORDEN))).filter(([,rows])=>rows.length>1).map(([code,rows])=>({code,rows:rows.map(r=>r.sourceRow),resolution:'Conservar cada fila con identificador técnico único y referencia original; no consolidar importes.'}));
const duplicateContents=Object.entries(group(production,row=>text(row.IDENTIFICADOR))).filter(([,rows])=>rows.length>1).map(([code,rows])=>({code,rows:rows.map(r=>({sheet:r.sourceSheet,row:r.sourceRow,contract:r.CONTRATO,client:r.CLIENTE})),resolution:'Son contenidos diferentes: preservar ambos con identificadores únicos y referencia original.'}));
const invoiceCodes=new Set(admin.map(r=>text(r.FACTURA)).filter(v=>v&&!/^(No procede|-)$/i.test(v)));
const receiptRows=admin.filter(r=>/RECIBO/i.test(r['FORMA DE COBRO']));
const remesas=new Set(receiptRows.map(r=>text(r['Nº REMESA'])).filter(v=>v&&!/^(No procede|-)$/i.test(v)));
const currentOrderIds=read('tesoreria_ordenes').map(r=>r.id_orden);
const currentContractIds=[...new Set(read('tesoreria_ordenes').map(r=>r.id_contrato).filter(Boolean))];
const plan={
 status:'PREPARADO; requiere resolver decisiones de negocio antes de sustituir RDS',
 totals:{orders:admin.length,production2026:Object.values(source)[1].length,productionPrevious:Object.values(source)[2].length,invoiceReferences:invoiceCodes.size,receipts:receiptRows.length,remesas:remesas.size},
 replacement:{orders:currentOrderIds,contracts:currentContractIds,linkedInvoices:read('administracion_facturas_clientes').filter(f=>currentContractIds.includes(f.id_contrato)).map(f=>f.id_factura_cliente),productionRowsToReconcile:read('produccion_contenidos').length},
 exactAgentMapping:{PEP:'ag_25_0004',GIMENO:'ag_305a8d12a9a44be698bd',MONTSE:'ag_8ebc433331614e8dbf2b',RICARDO:'ag_25_0002',FRANK:'ag_25_0008'},
 unresolvedAgents:['MARKETING'],unresolvedAccounts:[...missing.values()],priceIssues,duplicateOrders,duplicateContents,
 sharedContracts:Object.entries(contractGroups).filter(([code,rows])=>/^C\d{2}\.\d/.test(code)&&new Set(rows.map(r=>text(r['CODIGO CRM']))).size>1).map(([code,rows])=>({code,accounts:[...new Set(rows.map(r=>text(r['CODIGO CRM'])))]})),
 zeroCollectionsWithPositiveBase:admin.filter(r=>Number(r['IMPORTE CON IVA'])===0&&Number(r['IMPORTE TOTAL BI CONTRATO'])>0).map(r=>({row:r.sourceRow,code:r['CONTRATO ASOCIADO'],base:r['IMPORTE TOTAL BI CONTRATO']})),
 rules:['No crear propuestas ficticias.','Importes globales sin reparto inventado por contenido ni precio unitario ficticio.','No emitir facturas ni enviar datos a AEAT: se crean facturas previas.','Conservar columnas y valores originales en datos de importación con archivo, hoja y fila.','No borrar cuentas, agentes, extractos bancarios ni catálogos compartidos.','Sustitución en una transacción, solo tras validar referencias, duplicados e importes; verificar antes del commit.']
};
fs.writeFileSync(path.join(folder,'plan.json'),JSON.stringify(plan,null,2));
const rows=[['Contrato','Base del Excel','Cobros del Excel','Filas'],...priceIssues.map(r=>[r.code,r.base,r.total,r.rows.join(', ')])];
const report=`# Preparación de la importación\n\nNo se han borrado ni importado registros de RDS.\n\n${JSON.stringify(plan.totals,null,2)}\n\n## Importes que necesitan un criterio\n\n${rows.map((r,i)=>'| '+r.join(' | ')+' |'+(i===0?'\n|---|---:|---:|---|':'')).join('\n')}\n\n## Cuentas sin coincidencia inequívoca\n\n${plan.unresolvedAccounts.map(a=>`- CRM ${a.code}: ${a.names.join(' / ')}. Candidatos: ${a.candidates.map(c=>c.id+' '+c.name).join('; ')||'ninguno por nombre exacto o contenido'}.`).join('\n')}\n\n## Duplicados\n\nLas referencias de órdenes repetidas corresponden a filas diferentes: se conservarán por separado. Tres identificadores de contenido se reutilizan para OBRA BLANCA y COOLTEMPER; no se sobrescribirá un contenido con el otro.\n\nEl plan completo está en plan.json y la copia previa de las tablas en esta misma carpeta.\n`;
fs.writeFileSync(path.join(folder,'revision-importacion.md'),report);
console.log(JSON.stringify({totals:plan.totals,unresolvedAccounts:missing.size,priceIssues:priceIssues.length,sharedContracts:plan.sharedContracts.length,report:path.join(folder,'revision-importacion.md')},null,2));
