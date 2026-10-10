import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {allocateAccountIdentifier,allocateContactIdentifier,allocateContractIdentifier,allocateOrderIdentifier,allocateContentIdentifier,contractOrderIdentifier,invoiceIdentifier} from '../server/features/identifiers/BusinessIdentifiers.js';
import {renameIdentifiers,replaceOperationalIdentifiers} from '../server/features/identifiers/IdentifierNormalization.js';
env.loadEnvConfig(process.cwd());
const p=getPgPool(),db=await p.connect(),other=await p.connect(),schema='test_identifiers_'+randomUUID().replaceAll('-','');
try {
 await db.query('CREATE SCHEMA '+schema);
 await db.query('SET search_path TO '+schema);
 await other.query('SET search_path TO '+schema);
 await db.query(`CREATE TABLE comercial_cuentas(id_cuenta text PRIMARY KEY,nombre_empresa text,datos_comerciales jsonb);
 CREATE TABLE comercial_contactos(id_contacto text PRIMARY KEY,id_cuenta text REFERENCES comercial_cuentas(id_cuenta));
 CREATE TABLE comercial_contratos(id_contrato text PRIMARY KEY,array_id_ordenes jsonb,id_cuenta text REFERENCES comercial_cuentas(id_cuenta));
 CREATE TABLE tesoreria_ordenes(id_orden text PRIMARY KEY,id_contrato text REFERENCES comercial_contratos(id_contrato),id_cuenta text REFERENCES comercial_cuentas(id_cuenta),id_factura text,numero_cobro integer,importe numeric,datos_importacion jsonb,cobrada boolean);
 CREATE TABLE produccion_contenidos(id_contenido text PRIMARY KEY);
 CREATE TABLE refs(id text PRIMARY KEY,orden text UNIQUE REFERENCES tesoreria_ordenes(id_orden),data jsonb,archivo bytea);
 CREATE TABLE aplicaciones(id text,orden text REFERENCES tesoreria_ordenes(id_orden),PRIMARY KEY(id,orden));
 CREATE TABLE agentes_db(id_agente text PRIMARY KEY);
 CREATE TABLE laboral_empleados_en_nomina(id text PRIMARY KEY,id_empleado text UNIQUE);
 CREATE FUNCTION sync_employee_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO laboral_empleados_en_nomina VALUES('employee_'||NEW.id_agente,NEW.id_agente) ON CONFLICT(id_empleado) DO NOTHING; RETURN NEW; END $$;
 CREATE TRIGGER sync_employee_test AFTER INSERT OR UPDATE ON agentes_db FOR EACH ROW EXECUTE FUNCTION sync_employee_test();`);
 await db.query(await fs.readFile('database/migrations/20261009_0004_identifier_aliases.sql','utf8'));
 await db.query("INSERT INTO comercial_cuentas VALUES('ACC7','Siete','{}'),('acc_import','Importada','{}')");
 await db.query("INSERT INTO comercial_contactos VALUES('CON19','acc_import')");
 await db.query("INSERT INTO agentes_db VALUES('ag_old')");
 await db.query("INSERT INTO comercial_contratos VALUES('C26.000.012','[\"old_order\",\"C26.000.013-1/1\"]','acc_import')");
 await db.query(`INSERT INTO tesoreria_ordenes VALUES('old_order','C26.000.012','acc_import','526116',1,1894.86,'{"original":{"id_cuenta":"acc_import"},"cierre":{"id_cuenta":"acc_import"}}',true),('C26.000.013-1/1',NULL,'ACC7',NULL,1,42,'{}',false)`);
 await db.query("INSERT INTO refs VALUES('ref','old_order','{\"list\":[\"acc_import\",\"old_order\"]}',decode('0102','hex')),('ref2','C26.000.013-1/1','{}',decode('0102','hex')); INSERT INTO aplicaciones VALUES('app','old_order'); INSERT INTO produccion_contenidos VALUES('hp_26_000.992')");
 await db.query('BEGIN');
 assert.equal(await allocateAccountIdentifier(db),'ACC8');
 assert.equal(await allocateContactIdentifier(db),'CON20');
 assert.equal(await allocateContractIdentifier(db,'09/10/2026'),'C26.000.014');
 assert.equal(await allocateContentIdentifier(db,'09/10/2026'),'hp_26_000.993');
 assert.equal(await allocateOrderIdentifier(db,{contractId:'C26.000.012',number:2,total:2}),'C26.000.012-2/2');
 assert.equal(await allocateOrderIdentifier(db,{date:'09/10/2026'}),'O26.000.001-1/1');
 assert.throws(()=>contractOrderIdentifier('con_bad',1,1));
 assert.throws(()=>invoiceIdentifier('fac_excel_526116'));
 let snapshot;
 const changes=[{entity:'cuenta',table:'comercial_cuentas',column:'id_cuenta',old:'acc_import',new:'ACC8'},
 {entity:'orden',table:'tesoreria_ordenes',column:'id_orden',old:'old_order',new:'C26.000.013-1/1'},
 {entity:'orden',table:'tesoreria_ordenes',column:'id_orden',old:'C26.000.013-1/1',new:'C26.000.014-1/1'},
 {entity:'agente',table:'agentes_db',column:'id_agente',old:'ag_old',new:'ag_26_0001'}];
 await renameIdentifiers(db,changes,async s=>snapshot=s);
 assert.ok(snapshot.some(s=>s.table==='refs'));
 assert.equal((await db.query('SELECT id_cuenta FROM comercial_contactos')).rows[0].id_cuenta,'ACC8');
 assert.deepEqual((await db.query('SELECT array_id_ordenes FROM comercial_contratos')).rows[0].array_id_ordenes,['C26.000.013-1/1','C26.000.014-1/1']);
 const o=(await db.query("SELECT * FROM tesoreria_ordenes WHERE id_orden='C26.000.013-1/1'")).rows[0];
 assert.equal(o.importe,'1894.86');assert.equal(o.cobrada,true);
 assert.equal(o.datos_importacion.original.id_cuenta,'acc_import');assert.equal(o.datos_importacion.cierre.id_cuenta,'ACC8');
 assert.equal((await db.query('SELECT orden FROM aplicaciones')).rows[0].orden,'C26.000.013-1/1');
 assert.deepEqual((await db.query('SELECT archivo FROM refs')).rows[0].archivo,Buffer.from([1,2]));
 assert.deepEqual((await db.query('SELECT * FROM laboral_empleados_en_nomina')).rows,[{id:'employee_ag_old',id_empleado:'ag_26_0001'}]);
 assert.equal((await db.query("SELECT tgenabled FROM pg_trigger WHERE tgname='sync_employee_test' AND tgrelid='agentes_db'::regclass")).rows[0].tgenabled,'O');
 assert.equal((await db.query("SELECT count(*)::int n FROM pg_constraint WHERE connamespace=$1::regnamespace AND contype='f' AND condeferrable",[schema])).rows[0].n,0);
 await db.query('COMMIT');
 await db.query('BEGIN');
 await assert.rejects(()=>renameIdentifiers(db,[{entity:'cuenta',table:'comercial_cuentas',column:'id_cuenta',old:'ACC8',new:'ACC7'}],async()=>{}),/destino ya existe/);
 await db.query('ROLLBACK');
 assert.equal((await db.query("SELECT count(*)::int n FROM comercial_cuentas WHERE id_cuenta='ACC8'")).rows[0].n,1);
 // A concurrent transaction must wait and then see the committed new maximum.
 await db.query('BEGIN');const first=await allocateAccountIdentifier(db);
 await other.query('BEGIN');const waiting=allocateAccountIdentifier(other);
 await db.query('INSERT INTO comercial_cuentas(id_cuenta) VALUES($1)',[first]);await db.query('COMMIT');
 const second=await waiting;assert.equal(first,'ACC9');assert.equal(second,'ACC10');await other.query('ROLLBACK');
 assert.deepEqual(replaceOperationalIdentifiers({original:['old'],refs:['old']},new Map([['old','new']])),{original:['old'],refs:['new']});
 console.log('PASS: concurrent allocation; historical formats; collision rollback; renumbering chains; all FK/JSON/composite references; unchanged money, paid state, raw evidence and attachments.');
}finally{
 await db.query('ROLLBACK');await other.query('ROLLBACK');await other.query('SET search_path TO public');await db.query('SET search_path TO public');await db.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');db.release();other.release();await p.end();
}
