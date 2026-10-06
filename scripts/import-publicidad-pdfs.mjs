import env from '@next/env';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {getPgPool} from '../server/database/pgClient.js';
import {importPublicidadPdf} from '../server/features/factura/PublicidadPdfImport.js';
import {parsePublicidadReceiptPdf} from '../server/features/factura/PublicidadPdfParser.js';
env.loadEnvConfig(process.cwd());
const directory=resolve(process.argv[2]||''),pool=getPgPool();
try{
  const {rows}=JSON.parse(await readFile(join(directory,'parsed.json'),'utf8'));
  const extracted=JSON.parse(await readFile(join(directory,'extracted.json'),'utf8'));
  const receiptDocuments=extracted.filter(document=>document.file.includes('RECIBO'));
  const receipts=receiptDocuments.flatMap(parsePublicidadReceiptPdf);
  for(const receipt of receipts){
    const invoice=rows.find(row=>row.numero===receipt.numero_factura),payment=invoice?.cobros.find(item=>item.numero===receipt.numero_cobro);
    if(!payment||Math.round(payment.importe*100)!==Math.round(receipt.importe*100)||payment.fecha!==receipt.fecha_teorica)throw new Error('El recibo difiere de la factura: '+receipt.numero_recibo);
  }
  const deferred=(process.argv.find(argument=>argument.startsWith('--defer='))?.slice(8)||'').split(',').filter(Boolean);
  const selected=rows.filter(row=>!deferred.includes(row.numero));
  console.log(JSON.stringify({invoices:rows.length,ready:selected.length,receiptPdfs:receiptDocuments.length,receipts:receipts.length,deferred}));
  if(!process.argv.includes('--apply'))process.exitCode=0;
  else{
    await pool.query(await readFile(new URL('../database/migrations/20261006_0003_customer_invoice_documents.sql',import.meta.url),'utf8'));
    const backups=join(directory,'backups');await mkdir(backups,{recursive:true});
    const report=[];
    for(let offset=0;offset<selected.length;offset+=20){
      const batch=selected.slice(offset,offset+20);
      const result=await importPublicidadPdf(batch,{pool,creditOrigins:rows.filter(row=>row.abono).map(row=>row.originalFactura),
        beforeApply:work=>writeFile(join(backups,`batch-${offset}-${Date.now()}.json`),JSON.stringify(work,null,2)),
        readDocument:async row=>{
          const files=[row.file,...receiptDocuments.filter(document=>document.file.startsWith(row.originalNumero+' ')).map(document=>document.file)];
          return Promise.all(files.map(async name=>({name,bytes:await readFile(join(directory,'PUBLICIDAD',name))})));
        }});
      report.push(result);await writeFile(join(directory,'import-report.json'),JSON.stringify(report,null,2));
      console.log(JSON.stringify({batch:offset/20+1,...result}));
    }
  }
}finally{await pool.end();}
