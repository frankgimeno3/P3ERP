import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pipeline} from 'node:stream/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {backupObjects,isDocumentStorageConfigured} from '../mediateca/S3Service.js';
const run=promisify(execFile);
export const backupRoot=()=>path.resolve(process.env.P3_BACKUP_DIRECTORY||path.join(process.env.LOCALAPPDATA||os.homedir(),'P3ERP','backups'));
const valid=id=>/^[a-f0-9-]{36}$/.test(String(id));
async function journal(job){job.updated=new Date().toISOString();const file=path.join(backupRoot(),job.id,'status.json');await fs.writeFile(file+'.tmp',JSON.stringify(job,null,2));await fs.rename(file+'.tmp',file);}
export async function listRecoverableBackups(){
  await fs.mkdir(backupRoot(),{recursive:true});
  const dirs=await fs.readdir(backupRoot());
  return (await Promise.all(dirs.filter(valid).map(id=>readBackup(id).catch(()=>null)))).filter(Boolean).sort((a,b)=>b.created.localeCompare(a.created));
}
export async function readBackup(id){if(!valid(id))throw Object.assign(new Error('Copia no válida.'),{status:400});const job=JSON.parse(await fs.readFile(path.join(backupRoot(),id,'status.json'),'utf8'));if(job.state==='working'&&Date.now()-new Date(job.updated||job.created).getTime()>7200000)return {...job,state:'error',stage:'La copia se interrumpió. Crea una nueva; la copia incompleta no está disponible para descargar.'};return job;}
export async function hashFile(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
export async function startRecoverableBackup(name){
  if(!String(name||'').trim())throw Object.assign(new Error('Escribe el nombre de la copia.'),{status:400});
  if(!isDocumentStorageConfigured())throw Object.assign(new Error('Falta configurar AWS_S3_BUCKET o S3_BUCKET antes de crear una copia recuperable con documentos.'),{status:503});
  if((await listRecoverableBackups()).some(job=>job.state==='working'))throw Object.assign(new Error('Ya hay una copia en curso.'),{status:409});
  const job={id:randomUUID(),name:String(name).trim().slice(0,255),created:new Date().toISOString(),state:'working',stage:'Preparando copia',objects:0,restoreTested:false};
  await fs.mkdir(path.join(backupRoot(),job.id,'payload','objects'),{recursive:true});await journal(job);
  // The job is independent of the HTTP request. Its journal and files survive navigation.
  void generate(job).catch(async error=>{job.state='error';job.stage=error.message==='El almacenamiento documental no está configurado.'?'Falta configurar AWS_S3_BUCKET o S3_BUCKET. La copia documental no se ha generado.':error.code==='ENOENT'?'No se encuentra pg_dump, pg_restore o tar. Revisa las rutas de las herramientas de copia.':'No se pudo completar la copia. Revisa la conexión a PostgreSQL, S3 y la instalación de pg_dump.';await journal(job);});
  return job;
}
async function generate(job){
  const dir=path.join(backupRoot(),job.id),payload=path.join(dir,'payload');
  const pgDump=process.env.P3_PG_DUMP||(process.platform==='win32'?'C:/Program Files/PostgreSQL/18/bin/pg_dump.exe':'pg_dump');
  const pgRestore=process.env.P3_PG_RESTORE||(process.platform==='win32'?'C:/Program Files/PostgreSQL/18/bin/pg_restore.exe':'pg_restore');
  job.stage='Copiando estructura y datos PostgreSQL';await journal(job);
  const env={...process.env,PGHOST:process.env.DATABASE_HOST,PGPORT:process.env.DATABASE_PORT,PGDATABASE:process.env.DATABASE_NAME,PGUSER:process.env.DATABASE_USER,PGPASSWORD:process.env.DATABASE_PASSWORD,PGSSLMODE:'require'};
  const caPath=process.env.DATABASE_CA_CERT_PATH||path.resolve(process.cwd(),'certs','rds-ca.pem');
  if(await fs.stat(caPath).then(()=>true).catch(()=>false)){env.PGSSLROOTCERT=caPath;env.PGSSLMODE='verify-full';}
  else if(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED==='true')env.PGSSLMODE='verify-full';
  const dump=path.join(payload,'database.dump');
  await run(pgDump,['--format=custom','--no-owner','--no-acl','--file',dump],{env,windowsHide:true,timeout:3600000,maxBuffer:1024*1024});
  await run(pgRestore,['--list',dump],{windowsHide:true,maxBuffer:16*1024*1024});
  const manifest={format:'p3erp-recoverable-v2',created:job.created,database:{file:'database.dump',sha256:await hashFile(dump)},objects:[],restoreTested:false};
  job.stage='Copiando documentos';await journal(job);
  for await(const object of backupObjects()){
    const relative=`objects/${createHash('sha256').update(object.key).digest('hex')}`;
    const file=path.join(payload,relative);await pipeline(object.body,createWriteStream(file));
    manifest.objects.push({key:object.key,file:relative,sha256:await hashFile(file),etag:object.etag,contentType:object.contentType});
    job.objects++;await journal(job);
  }
  await fs.writeFile(path.join(payload,'manifest.json'),JSON.stringify(manifest,null,2));
  job.stage='Empaquetando y verificando copia';await journal(job);
  await run('tar',['-czf',path.join(dir,'backup.tar.gz'),'-C',payload,'.'],{windowsHide:true,timeout:3600000,maxBuffer:1024*1024});
  await run('tar',['-tzf',path.join(dir,'backup.tar.gz')],{windowsHide:true,timeout:3600000,maxBuffer:32*1024*1024});
  job.sha256=await hashFile(path.join(dir,'backup.tar.gz'));job.state='ready';job.stage='Copia conservada y verificada por checksum. Restauración aislada pendiente.';await journal(job);
}
