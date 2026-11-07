'use client';
import Link from 'next/link';
import {useState} from 'react';
import apiClient from '@/app/apiClient';
import MaterialManageActions from './MaterialManageActions';
import {downloadContentMaterials} from '@/app/lib/productionDownloads';
const date=(value:string)=>value?new Date(value).toLocaleString('es-ES'):'Sin registrar';
export default function ProductionMaterials({content,materials,onRefresh}:{content:any;materials:any[];onRefresh:()=>Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const action=async(data:any)=>{setBusy(true);setError('');try{if(data.accion==='descargar')await downloadContentMaterials(content.id_contenido,data.ids,Boolean(data.zip));else await apiClient.post(`/api/v1/produccion/contenidos/${encodeURIComponent(content.id_contenido)}/materiales`,data);await onRefresh();}catch(e:any){setError(e.response?.data?.message||e.message||'No se pudo actualizar el material.');}finally{setBusy(false);}};
 const valid=materials.filter(m=>m.material_valido!==false);
 const btn='rounded border px-3 py-2 text-sm enabled:cursor-pointer enabled:hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50';
 return <><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy||!valid.length} onClick={()=>void action({accion:'marcar',ids:valid.map(m=>m.id_material),descargado:true})} className={btn}>Marcar todos como descargados</button><button type="button" disabled={busy||!valid.length} onClick={()=>void action({accion:'descargar',zip:true,ids:valid.map(m=>m.id_material)})} className={btn}>Descargar todos</button></div>
 {error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}<div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{materials.map(row=><article key={row.id_material} className={`space-y-3 rounded-lg border p-4 ${!row.descargado_produccion||row.material_valido===false?'border-red-200 bg-red-50':'border-gray-100'}`}>
  <Link href={`/dashboard/produccion/repositorio/materiales/${encodeURIComponent(row.id_material)}`} className="block cursor-pointer font-semibold text-blue-950 hover:underline">{row.nombre_material}</Link><p className="whitespace-pre-wrap text-sm text-slate-600">{row.descripcion_material||'Sin descripción'}</p>
  <dl className="space-y-1 text-xs text-slate-600"><div><dt className="inline">Subido a P3ERP: </dt><dd className="inline">{date(row.fecha_aportado||row.created_at)}</dd></div><div><dt className="inline">Agente de subida: </dt><dd className="inline">{row.nombre_agente_subida||row.agente_subida||'No registrado (histórico)'}</dd></div><div><dt className="inline">Descarga producción: </dt><dd className="inline">{date(row.fecha_descarga_produccion)}</dd></div></dl>
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={busy} checked={row.descargado_produccion} onChange={e=>void action({accion:'marcar',ids:[row.id_material],descargado:e.target.checked})} className="enabled:cursor-pointer enabled:hover:outline-blue-900"/>Descargado por producción</label>
  <p className={`text-xs ${row.material_valido===false?'font-semibold text-red-800':'text-slate-500'}`}>{row.material_valido===false?'Material no válido':!row.descargado_produccion?'Pendiente de descargar':'Descargado'}</p>
  <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className={btn} onClick={()=>void action({accion:'descargar',ids:[row.id_material]})}>Descargar</button>{row.tipo==='anuncios'&&row.material_valido!==false&&row.validacion_produccion!=='ok produccion'&&<button type="button" disabled={busy} className={btn} onClick={()=>void action({accion:'validar',ids:[row.id_material],valido:true})}>Validar material</button>}<button type="button" disabled={busy} className={btn} onClick={()=>void action({accion:'validar',ids:[row.id_material],valido:row.material_valido===false})}>{row.material_valido===false?'Marcar válido':'Marcar no válido'}</button></div>
  {row.tipo==='anuncios'&&row.validacion_produccion==='ok produccion'&&<p className="text-sm font-medium text-green-800">Validado por producción</p>}
  <MaterialManageActions contentId={content.id_contenido} material={row} onSaved={onRefresh}/>
 </article>)}</div>{!materials.length&&<p className="mt-4 text-sm text-slate-500">No hay materiales aportados.</p>}
 {(content.titulo_articulo||content.entradilla_articulo||content.texto_articulo)&&<div className={`mt-4 rounded border p-3 ${content.texto_revision_descargada<content.texto_revision?'border-red-200 bg-red-50':'border-gray-100'}`}><p className="text-sm">Texto del artículo · {content.texto_revision_descargada<content.texto_revision?'Cambios pendientes de recoger':'Recogido por producción'}</p><button type="button" disabled={busy||content.texto_revision_descargada>=content.texto_revision} onClick={()=>void action({accion:'texto-descargado'})} className={btn}>Marcar texto como recogido por producción</button></div>}
 </>;
}
