import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());const p=getPgPool(),db=await p.connect();
try {
 await db.query('BEGIN');
 await db.query("SELECT id FROM tesoreria_prevision_juan WHERE id='juan-2026' FOR UPDATE");
 const sabReason='Revisión de extractos: 57 comisiones pequeñas (0,13–1,30 €), con impuestos asociados; 11 cargos de 6 €; servicio de información de 48,40 € el 02/01/2026. No se encuentran cargos bancarios de comisiones de 20 ni 1.300 €. Tarifas públicas máximas no prueban las condiciones particulares ni distinguen los cargos genéricos entre remesas y transferencias. Presupuesto de Juan 3/2/1 € pendiente de integrar con el desglose; no sustituir automáticamente las recurrencias sin resolver su alcance.';
 const santReason='Extractos disponibles: liquidación del contrato 0006474 300 por 15 € el 26/06, 27/07, 26/08 y 28/09/2026. Compatible con mantenimiento mensual; Santander One Empresas contempla bonificación a 15 €/mes, pero el producto contratado no está acreditado. Preparar 15 €/mes para octubre–diciembre; falta confirmar fecha estimada y añadir previsiones a la fila actualmente vacía.';
 for(const [bank,row,reason] of [['Sabadell','payments:19',sabReason],['Santander','payments:42',santReason]])await db.query("UPDATE tesoreria_prevision_juan_asociaciones SET evidence=jsonb_set(evidence,'{reason}',to_jsonb($3::text)),updated_at=now() WHERE workbook_id='juan-2026' AND bank=$1 AND row_id=$2",[bank,row,reason]);
 await db.query("UPDATE tesoreria_prevision_juan SET version=version+1,updated_at=now() WHERE id='juan-2026'");
 await db.query('COMMIT');console.log('Prepared bank commission evidence in both Juan row modals; no extra charges created or forecasts removed.');
}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await p.end();}
