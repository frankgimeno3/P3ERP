export const articleStates=['Pendiente','Maquetación','Pasado a Carlos','Pasado a Ricardo','Pasado a Paco','Corregido','Publicado'];
export const articleOwners=['Ricardo','Frank','Paco'];
export const articleMagazines=['','Vidrio','Ventanas'];
export const articlePlacements={espana_previsto_numero:'Revista España previsto',latam_previsto_numero:'Nº Latam previsto',especial_numero:'Nº Especial',hueco_previsto:'Nº Hueco previsto'};
export function validateArticle(data) {
  const fail=message=>{throw Object.assign(new Error(message),{status:400});};
  if(!data||typeof data!=='object')fail('Completa los datos del artículo.');
  const row={};
  for(const key of ['empresa','titulo','estado','responsable_correccion','revista','paginas',...Object.keys(articlePlacements)]){
    row[key]=String(data[key] ?? '').trim();
    if(row[key].length>2000)fail('Un campo supera los 2.000 caracteres.');
  }
  if(!row.empresa||!row.titulo)fail('Empresa y título son obligatorios.');
  if(!articleStates.includes(row.estado))fail('Selecciona un estado válido.');
  if(!articleOwners.includes(row.responsable_correccion))fail('Selecciona un responsable de corrección.');
  if(!articleMagazines.includes(row.revista))fail('La revista debe ser Vidrio, Ventanas o en blanco.');
  if(!Object.keys(articlePlacements).some(key=>row[key]&&row[key]!=='-'))fail('Rellena al menos uno de los cuatro campos de publicación prevista.');
  if(!/^\d+$/.test(row.paginas)||!Number.isSafeInteger(Number(row.paginas))||Number(row.paginas)<1)fail('Indica un número de páginas entero mayor que cero.');
  if(typeof data.estado_publicacion_vidrioperfil!=='boolean')fail('El estado de publicación en Vidrioperfil debe ser una casilla marcada o desmarcada.');
  row.estado_publicacion_vidrioperfil=data.estado_publicacion_vidrioperfil?'Sí':'No';
  return row;
}
