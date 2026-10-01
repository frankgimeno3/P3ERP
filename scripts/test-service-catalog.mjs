import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {getCanales,getCanal,saveCanal} from '../server/features/servicio/CanalRepository.js';
import {getServicios,createServicio,saveServicio,getServicioById} from '../server/features/servicio/ServicioRepository.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),schema='test_catalog_'+randomUUID().replaceAll('-',''),original=pool.query.bind(pool);
try {
  await db.query('CREATE SCHEMA '+schema);
  await db.query('SET search_path TO '+schema+',public');
  for(const table of ['servicios_grupos_servicios','servicios_db'])await db.query('CREATE TABLE '+schema+'.'+table+' (LIKE public.'+table+' INCLUDING ALL)');
  pool.query=(...args)=>db.query(...args);
  await saveCanal('canal_test',{nombre_medio:'Canal prueba'},true);
  const data={id_servicio:'servicio_test',id_medio:'canal_test',nombre_servicio_es:'Servicio prueba',nombre_servicio_en:'Test service',nombre_servicio_it:'Servizio di prova',nombre_servicio_pt:'Serviço de teste',precio_tarifa:125.5,disponibilidad:'Ofrecible',fecha_publicacion_servicio:'30/12/2099',
    medio_servicio_es:'Canal',medio_servicio_en:'Channel',medio_servicio_it:'Canale',medio_servicio_pt:'Canal',
    edicion_servicio_es:'Edición',edicion_servicio_en:'Edition',edicion_servicio_it:'Edizione',edicion_servicio_pt:'Edição',
    publicacion_servicio_es:'Publicación',publicacion_servicio_en:'Publication',publicacion_servicio_it:'Pubblicazione',publicacion_servicio_pt:'Publicação'};
  await createServicio(data);
  assert.equal((await getCanales())[0].servicios,1);
  assert.equal((await getServicios({idMedio:'canal_test'}))[0].nombre_espanol,'Servicio prueba');
  await saveServicio(data.id_servicio,{nombre_servicio_es:'Nombre editado',nombre_servicio_en:'Edited name',nombre_servicio_it:'Nome modificato',nombre_servicio_pt:'Nome alterado',precio_tarifa:'',disponibilidad:'Oculto'});
  const saved=await getServicioById(data.id_servicio);
  assert.equal(saved.nombre_espanol,'Nombre editado');assert.equal(saved.precio_tarifa,null);assert.equal(saved.disponibilidad,'Oculto');
  assert.equal(saved.nombre_servicio_en,'Edited name');
  await saveCanal('canal_test',{nombre_medio:'Canal editado'});
  assert.equal((await getCanal('canal_test')).nombre_medio,'Canal editado');
  await assert.rejects(createServicio({...data,id_servicio:'invalid',id_medio:'missing'}),/canal/);
  await assert.rejects(saveServicio(data.id_servicio,{precio_tarifa:-1}),/tarifa/);
  await assert.rejects(saveServicio(data.id_servicio,{fecha_publicacion_servicio:'31/02/2026'}),/Fecha/);
  await assert.rejects(createServicio(data),error=>error.code==='23505');
  await assert.rejects(saveServicio('missing',{}),/no encontrado/);
  console.log('PASS: real-schema channel/service CRUD, associations, proposal names, hidden status, nullable prices, invalid references/dates and duplicate IDs.');
} finally {
  pool.query=original;await db.query('SET search_path TO public');await db.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');db.release();await pool.end();
}
