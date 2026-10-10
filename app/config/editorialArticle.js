export const articleStates=['Pendiente pasar producción','Pasado a Carlos','Maquetación','Pendiente corrección','Corregido','Pasado a Paco','Parcialmente publicado','Publicado'];
export const articleOwners=['Frank','Paco','Ricardo'];
export const articleMagazines=['','Vidrio','Ventanas','Otro'];
export const articlePlacements={espana_previsto_numero:'España previsto Nº',latam_previsto_numero:'Latam previsto Nº',especial_numero:'Especial Nº',hueco_previsto:'Hueco previsto'};
const normalize=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').trim().toLowerCase();
export function normalizeArticleState(value){
 const key=normalize(value);
 const legacy={pendiente:'Pendiente pasar producción','pendiente de pasar':'Pendiente pasar producción','pasada a paco':'Pasado a Paco','pasado a ricardo':'Pendiente corrección',hecho:'Corregido'};
 return articleStates.find(state=>normalize(state)===key)||legacy[key]||'Pendiente pasar producción';
}
export function articleDestinations(data){
 return Object.entries(articlePlacements).flatMap(([field,label])=>String(data[field]||'').split(/[,;\n]+/).map(value=>value.trim()).filter(value=>value&&value!=='-').map(value=>({key:field+':'+value,label:label+' '+value})));
}
export function articlePublicationStatus(data){
 const destinations=articleDestinations(data),stored=data.publicaciones_estado||{};
 const legacyPublished=normalize(data.estado)==='publicado'&&!Object.keys(stored).length;
 return Object.fromEntries(destinations.map(d=>[d.key,stored[d.key]===true||legacyPublished]));
}
export function articleDisplayState(data){
 const flags=Object.values(articlePublicationStatus(data));
 if(flags.length&&flags.every(Boolean))return 'Publicado';
 if(flags.some(Boolean))return 'Parcialmente publicado';
 return normalizeArticleState(data.estado);
}
export function validateArticle(data){
 const fail=message=>{throw Object.assign(new Error(message),{status:400});};
 if(!data||typeof data!=='object')fail('Completa los datos del artículo.');
 const row={};
 for(const key of ['empresa','titulo','estado','responsable_correccion','revista','paginas','donde_esta','pasado_produccion_dia',...Object.keys(articlePlacements)]){
  row[key]=String(data[key]??'').trim();if(row[key].length>2000)fail('Un campo supera los 2.000 caracteres.');
 }
 row.estado=normalizeArticleState(row.estado);
 if(!data.estado||(!articleStates.some(s=>normalize(s)===normalize(data.estado))&&!['pendiente','pendiente de pasar','pasada a paco','pasado a ricardo','hecho'].includes(normalize(data.estado))))fail('Selecciona un estado válido.');
 row.responsable_correccion=articleOwners.find(owner=>normalize(owner)===normalize(row.responsable_correccion))||row.responsable_correccion;
 row.revista=articleMagazines.find(m=>normalize(m)===normalize(row.revista))??row.revista;
 if(!row.empresa||!row.titulo)fail('Cuenta y título son obligatorios.');
 if(!articleOwners.includes(row.responsable_correccion))fail('Selecciona un responsable de corrección.');
 if(!articleMagazines.includes(row.revista))fail('La portada debe ser Vidrio, Ventanas, Otro o en blanco.');
 if(!articleDestinations(row).length)fail('Rellena al menos uno de los cuatro campos de publicación prevista.');
 if(!/^\d+$/.test(row.paginas)||!Number.isSafeInteger(Number(row.paginas))||Number(row.paginas)<1)fail('Indica un número de páginas entero mayor que cero.');
 if(row.pasado_produccion_dia){
  const m=row.pasado_produccion_dia.match(/^(\d{2})\/(\d{2})\/(\d{4})$/),d=m&&new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));
  if(!m||d.getFullYear()!==Number(m[3])||d.getMonth()!==Number(m[2])-1||d.getDate()!==Number(m[1]))fail('La fecha de paso a producción no es válida.');
 }
 const destinations=articleDestinations(row);
 row.publicaciones_estado=Object.fromEntries(destinations.map(d=>[d.key,data.publicaciones_estado?.[d.key]===true]));
 if(row.estado==='Publicado'&&destinations.length===1)row.publicaciones_estado[destinations[0].key]=true;
 const flags=Object.values(row.publicaciones_estado);
 if(row.estado==='Publicado'&&!flags.every(Boolean))fail('Confirma la publicación en todos los números previstos antes de marcar Publicado.');
 if(row.estado==='Parcialmente publicado'&&!flags.some(Boolean))fail('Indica en qué número se ha publicado el artículo.');
 if(flags.every(Boolean))row.estado='Publicado';else if(flags.some(Boolean))row.estado='Parcialmente publicado';
 if(typeof data.estado_publicacion_vidrioperfil!=='boolean')fail('El estado de publicación en Vidrioperfil debe ser una casilla marcada o desmarcada.');
 row.estado_publicacion_vidrioperfil=data.estado_publicacion_vidrioperfil?'Sí':'No';
 if(data.id_cuenta)row.id_cuenta=String(data.id_cuenta);
 if(data.id_contrato_extra!==undefined)row.id_contrato_extra=String(data.id_contrato_extra||'').trim();
 return row;
}
