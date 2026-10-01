const accountFields = {
  'ID de la cuenta': 'id_cuenta', 'Nombre de la empresa': 'nombre_empresa', 'País de la cuenta': 'pais_cuenta',
  'ID del agente': 'id_agente', 'Descripción de la cuenta': 'descripcion_cuenta', 'Actividades de la cuenta': 'actividades_cuenta',
  'Presente en QQ': 'presente_en_qq', 'Fuente de novedades': 'fuente_novedades_cuenta',
  'Ciudad principal': 'ciudad_principal_cuenta', 'Teléfono principal': 'telefono_principal_cuenta',
  'Categoría principal': 'categoria_principal_cuenta', 'Contacto principal': 'contacto_principal', 'Resumen de actividad': 'resumen_actividad_cuenta',
};
const contactFields = ['id_contacto','nombre_contacto','apellidos_contacto','nombre_completo_contacto','id_cuenta','nombre_empresa','telefono_contacto','email_contacto','cargo_contacto','idiomas','conocido_en','contactado_en_feria','suscripciones','otros_datos_interes','pais_contacto'];
const normalized = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const values = value => Array.isArray(value) ? value.flatMap(values) : value && typeof value === 'object' ? Object.values(value).flatMap(values) : String(value ?? '').split(/[,;|]/).map(normalized);
const matches = (selected, value) => !selected?.length || selected.some(item => values(value).includes(normalized(item)));
const cell = value => typeof value === 'boolean' ? (value ? 'Sí' : 'No') : value && typeof value === 'object' ? JSON.stringify(value) : value ?? '';

export function exportRows(kind, records, config) {
  if (!Array.isArray(records)) throw new Error('La respuesta del servidor no contiene un listado válido.');
  const accounts = kind === 'cuentas';
  const selected = accounts ? config.campos : config.camposExcel;
  const headers = selected?.length ? selected : accounts ? Object.keys(accountFields) : contactFields;
  const allowed = accounts ? Object.keys(accountFields) : contactFields;
  if (headers.some(header => !allowed.includes(header))) throw new Error('La exportación contiene columnas desconocidas.');
  const filtered = records.filter(row => {
    if (!matches(config.paises, accounts ? row.pais_cuenta : row.pais_contacto) || !matches(config.idsCuentas,row.id_cuenta)) return false;
    if (!accounts) return matches(config.idsContactos,row.id_contacto) && matches(config.idiomas,row.idiomas) && matches(config.suscripciones,row.suscripciones);
    if (!matches(config.actividades,row.actividades_cuenta)) return false;
    return !config.presenteEnQQ?.length || config.presenteEnQQ.includes(row.presente_en_qq ? 'Aparece en último QQ' : 'No aparece en último QQ');
  });
  return [headers, ...filtered.map(row => headers.map(header => {
    const key = accounts ? accountFields[header] : header;
    return cell(row[key] ?? row.datos_comerciales?.[key]);
  }))];
}
