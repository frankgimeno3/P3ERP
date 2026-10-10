const clean=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();
export function isSpecialMagazine(row){
 const value=clean(row.especial);
 return (!!value&&!['no','false','0','regular'].includes(value))||/especial/.test(clean(row.edicion)+' '+clean(row.numero_publicacion));
}
export function magazineEdition(row){
 if(isSpecialMagazine(row))return 'ESPECIALES';
 const value=clean(row.edicion);
 return /america|latam/.test(value)?'América Latina':/iberia|espana/.test(value)?'Iberia':row.edicion||'Sin edición';
}
export function articleMatchesMagazine(article,magazine){
 const title=clean(magazine.revista),sector=title.includes('vidrio')?'vidrio':title.includes('ventana')?'ventanas':title.includes('hueco')?'hueco':'';
 if(!sector)return false;
 if(sector!=='hueco'&&clean(article.revista)!==sector)return false;
 const field=isSpecialMagazine(magazine)?'especial_numero':sector==='hueco'?'hueco_previsto':magazineEdition(magazine)==='Iberia'?'espana_previsto_numero':magazineEdition(magazine)==='América Latina'?'latam_previsto_numero':null;
 if(!field)return false;
 const targets=[magazine.numero_publicacion,magazine.especial].map(clean).filter(Boolean);
 return String(article[field]||'').split(/[,;\n]+/).some(value=>{
  const text=clean(value);if(!text||text==='-')return false;
  return targets.some(target=>text===target||(/^\d+$/.test(target)&&text.match(/\d+/g)?.includes(target)));
 });
}
