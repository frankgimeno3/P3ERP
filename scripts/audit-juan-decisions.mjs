import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const p=getPgPool();
try {
 console.log('STATEMENTS',JSON.stringify((await p.query("SELECT banco,fecha_operativa,fecha_valor,concepto,importe FROM tesoreria_movimientos_bancarios WHERE concepto ILIKE '%cosva%' OR concepto ILIKE '%senia%' OR concepto ILIKE '%securitas%' ORDER BY fecha_operativa")).rows));
 console.log('ENTITIES',JSON.stringify((await p.query("SELECT id_proveedor,nombre_proveedor,nombre_fiscal_proveedor FROM administracion_proveedores WHERE concat_ws(' ',nombre_proveedor,nombre_fiscal_proveedor) ~* 'tribut|hacienda|aeat|tgss|seguridad social|ajuntament|ayuntamiento|santander|amarant'")).rows));
 console.log('PAYROLL',JSON.stringify((await p.query("SELECT id_cargo_recurrente,tipo_cargo,id_proveedor,id_agente,banco_pago,programacion FROM tesoreria_cargos_recurrentes WHERE activo AND tipo_cargo='nomina'")).rows));
 console.log('DUE',JSON.stringify((await p.query("SELECT v.*, EXISTS(SELECT 1 FROM tesoreria_vencimientos_aplicaciones a WHERE a.id_vencimiento=v.id) applied FROM tesoreria_cargos_vencimientos v WHERE id_cargo_recurrente IN(4,5,6,7,15,16,17,18,20) AND fecha BETWEEN '2026-10-01' AND '2026-12-31' ORDER BY id_cargo_recurrente,fecha")).rows));
}finally{await p.end();}
