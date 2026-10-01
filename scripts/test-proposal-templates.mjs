import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import env from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';
import { createProposalTemplate, getProposalTemplate, updateProposalTemplate } from '../server/features/propuesta/ProposalTemplateRepository.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),schema='test_templates_'+randomUUID().replaceAll('-','');
const query=pool.query.bind(pool);
try {
  await db.query('CREATE SCHEMA '+schema);
  await db.query('SET search_path TO '+schema+',public');
  await db.query(`CREATE TABLE ${schema}.comercial_propuestas_plantillas (LIKE public.comercial_propuestas_plantillas INCLUDING ALL)`);
  pool.query=(...args)=>db.query(...args);
  await assert.rejects(createProposalTemplate({nombre:'Sin español',versiones:{en:[{id_servicio:'srv'}]}}),/español/);
  const created=await createProposalTemplate({nombre:'Prueba',versiones:{es:[{id_servicio:'srv',producto:'Servicio',precio_unitario:100}]}});
  const updated=await updateProposalTemplate(created.id_plantilla,{nombre:'Prueba 2',versiones:{es:[{id_servicio:'srv',producto:'Servicio'}],en:[{id_servicio:'srv',producto:'Service'}]}});
  assert.equal(updated.versiones.en[0].producto,'Service');
  assert.equal((await getProposalTemplate(created.id_plantilla)).nombre,'Prueba 2');
  console.log('PASS: plantilla en español obligatoria, versiones por idioma y edición persistida');
} finally {
  pool.query=query;
  await db.query('SET search_path TO public');
  await db.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');
  db.release();await pool.end();
}
