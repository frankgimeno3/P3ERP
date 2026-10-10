import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());const p=getPgPool();
try{
 const report={accounts:(await p.query("SELECT count(*)::int n FROM comercial_cuentas WHERE id_cuenta!~'^ACC[0-9]+$'")).rows[0].n,
 suppliers:(await p.query("SELECT count(*)::int n FROM administracion_proveedores WHERE id_proveedor LIKE 'prov_excel_%'")).rows[0].n,
 aliases:(await p.query("SELECT to_regclass('general_identificadores_alias') id")).rows[0].id,
 activity:(await p.query("SELECT state,wait_event_type,wait_event,extract(epoch from now()-xact_start)::int seconds,left(query,80) statement FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND xact_start IS NOT NULL")).rows};
 console.log(JSON.stringify(report));
}finally{await p.end();}
