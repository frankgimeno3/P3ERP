// Offline plan only. Never changes RDS. Business data stays outside the repository.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
export const folder = path.resolve(process.env.USERPROFILE, 'OneDrive/Escritorio/respaldo-cuentas-20260916');
assert(!fs.existsSync(path.join(folder,'replacement-result.json')), 'Replacement already committed: preserve the reviewed plan');
const read = name => JSON.parse(fs.readFileSync(path.join(folder, `${name}.json`), 'utf8'));
const metadata = read('metadata');
const manifest = read('snapshot-manifest');
const tables = Object.keys(manifest.tables).filter(t => fs.existsSync(path.join(folder, `${t}.json`)));
const data = Object.fromEntries(tables.map(t => [t, read(t)]));
const keys = Object.fromEntries(metadata.constraints.filter(c => c.contype === 'p').map(c => [c.child, c.definition.match(/\((.+)\)/)[1].split(', ').map(x => x.replaceAll('"', ''))]));
const key = (t, r) => JSON.stringify(keys[t].map(k => String(r[k])));
const selected = Object.fromEntries(tables.map(t => [t, new Map()]));
function add(t, r, reason) { const k = key(t, r); if (selected[t].has(k)) return false; selected[t].set(k, {key: Object.fromEntries(keys[t].map(c => [c, r[c]])), reason}); return true; }
const has = (t, id) => id != null && id !== '' && selected[t].has(JSON.stringify([String(id)]));
const norm = v => String(v ?? '').normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toUpperCase();
const names = new Set(data.comercial_cuentas.map(r => norm(r.nombre_empresa)).filter(Boolean));
const codes = new Set(data.comercial_cuentas.flatMap(r => [r.id_cuenta, r.id_edisoft]).filter(v => v && v !== '0'));
data.comercial_cuentas.forEach(r => add('comercial_cuentas', r, 'Cuenta actual: raíz autorizada'));
// Only ownership edges: never follow id_agente/id_servicio/id_publicacion to shared parents.
const edges = {
  comercial_contactos: [['id_cuenta', 'comercial_cuentas']],
  comercial_propuestas_db: [['id_cuenta_propuesta', 'comercial_cuentas'], ['id_contacto_propuesta', 'comercial_contactos']],
  comercial_propuestas_lineas: [['id_propuesta', 'comercial_propuestas_db']],
  comercial_propuestas_cobros: [['id_propuesta', 'comercial_propuestas_db']],
  comercial_contratos: [['id_cuenta_contrato', 'comercial_cuentas'], ['id_contacto_contrato', 'comercial_contactos'], ['id_propuesta', 'comercial_propuestas_db']],
  comercial_contratos_lineas: [['id_contrato', 'comercial_contratos'], ['id_linea_propuesta', 'comercial_propuestas_lineas']],
  comercial_contratos_cobros: [['id_contrato', 'comercial_contratos'], ['id_cobro_propuesta', 'comercial_propuestas_cobros']],
  tesoreria_ordenes: [['id_cuenta', 'comercial_cuentas'], ['id_contrato', 'comercial_contratos'], ['id_factura', 'administracion_facturas_clientes'], ['id_cobro_contrato', 'comercial_contratos_cobros'], ['id_cobro_propuesta', 'comercial_propuestas_cobros']],
  administracion_facturas_clientes: [['id_cuenta', 'comercial_cuentas'], ['id_contrato', 'comercial_contratos'], ['factura_origen_id', 'administracion_facturas_clientes']],
  administracion_lineas_factura: [['id_factura_cliente', 'administracion_facturas_clientes'], ['id_linea_contrato', 'comercial_contratos_lineas']],
  tesoreria_recibos_importados: [['id_orden', 'tesoreria_ordenes'], ['numero_factura', 'administracion_facturas_clientes']],
  tesoreria_aplicaciones_cobro: [['id_orden', 'tesoreria_ordenes'], ['id_remesa', 'tesoreria_remesas']],
  produccion_contenidos: [['id_cuenta', 'comercial_cuentas'], ['id_contrato', 'comercial_contratos'], ['id_linea_contrato', 'comercial_contratos_lineas'], ['factura_hoja', 'administracion_facturas_clientes']],
  comercial_suscripciones: [['id_cuenta', 'comercial_cuentas'], ['id_propuesta', 'comercial_propuestas_db'], ['id_contrato', 'comercial_contratos']],
  cuentas_registro_eventos: [['id_cuenta', 'comercial_cuentas']],
  comentarios_registro_eventos: [['id_contacto', 'comercial_contactos']],
  tesoreria_ingresos_adicionales: [['id_cuenta', 'comercial_cuentas']],
};
let changed;
do {
  changed = false;
  for (const [t, relations] of Object.entries(edges)) for (const r of data[t]) {
    for (const [col, parent] of relations) if (has(parent, r[col])) changed = add(t, r, `${col} -> ${parent}: ${r[col]}`) || changed;
  }
  for (const r of data.produccion_contenidos) {
    if (codes.has(r.codigo_crm_hoja) || names.has(norm(r.cliente_hoja))) changed = add('produccion_contenidos', r, 'Código CRM/nombre exacto de cuenta actual') || changed;
    for (const [t, field] of [['comercial_contratos', 'array_contenidos'], ['comercial_contratos_lineas', 'array_id_contenidos']]) {
      if (data[t].some(p => selected[t].has(key(t, p)) && (p[field] || []).some(v => (typeof v === 'string' ? v : v.id_contenido) === r.id_contenido))) changed = add('produccion_contenidos', r, `${t}.${field}`) || changed;
    }
  }
  for (const r of data.administracion_facturas_clientes) if (data.tesoreria_ordenes.some(o => has('tesoreria_ordenes', o.id_orden) && o.id_factura === r.id_factura_cliente)) changed = add('administracion_facturas_clientes', r, 'Factura de orden vinculada') || changed;
  for (const r of data.produccion_control_redaccion) if (names.has(norm(r.empresa))) changed = add('produccion_control_redaccion', r, 'Empresa exacta de cuenta actual') || changed;
  const entities = {cuenta:'comercial_cuentas', contacto:'comercial_contactos', propuesta:'comercial_propuestas_db', contrato:'comercial_contratos', orden:'tesoreria_ordenes', factura:'administracion_facturas_clientes', contenido:'produccion_contenidos', remesa:'tesoreria_remesas'};
  for (const r of data.general_comentarios) if (entities[r.tipo_entidad] && has(entities[r.tipo_entidad], r.id_entidad)) changed = add('general_comentarios', r, `${r.tipo_entidad}:${r.id_entidad}`) || changed;
} while (changed);
// Known shared tables have no links in this snapshot. Fail rather than silently erase a shared record.
for (const [t, fields] of Object.entries({tesoreria_movimientos_bancarios:['id_cuenta','id_orden'], servicios_paginas_revista:['id_cuenta','id_contenido'], servicios_publicaciones:['cuenta_id','contenido_id'], administracion_ferias_ediciones:['id_cuenta_feria','id_cuenta_gestion','id_contrato']})) {
  const ownershipIds = new Set(['comercial_cuentas','tesoreria_ordenes','produccion_contenidos','comercial_contratos'].flatMap(p => [...selected[p].values()].flatMap(v => Object.values(v.key))));
  assert(!data[t].some(r => fields.some(f => ownershipIds.has(r[f]))), `Revisar referencias compartidas de ${t}`);
}
for (const t of ['produccion_materiales','tesoreria_remesas','fiscal_verifactu_registros','fiscal_verifactu_envios']) assert.equal(data[t].length, 0, `Revisar ${t} antes de continuar`);
for (const r of data.administracion_facturas_clientes.filter(r => has('administracion_facturas_clientes', r.id_factura_cliente))) assert.equal(r.verifactu_estado_envio, 'borrador', 'Factura emitida: detener');
// Detect conflicting explicit ownership, even when an indirect link matched.
for (const [t, field] of Object.entries({comercial_contactos:'id_cuenta',comercial_propuestas_db:'id_cuenta_propuesta',comercial_contratos:'id_cuenta_contrato',tesoreria_ordenes:'id_cuenta',administracion_facturas_clientes:'id_cuenta',produccion_contenidos:'id_cuenta',comercial_suscripciones:'id_cuenta'})) {
  for (const r of data[t]) if (selected[t].has(key(t, r)) && r[field]) assert(has('comercial_cuentas', r[field]), `Propiedad contradictoria ${t}:${key(t,r)} -> ${r[field]}`);
}
const plan = {createdAt: new Date().toISOString(), rootAccounts: data.comercial_cuentas.map(r => ({id:r.id_cuenta, name:r.nombre_empresa})), keys, edges, tables: Object.fromEntries(tables.map(t => [t, {before:data[t].length, delete:[...selected[t].values()], keep:data[t].length-selected[t].size}]))};
fs.writeFileSync(path.join(folder, 'deletion-plan.json'), JSON.stringify(plan,null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(plan.tables).map(([t,v])=>[t,{before:v.before,delete:v.delete.length,keep:v.keep}])),null,2));
