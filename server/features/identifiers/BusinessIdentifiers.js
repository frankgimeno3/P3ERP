// All allocators must run on the caller's transaction connection. The lock is
// shared by imports and normal forms; IDs are never calculated in the browser.
const serial = n => {
  if (!Number.isSafeInteger(n) || n < 1 || n > 999999) throw new Error('Numeración de identificadores agotada.');
  const digits = String(n).padStart(6, '0');
  return `${digits.slice(0, 3)}.${digits.slice(3)}`;
};
export function identifierYear(value = '') {
  const text = String(value || '');
  const year = text.match(/(?:^|\/)(20\d{2})(?:$|-)/)?.[1] || text.match(/20\d{2}/)?.[0];
  return year || new Intl.DateTimeFormat('es-ES', {year:'numeric',timeZone:'Europe/Madrid'}).format(new Date());
}
export function invoiceIdentifier(number) {
  const id = String(number || '').trim();
  if (!/^(?:\d+|[AP]\d+)$/.test(id)) throw Object.assign(new Error('Número de factura incompatible con las series existentes.'), {status:400});
  return id;
}
export function contractOrderIdentifier(contractId, number, total) {
  if (!/^C\d{2}\.\d{3}\.\d{3}$/.test(contractId) || !Number.isSafeInteger(number) || number < 1 || !Number.isSafeInteger(total) || total < number) {
    throw Object.assign(new Error('Contrato o numeración de cobro no válidos.'), {status:400});
  }
  return `${contractId}-${number}/${total}`;
}
async function lock(db, namespace) {
  await db.query("SELECT pg_advisory_xact_lock(hashtext('identificadores:' || $1))", [namespace]);
}
export async function allocateAccountIdentifier(db) {
  await lock(db, 'cuentas');
  const n = Number((await db.query("SELECT COALESCE(MAX(substring(id_cuenta FROM '^ACC([0-9]+)$')::bigint),0)+1 n FROM comercial_cuentas")).rows[0].n);
  return `ACC${n}`;
}
export async function allocateContactIdentifier(db) {
  await lock(db, 'contactos');
  const n = Number((await db.query("SELECT COALESCE(MAX(substring(id_contacto FROM '^CON([0-9]+)$')::bigint),0)+1 n FROM comercial_contactos")).rows[0].n);
  return `CON${n}`;
}
export async function allocateAgentIdentifier(db, date = '') {
  const yy=identifierYear(date).slice(-2);
  await lock(db,'agentes:'+yy);
  const n=Number((await db.query("SELECT COALESCE(MAX(substring(id_agente FROM $1)::bigint),0)+1 n FROM agentes_db",[`^ag_${yy}_([0-9]{4})$`])).rows[0].n);
  if(n>9999)throw new Error('Numeración de agentes agotada.');
  return `ag_${yy}_${String(n).padStart(4,'0')}`;
}
export async function allocateContractIdentifier(db, date = '') {
  const yy = identifierYear(date).slice(-2);
  await lock(db, 'contratos:' + yy);
  // Also reserve codes found in imported orders without a contract row.
  const n = Number((await db.query(`SELECT COALESCE(MAX(replace(code,'.','')::bigint),0)+1 n FROM (
    SELECT substring(id_contrato FROM $1) code FROM comercial_contratos
    UNION ALL SELECT substring(id_orden FROM $1) code FROM tesoreria_ordenes) s`, [`^C${yy}\\.([0-9]{3}\\.[0-9]{3})(?:-|$)`])).rows[0].n);
  return `C${yy}.${serial(n)}`;
}
export async function allocateContentIdentifier(db, date = '') {
  const yy = identifierYear(date).slice(-2);
  await lock(db, 'contenidos:' + yy);
  const n = Number((await db.query("SELECT COALESCE(MAX(replace(substring(id_contenido FROM $1),'.','')::bigint),0)+1 n FROM produccion_contenidos", [`^hp_${yy}_([0-9]{3}\\.[0-9]{3})$`])).rows[0].n);
  return `hp_${yy}_${serial(n)}`;
}
export async function allocateOrderIdentifier(db, {contractId = '', number = 1, total = number, date = '', invoiceId = ''} = {}) {
  await lock(db, 'ordenes');
  let base;
  if (contractId) {
    if((await db.query('SELECT 1 FROM tesoreria_ordenes WHERE id_contrato=$1 AND numero_cobro=$2',[contractId,Number(number)])).rowCount)throw new Error('Ya existe una orden para este cobro del contrato.');
    const highest = Number((await db.query('SELECT COALESCE(MAX(numero_cobro),0) n FROM tesoreria_ordenes WHERE id_contrato=$1', [contractId])).rows[0].n);
    return contractOrderIdentifier(contractId, Number(number), Math.max(Number(total), highest));
  }
  if (invoiceId) {
    const existing = (await db.query("SELECT substring(id_orden FROM '^(O[0-9]{2}\\.[0-9]{3}\\.[0-9]{3})-') base FROM tesoreria_ordenes WHERE id_factura=$1 AND id_orden~'^O[0-9]{2}\\.' ORDER BY id_orden LIMIT 1", [invoiceId])).rows[0];
    base = existing?.base;
    if(base&&(await db.query("SELECT 1 FROM tesoreria_ordenes WHERE substring(id_orden FROM '^(.+)-')=$1 AND numero_cobro=$2",[base,Number(number)])).rowCount)throw new Error('Ya existe una orden para este cobro de la factura.');
  }
  if (!base) {
    const yy = identifierYear(date).slice(-2);
    const n = Number((await db.query("SELECT COALESCE(MAX(replace(substring(id_orden FROM $1),'.','')::bigint),0)+1 n FROM tesoreria_ordenes", [`^O${yy}\\.([0-9]{3}\\.[0-9]{3})-`])).rows[0].n);
    base = `O${yy}.${serial(n)}`;
  }
  if (!Number.isSafeInteger(Number(number)) || Number(number) < 1) throw new Error('Número de cobro no válido.');
  return `${base}-${Number(number)}/${Math.max(Number(number), Number(total))}`;
}
