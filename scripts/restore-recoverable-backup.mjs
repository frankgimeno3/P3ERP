// Restores only into a NEW isolated local database. Never modifies the ERP database or S3.
import envLoader from '@next/env';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import pg from 'pg';
import {hashFile} from '../server/features/copiasSeguridad/RecoverableBackup.js';
envLoader.loadEnvConfig(process.cwd());
const run=promisify(execFile),[archive,target]=process.argv.slice(2);
if(!archive||!/^p3_restore_[a-z0-9_]+$/.test(target||''))throw new Error('Uso: node --experimental-default-type=module scripts/restore-recoverable-backup.mjs archivo.tar.gz p3_restore_nombre');
if(!process.env.P3_RESTORE_USER)throw new Error('Configura P3_RESTORE_USER, P3_RESTORE_PASSWORD y P3_RESTORE_PORT para PostgreSQL local.');
const connection={host:'127.0.0.1',port:Number(process.env.P3_RESTORE_PORT||5432),user:process.env.P3_RESTORE_USER,password:process.env.P3_RESTORE_PASSWORD,database:'postgres',connectionTimeoutMillis:10000};
const extracted=await fs.mkdtemp(path.join(os.tmpdir(),'p3-restore-'));
const listing=(await run('tar',['-tzf',path.resolve(archive)],{windowsHide:true,maxBuffer:32*1024*1024})).stdout.split(/\r?\n/).filter(Boolean);
if(listing.some(file=>file.startsWith('/')||file.includes('\\')||file.split('/').includes('..')||/^[a-z]:/i.test(file)))throw new Error('El paquete contiene rutas no permitidas.');
const types=(await run('tar',['-tvzf',path.resolve(archive)],{windowsHide:true,maxBuffer:32*1024*1024})).stdout.split(/\r?\n/).filter(Boolean);
if(types.some(line=>!['-','d'].includes(line[0])))throw new Error('El paquete contiene enlaces o tipos de archivo no permitidos.');
await run('tar',['-xzf',path.resolve(archive),'-C',extracted],{windowsHide:true,maxBuffer:1024*1024});
const manifest=JSON.parse(await fs.readFile(path.join(extracted,'manifest.json'),'utf8'));
if(manifest.format!=='p3erp-recoverable-v2')throw new Error('Formato de copia no válido.');
for(const entry of [manifest.database,...manifest.objects]){
  const file=path.resolve(extracted,entry.file);if(!file.startsWith(extracted+path.sep))throw new Error('Ruta de documento no válida.');
  if((await hashFile(file))!==entry.sha256)throw new Error('La copia no supera la verificación de integridad.');
}
const admin=new pg.Client(connection);await admin.connect();
try{if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[target])).rowCount)throw new Error('La base de prueba ya existe. Elige un nombre nuevo.');await admin.query(`CREATE DATABASE "${target}"`);}finally{await admin.end();}
await run(process.env.P3_PG_RESTORE||(process.platform==='win32'?'C:/Program Files/PostgreSQL/18/bin/pg_restore.exe':'pg_restore'),['--exit-on-error','--no-owner','--no-acl','--dbname',target,path.join(extracted,manifest.database.file)],{windowsHide:true,timeout:3600000,maxBuffer:1024*1024,env:{...process.env,PGHOST:connection.host,PGPORT:String(connection.port),PGUSER:connection.user,PGPASSWORD:connection.password,PGSSLMODE:'disable'}});
const restored=new pg.Client({...connection,database:target});await restored.connect();
try{const result=await restored.query("SELECT count(*)::int tables FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");console.log(JSON.stringify({restoredDatabase:target,tables:result.rows[0].tables,verifiedDocuments:manifest.objects.length,documentsDirectory:extracted}));}finally{await restored.end();}
