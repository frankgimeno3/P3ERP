export const CONTENT_TYPES = ['articulo', 'anuncio', 'otro'];
export const materialType = type => type === 'articulo' ? 'articulos' : type === 'anuncio' ? 'anuncios' : 'otros';
const normalize = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export function contentTypes(row) {
  const editorial=types=>row.es_editorial?[...new Set([...types.filter(type=>type!=='otro'),'articulo'])]:types;
  if (CONTENT_TYPES.includes(row.tipo_contenido)) return editorial([row.tipo_contenido]);
  if (Array.isArray(row.categorias_gestion)) {
    const categories = row.categorias_gestion.filter(type => CONTENT_TYPES.includes(type));
    if (categories.length) return editorial(categories);
  }
  // Imports used one contracted content for both deliverables. Preserve that ID
  // in both views instead of duplicating a signed contract or its billing.
  const result = [];
  if (row.articulo_hoja && !/no procede/i.test(row.articulo_hoja)) result.push('articulo');
  if (row.anuncio_hoja && !/no procede/i.test(row.anuncio_hoja)) result.push('anuncio');
  if (result.length) return editorial(result);
  if(row.es_editorial)return ['articulo'];
  const label = normalize([row.tipo_articulo, row.nombre_servicio_es, row.especificaciones_contenido, row.tipo_revista_servicio].join(' '));
  if (/articulo|reportaje|entrevista/.test(label)) return ['articulo'];
  if (/anuncio|publicidad|banner|pagina publicitaria|revista/.test(label)) return ['anuncio'];
  return ['otro'];
}
export function contentPending(row) {
  const state = normalize(row.estado_contenido || row.estado);
  if (/parcial/.test(state)) return true;
  return !/^(publicad[oa]s?(?:\s|$)|cancelad[oa]s?(?:\s|$)|anulad[oa]s?(?:\s|$)|no sale$|no se publica$)/.test(state.trim());
}
export function validateContentIntake(data) {
  const errors = [];
  if(data.ambito!==undefined&&!['revista','otros'].includes(data.ambito))errors.push('Selecciona un destino de producción válido.');
  if(data.ambito==='revista'&&(data.tipo==='otro'||(!data.contratado&&!data.para_revista)))errors.push('En contenido revista debes seleccionar un artículo o anuncio y su revista.');
  if(data.ambito==='otros'&&(data.para_revista||data.id_revista))errors.push('Los contenidos de revista se gestionan en Contenido revista.');
  if (!CONTENT_TYPES.includes(data.tipo)) errors.push('Selecciona el tipo de contenido.');
  if (typeof data.contratado !== 'boolean') errors.push('Indica si está asociado a algo contratado.');
  if (data.contratado) {
    if (!data.id_cuenta || !data.id_contrato || !data.id_contenido) errors.push('Selecciona empresa, contrato y contenido contratado.');
  } else {
    if (!data.sin_empresa && !data.id_cuenta) errors.push('Selecciona una cuenta o Sin empresa.');
    if (!String(data.nombre || '').trim()) errors.push('Indica el nombre del contenido.');
    if (String(data.nombre || '').length > 2000 || String(data.descripcion || '').length > 10000) errors.push('El nombre o la descripción son demasiado largos.');
    if (data.para_revista && !data.id_revista) errors.push('Selecciona una revista.');
  }
  if (data.tipo === 'otro' && (data.para_revista || data.id_revista)) errors.push('Solo los artículos y anuncios pueden asignarse a revista.');
  return errors;
}
export function validateIntakeFiles(files, mode) {
  const errors = [];
  if (!['zip', 'archivos'].includes(mode)) errors.push('Selecciona ZIP o archivos individuales.');
  if (!Array.isArray(files) || !files.length || files.length > 100) return [...errors, 'Selecciona entre 1 y 100 materiales.'];
  if (mode === 'zip' && (files.length !== 1 || !/\.zip$/i.test(files[0].filename))) errors.push('Selecciona un único archivo ZIP.');
  for (const file of files) {
    if (file.es_carpeta || file.isDirectory || file.webkitRelativePath || /[\\/\0]/.test(String(file.filename || '')) || /(?:inode|application)\/(?:x-)?directory/i.test(file.contentType || '')) errors.push('No se admiten carpetas. Comprímelas en un archivo ZIP.');
    if (!file.filename || !String(file.nombre_material || '').trim()) errors.push('Cada material debe tener archivo y nombre.');
    if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > 200 * 1024 * 1024) errors.push('Cada archivo debe ocupar entre 1 byte y 200 MB.');
    if (String(file.nombre_material || '').length > 2000 || String(file.descripcion || '').length > 10000) errors.push('El nombre o la descripción de un material son demasiado largos.');
  }
  return [...new Set(errors)];
}
