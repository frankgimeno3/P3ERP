import {getPgPool} from '../../database/pgClient.js';
import {getMagazineManagement} from './GestionesProduccionRepository.js';
import {createFlatplan,mutateFlatplan,alignFlatplan} from '../../../app/lib/preliminaryFlatplan.js';

export function flatplanSources(contents, editorials=[]) {
 const grouped=new Map();for(const content of contents){if(!grouped.has(content.id_contenido))grouped.set(content.id_contenido,[]);grouped.get(content.id_contenido).push(content);}
 const sources=[];
 for(const [id,variants] of grouped) {
  const c=variants[0],editorial=editorials.find(e=>e.id_contenido===id);
  const spec=String(c.especificaciones_contenido||c.nombre_contenido||'').toUpperCase();
  const types=editorial||c.tipo_contenido==='articulo'||/^(ARTICULO|ARTÍCULO|PUBLIREP)/.test(spec)?['articulos']:c.tipo_contenido==='anuncio'?['anuncios']:/\+\s*ART/.test(spec)?['anuncios','articulos']:['anuncios'];
  for(const tipo of types) {
   const variant=variants.find(v=>v.tipo===tipo)||c;
   const materials=(variant.materiales||[]).filter(m=>m.fecha_aportado).map(m=>new Date(m.fecha_aportado).getTime()).filter(Number.isFinite);
   const raw=String((tipo==='articulos'?editorial?.paginas:'')||c.pagina_hoja||'');
   const explicit=String(tipo==='articulos'?editorial?.paginas||'':'').match(/^\s*(\d+)\s*(?:p[aá]g(?:inas?)?\.?)?\s*$/i);
   const numbered=raw.match(/\d+/g)||[];
   const specCount=spec.match(/(\d+)\s*PAG/);
   const cover=tipo==='anuncios'?/INT[.\s]*PORT|INTERIOR.*PORT/.test(spec)?'inside':/PORTADA/.test(spec)&&!/CONTRA/.test(spec)?'cover':null:null;
   const pages=cover?1:explicit?Number(explicit[1]):types.length>1?tipo==='articulos'?Math.max(1,numbered.length-Number(specCount?.[1]||1)):Number(specCount?.[1]||1):/DOBLE|P\.2\+P\.3/.test(spec)?2:specCount?Number(specCount[1]):numbered.length>1?numbered.length:1;
   const uncertain=!cover&&!explicit&&!/DOBLE|P\.2\+P\.3/.test(spec)&&(tipo==='articulos'&&types.length>1?numbered.length<=Number(specCount?.[1]||1):!specCount&&numbered.length===0);
   sources.push({id:`${id}:${tipo}`,contentId:id,type:tipo==='articulos'?'Artículo':'Anuncio',account:c.nombre_empresa||c.cliente_hoja||editorial?.empresa||'Sin cuenta',detail:editorial?.titulo||c.nombre_contenido||c.especificaciones_contenido||id,pages:Math.max(1,Math.min(100,pages)),uncertain,cover,arrival:materials.length?new Date(Math.min(...materials)).toISOString():null,sourceOrder:Number(c.datos_importacion?.fila||c.datos_importacion?.original?.sourceRow||editorial?.id||0),sourceNote:materials.length?'Fecha de recepción de materiales': 'Sin fecha de recepción: orden de la hoja importada',originalPages:raw});
  }
 }
 // Legacy editorial rows can exist without a production content ID. Include
 // them directly, merging only an unambiguous article for the same account.
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 for(const editorial of editorials.filter(e=>!e.id_contenido||!grouped.has(e.id_contenido))) {
  const company=normalize(editorial.empresa);
  const candidates=sources.filter(s=>s.type==='Artículo'&&company.length>=4&&(normalize(s.account).startsWith(company)||company.startsWith(normalize(s.account))));
  const count=String(editorial.paginas||'').match(/^\s*(\d+)\s*$/)?.[1];
  if(candidates.length===1){const s=candidates[0];s.detail=editorial.titulo||s.detail;if(count){if(s.pages!==Number(count))s.sourceNote+=` · Redacción indica ${count} páginas frente a ${s.pages} de la hoja; revisar extensión`;else s.uncertain=false;}continue;}
  sources.push({id:`redaccion:${editorial.id}`,contentId:editorial.id_contenido||`redaccion:${editorial.id}`,type:'Artículo',account:editorial.empresa||'Redacción',detail:editorial.titulo||'Artículo de redacción',pages:count?Math.min(100,Math.max(1,Number(count))):1,uncertain:!count,arrival:null,sourceOrder:Number(editorial.id),sourceNote:'Control de redacción · sin fecha de recepción: orden de registro',originalPages:String(editorial.paginas||'')});
 }
 return sources.sort((a,b)=>a.arrival&&b.arrival?a.arrival.localeCompare(b.arrival)||a.id.localeCompare(b.id):a.arrival?-1:b.arrival?1:a.sourceOrder-b.sourceOrder||a.id.localeCompare(b.id));
}
async function sourceData(id) {
 const data=await getMagazineManagement(id);if(!data)return null;
 const numberField=data.revista.region==='América'?'latam_previsto_numero':'espana_previsto_numero';
 const editorials=(await getPgPool().query(`SELECT * FROM produccion_control_redaccion WHERE id_contenido=ANY($1::text[]) OR (UPPER(revista)=UPPER($2) AND substring(${numberField} from '[0-9]+')=$3)`,[data.contenidos.map(c=>c.id_contenido),data.revista.sector,String(data.revista.numero_publicacion)])).rows;
 return {...data,sources:flatplanSources(data.contenidos,editorials)};
}
export async function getPreliminaryFlatplan(id, pool=getPgPool(), load=sourceData) {
 const data=await load(id);if(!data)return null;
 let stored=(await pool.query('SELECT plan,version FROM produccion_planillos_previos WHERE id_revista=$1',[id])).rows[0];
 if(!stored){await pool.query('INSERT INTO produccion_planillos_previos(id_revista,plan) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING',[id,JSON.stringify(createFlatplan(data.sources,Number(data.revista.num_paginas)||8))]);stored=(await pool.query('SELECT plan,version FROM produccion_planillos_previos WHERE id_revista=$1',[id])).rows[0];}
 const aligned=alignFlatplan(stored.plan);
 if(JSON.stringify(aligned)!==JSON.stringify(stored.plan)){
  const updated=await pool.query('UPDATE produccion_planillos_previos SET plan=$2::jsonb,version=version+1,updated_at=now() WHERE id_revista=$1 AND version=$3 RETURNING plan,version',[id,JSON.stringify(aligned),stored.version]);
  if(!updated.rowCount)return getPreliminaryFlatplan(id,pool,load);
  stored=updated.rows[0];
 }
 return {...stored,sources:data.sources};
}
export async function updatePreliminaryFlatplan(id,body, pool=getPgPool(), load=sourceData) {
 const data=await load(id);if(!data)return null;
 const db=await pool.connect();
 try {
  await db.query('BEGIN');
  const current=(await db.query('SELECT plan,version FROM produccion_planillos_previos WHERE id_revista=$1 FOR UPDATE',[id])).rows[0];
  if(!current||current.version!==body.version){const error=Error('El planillo ha cambiado. Recarga antes de continuar.');error.status=409;throw error;}
  const action={...body.action};
  if(action.type==='add'){const source=data.sources.find(s=>s.id===action.sourceId&&!s.cover);if(!source)throw Error('Selecciona un contenido válido de la revista.');action.block={...source,pages:Number(action.count),uncertain:false};}
  const plan=mutateFlatplan(current.plan,action);
  const updated=(await db.query('UPDATE produccion_planillos_previos SET plan=$2::jsonb,version=version+1,updated_at=now() WHERE id_revista=$1 RETURNING plan,version',[id,JSON.stringify(plan)])).rows[0];
  await db.query('COMMIT');return {...updated,sources:data.sources};
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
