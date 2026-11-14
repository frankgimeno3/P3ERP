import fs from 'node:fs/promises';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {withUserEventContext} from '../server/features/userEvents/EventContext.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try{await withUserEventContext({enabled:true,actorId:null,actorName:'Migración maquetas de revista',method:'POST',route:'maintenance/magazine-layouts-20261114',ip:null,ipSource:'maintenance'},async()=>{
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='5s'");
 const before=(await db.query('SELECT id_contenido FROM produccion_contenidos ORDER BY id_contenido')).rows;
 const activate=process.argv.includes('--activate-pdf-gate');
 await db.query(await fs.readFile(new URL(activate?'../database/migrations/20261114_0002_magazine_pdf_gate.sql':'../database/migrations/20261114_0001_magazine_layouts.sql',import.meta.url),'utf8'));
 const after=(await db.query('SELECT id_contenido FROM produccion_contenidos ORDER BY id_contenido')).rows;
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('La migración ha modificado los contenidos originales.');
 for(const table of ['produccion_maquetas','produccion_maqueta_contenidos'])if(!(await db.query(`SELECT 1 FROM pg_trigger WHERE tgrelid=$1::regclass AND tgname='p3_user_events_row' AND NOT tgisinternal`,[table])).rowCount)throw Error('Falta auditoría en '+table);
 await db.query('COMMIT');console.log(JSON.stringify({migrated:true,pdfGateActivated:activate,contentsPreserved:after.length}));
});}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
