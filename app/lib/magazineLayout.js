import {contentDisplayName, productionStage} from './productionWorkflow.js';

export const layoutSupports = ['impresa', 'digital'];
export const layoutKey = row => `${row.id_contenido}:${row.tipo}`;
export const layoutPageLabel = position => position === -1 ? 'Portada' : position === 0 ? 'Interior portada' : `Página ${position}`;
export const physicalPageNumber = position => position + 2;
export const layoutFormatMatches = (row, support) => !row.formato_revista || row.formato_revista === 'impreso_digital' || row.formato_revista === (support === 'impresa' ? 'impreso' : 'digital');
export function contentLayoutDefaults(row) {
  const stored = row.maquetacion_produccion?.[row.tipo] || {};
  return {id_contenido: row.id_contenido, tipo: row.tipo, posicion: stored.posicion ?? row.posicion_revista ?? '', paginas: stored.paginas ?? row.paginas_ocupadas ?? '', seccion: stored.seccion || '', id_material: stored.id_material || ''};
}
export function validateLayoutEntry(entry) {
  if (!entry || !['articulos','anuncios'].includes(entry.tipo) || !String(entry.id_contenido || '').trim()) throw Error('Selecciona un artículo o anuncio válido.');
  if (entry.posicion === '' || entry.posicion === null || entry.posicion === undefined || !Number.isInteger(Number(entry.posicion)) || Number(entry.posicion) < -1) throw Error('Indica la posición inicial: -1 portada, 0 interior de portada o una página positiva.');
  if (entry.paginas === '' || !Number.isInteger(Number(entry.paginas)) || Number(entry.paginas) < 1 || Number(entry.paginas) > 1000) throw Error('Indica un número entero de páginas entre 1 y 1000.');
  if (!String(entry.seccion || '').trim() || String(entry.seccion).trim().length > 120) throw Error('Indica una sección de hasta 120 caracteres.');
  if (!String(entry.id_material || '').trim()) throw Error('Selecciona el PDF final del contenido.');
  if (Number(entry.posicion)+Number(entry.paginas)>999) throw Error('La maqueta admite como máximo 1000 páginas físicas.');
  if ([4,6].some(page=>page>=Number(entry.posicion)&&page<Number(entry.posicion)+Number(entry.paginas))) throw Error('Las páginas 4 y 6 están reservadas para Índice y Sumario.');
  return {...entry, posicion:Number(entry.posicion), paginas:Number(entry.paginas), seccion:String(entry.seccion).trim(), id_material:String(entry.id_material).trim()};
}
export function buildMagazineLayout(contents, entries, support, requestedTotal = 0, published = false) {
  const entryMap = new Map(entries.map(entry => [layoutKey(entry), entry]));
  const available = contents.filter(row => published ? entryMap.has(layoutKey(row)) : layoutFormatMatches(row, support) && productionStage(row) === 'publicacion');
  const issues = [], items = [], unplaced = [], seen = new Set();
  for (const content of available) {
    const key = layoutKey(content); if (seen.has(key)) continue; seen.add(key);
    const candidate = entryMap.get(key) || contentLayoutDefaults(content);
    try {
      const entry = validateLayoutEntry(candidate);
      const material = (content.materiales || []).find(m => m.id_material === entry.id_material && m.es_version_acabada && !m.eliminado_at && m.material_valido !== false);
      if (!material || Number(material.pdf_paginas) !== entry.paginas) throw Error('El PDF final falta o su número de páginas no coincide.');
      if (entry.posicion + entry.paginas > 999) throw Error('La maqueta admite como máximo 1000 páginas físicas.');
      items.push({...entry, key, nombre:contentDisplayName(content), empresa:content.nombre_empresa || content.cliente_hoja || content.nombre_cuenta || 'Sin empresa', material});
    } catch (error) { unplaced.push({...content, key, error:error.message}); issues.push(`${contentDisplayName(content)}: ${error.message}`); }
  }
  const orphans=entries.filter(entry=>!seen.has(layoutKey(entry)));
  for (const entry of orphans) issues.push(`El contenido ${entry.id_contenido} ya no está en fase 6 o no corresponde a esta edición.`);
  const minimum = Math.max(2, ...items.map(item => item.posicion + item.paginas + 1));
  const total = Math.ceil(Math.max(minimum, Number(requestedTotal) || 0) / 2) * 2;
  if (total > 1000) throw Error('La maqueta admite como máximo 1000 páginas físicas.');
  const pages = Array.from({length:total}, (_,index) => ({posicion:index - 1, fisica:index + 1, label:layoutPageLabel(index - 1), item:null, parte:0}));
  for (const item of items.sort((a,b) => a.posicion - b.posicion || a.key.localeCompare(b.key))) for (let part=0;part<item.paginas;part++) {
    const page = pages[item.posicion + 1 + part];
    if (page.item) issues.push(`${page.label}: coinciden «${page.item.nombre}» y «${item.nombre}».`);
    else Object.assign(page, {item, parte:part + 1});
  }
  const spreads = [[null, pages[0]]];
  for (let index=1;index<pages.length;index+=2) spreads.push([pages[index], pages[index+1] || null]);
  const sections = [];
  for (let index=0;index<pages.length;index++) {
    const name=pages[index].posicion===4?'Índice':pages[index].posicion===6?'Sumario':pages[index].item?.seccion || 'Sin contenido'; const last=sections.at(-1);
    if (last?.name===name) last.end=index+1; else sections.push({name,start:index,end:index+1});
  }
  const sectionOffset = index => index===0?0:index===total?total+2:index+1;
  return {items, pages, spreads, total, unplaced, orphans, issues:[...new Set(issues)], sections:sections.map(section=>({...section,top:sectionOffset(section.start)/2,height:(sectionOffset(section.end)-sectionOffset(section.start))/2,from:pages[section.start].label,to:pages[section.end-1].label}))};
}
