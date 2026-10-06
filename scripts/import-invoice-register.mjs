import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {basename,join} from 'node:path';
import {tmpdir} from 'node:os';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {parseInvoiceRegister,importInvoiceRegister} from '../server/features/factura/InvoiceRegisterImport.js';
env.loadEnvConfig(process.cwd());
const file=process.argv.find((arg,index)=>index>1&&!arg.startsWith('--'));
if(!file)throw new Error('Indica el archivo Excel. Añade --apply para confirmar la importación.');
const source=parseInvoiceRegister(await readFile(file),basename(file)),pool=getPgPool();
try{
 const preview=await importInvoiceRegister(source.rows,{pool});
 const directory=join(tmpdir(),'p3-invoice-register');await mkdir(directory,{recursive:true});
 const backup=join(directory,'backup-'+source.hash+'-'+Date.now()+'.json');await writeFile(backup,JSON.stringify(preview.backup,null,2));
 const result=process.argv.includes('--apply')?await importInvoiceRegister(source.rows,{pool,apply:true,beforeApply:data=>writeFile(backup,JSON.stringify(data,null,2))}):preview;
 await writeFile(join(directory,'report-'+source.hash+'.json'),JSON.stringify({summary:result.summary,reserved:source.reserved},null,2));
 console.log(JSON.stringify({...result.summary,invoices:undefined,reserved:source.reserved.length,backupDirectory:directory},null,2));
}finally{await pool.end();}
