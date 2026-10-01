import assert from 'node:assert/strict';
import env from '@next/env';
import { exportRows } from '../app/dashboard/operaciones/data/exportar/exportRows.js';
import { getCuentas } from '../server/features/cuenta/CuentaRepository.js';
import { getContactos } from '../server/features/contacto/ContactoRepository.js';
import { getPgPool } from '../server/database/pgClient.js';

// Fixtures stay in this test. The application reads authenticated APIs only.
const accounts = [
  {id_cuenta:'A',pais_cuenta:'España',actividades_cuenta:'Cristalería',presente_en_qq:true,datos_comerciales:{telefono_principal_cuenta:'123'}},
  {id_cuenta:'B',pais_cuenta:'Portugal',actividades_cuenta:'Otro',presente_en_qq:false},
];
assert.deepEqual(exportRows('cuentas',accounts,{paises:['espana'],actividades:['Cristalería'],presenteEnQQ:['Aparece en último QQ'],campos:['ID de la cuenta','Teléfono principal']}),[['ID de la cuenta','Teléfono principal'],['A','123']]);
assert.equal(exportRows('cuentas',accounts,{idsCuentas:['missing']}).length,1);
assert.equal(exportRows('cuentas',accounts,{}).length,3);
assert.throws(()=>exportRows('cuentas',{},{}),/listado/);
assert.throws(()=>exportRows('cuentas',accounts,{campos:['unknown']}),/columnas/);
const contacts = [{id_contacto:'C',id_cuenta:'A',idiomas:'español, inglés',suscripciones:['Newsletter Vidrio España'],pais_contacto:'España'}];
assert.equal(exportRows('contactos',contacts,{idsCuentas:['A'],idiomas:['ingles'],suscripciones:['Newsletter Vidrio España']}).length,2);
assert.equal(exportRows('contactos',contacts,{idsContactos:['missing']}).length,1);
env.loadEnvConfig(process.cwd());
try {
  for (const [kind,records] of [['cuentas',await getCuentas()],['contactos',await getContactos()]]) {
    const matrix=exportRows(kind,records,{});
    assert.equal(matrix.length,records.length+1);
    assert(matrix[0].length>0);
    if(records.length) assert.equal(matrix[1][0],records[0][kind==='cuentas'?'id_cuenta':'id_contacto']);
    console.log('PASS: '+kind+' exports '+records.length+' real RDS records; filters and columns verified.');
  }
} finally { await getPgPool().end(); }
