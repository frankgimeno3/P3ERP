'use client';
import {useEffect,useState} from 'react';
import apiClient from '@/app/apiClient';
import SearchableSelect from '@/app/components/SearchableSelect';
import DatePartsInput from '@/app/components/DatePartsInput';
import {articleStates,articleOwners,articleMagazines,articlePlacements,articleDestinations,articlePublicationStatus,normalizeArticleState,validateArticle} from '@/app/config/editorialArticle';
const input='mt-1 block w-full rounded border border-gray-300 bg-white p-2 disabled:bg-gray-100';
export default function NewArticleModal({onClose,onCreated,article}:{onClose:()=>void;onCreated:(row:any)=>void;article?:any}){
 const [data,setData]=useState<any>(()=>({...article,empresa:article?.empresa||'',id_cuenta:article?.id_cuenta||'',titulo:article?.titulo||'',estado:normalizeArticleState(article?.estado),responsable_correccion:articleOwners.find(v=>v.toLowerCase()===String(article?.responsable_correccion||'').toLowerCase())||'',revista:articleMagazines.find(v=>v.toLowerCase()===String(article?.revista||'').toLowerCase())||'',donde_esta:article?.donde_esta||'',pasado_produccion_dia:article?.pasado_produccion_dia||'',espana_previsto_numero:article?.espana_previsto_numero||'',latam_previsto_numero:article?.latam_previsto_numero||'',especial_numero:article?.especial_numero||'',hueco_previsto:article?.hueco_previsto||'',paginas:article?.paginas||'',publicaciones_estado:article?articlePublicationStatus(article):{},estado_publicacion_vidrioperfil:['sí','si','publicado'].includes(String(article?.estado_publicacion_vidrioperfil||'').toLowerCase())}));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[query,setQuery]=useState(''),[accounts,setAccounts]=useState<any[]>([]);
 const [accountChoice,setAccountChoice]=useState(article?.id_cuenta||(article?'__legacy__':''));
 useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[onClose]);
 useEffect(()=>{let active=true;const timer=setTimeout(()=>apiClient.get('/api/v1/comercial/cuentas',{params:{limit:100,clienteFiltro:query}}).then(response=>{if(active)setAccounts(Array.isArray(response.data)?response.data:response.data?.rows||[]);}).catch(()=>{if(active)setError('No se pudieron cargar las cuentas.');}),250);return()=>{active=false;clearTimeout(timer);};},[query]);
 const options=accounts.map(a=>({value:a.id_cuenta,label:a.nombre_empresa,searchText:a.id_cuenta}));
 if(data.id_cuenta&&!options.some(o=>o.value===data.id_cuenta))options.unshift({value:data.id_cuenta,label:data.empresa,searchText:data.id_cuenta});
 if(article&&!data.id_cuenta)options.unshift({value:'__legacy__',label:article.empresa,searchText:''});
 const save=async(event:React.FormEvent)=>{
  event.preventDefault();if(busy)return;setError('');
  try{validateArticle(data);setBusy(true);const response=article?await apiClient.patch('/api/v1/produccion/control-redaccion/'+article.id,data):await apiClient.post('/api/v1/produccion/control-redaccion',data);onCreated(response.data);}
  catch(e:any){setError(e.response?.data?.message||e.message||'No se pudo guardar el artículo.');}finally{setBusy(false);}
 };
 const published=(key:string,value:boolean)=>{
  const flags={...data.publicaciones_estado,[key]:value},destinations=articleDestinations(data),n=destinations.filter(d=>flags[d.key]).length;
  setData({...data,publicaciones_estado:flags,estado:n===destinations.length?'Publicado':n?'Parcialmente publicado':data.estado==='Publicado'||data.estado==='Parcialmente publicado'?'Pasado a Paco':data.estado});
 };
 return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="article-title" className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
  <button type="button" aria-label="Cerrar artículo" onClick={onClose} className="absolute right-3 top-2 cursor-pointer rounded px-2 text-2xl hover:bg-gray-100">×</button>
  <h2 id="article-title" className="mb-5 pr-8 text-xl font-semibold text-blue-950">{article?'Editar artículo':'Nuevo artículo'}</h2>
  <form onSubmit={save} className="space-y-4"><fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">
   <div><span className="mb-1 block text-sm">Cuenta *</span><SearchableSelect required label="Cuenta" options={options} value={accountChoice} onSearchChange={setQuery} onChange={id=>{setAccountChoice(id);setData({...data,id_cuenta:id==='__legacy__'?'':id,empresa:options.find(o=>o.value===id)?.label||''});}} disabled={busy}/>{article&&!data.id_cuenta&&<p className="mt-1 text-xs text-gray-500">Nombre del registro importado; puedes vincularlo a una cuenta.</p>}</div>
   <label>Título *<input required maxLength={2000} value={data.titulo} onChange={e=>setData({...data,titulo:e.target.value})} className={input}/></label>
   <label>Ubicación<input value={data.donde_esta} onChange={e=>setData({...data,donde_esta:e.target.value})} className={input}/></label>
   <DatePartsInput label="Pasado a producción día" value={data.pasado_produccion_dia} onChange={value=>setData({...data,pasado_produccion_dia:value})} disabled={busy}/>
   {([['estado','Estado',articleStates],['responsable_correccion','Responsable corrección',articleOwners],['revista','Portada',articleMagazines]] as const).map(([key,label,values])=><label key={key}>{label}<select required={key!=='revista'} value={data[key]} onChange={e=>setData({...data,[key]:e.target.value})} className={`${input} enabled:cursor-pointer enabled:hover:border-blue-950 disabled:cursor-default`}>{key==='responsable_correccion'&&<option value="">Selecciona responsable</option>}{values.map(value=><option key={value} value={value}>{value||'Sin portada'}</option>)}</select></label>)}
   <label>Páginas *<input required type="number" min="1" step="1" value={data.paginas} onChange={e=>setData({...data,paginas:e.target.value})} className={input}/></label>
   <p className="text-sm text-gray-600 md:col-span-2">Indica los números previstos. Separa varios números del mismo destino con comas.</p>
   {Object.entries(articlePlacements).map(([key,label])=><label key={key}>{label}<input maxLength={2000} value={data[key]} onChange={e=>setData({...data,[key]:e.target.value})} className={input}/></label>)}
   <div className="rounded border border-blue-200 bg-blue-50 p-3 md:col-span-2"><h3 className="mb-2 font-medium text-blue-950">Publicación por número previsto</h3>{articleDestinations(data).map(d=><label key={d.key} className="mb-2 flex cursor-pointer items-center gap-3 rounded p-1 hover:bg-white"><input type="checkbox" checked={!!data.publicaciones_estado[d.key]} onChange={e=>published(d.key,e.target.checked)} className="enabled:cursor-pointer disabled:cursor-default"/>{d.label}: publicado</label>)}<p className="text-xs text-gray-600">Si falta cualquier número previsto, seguirá pendiente como parcialmente publicado. Vidrioperfil se registra por separado.</p></div>
   <label className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-blue-50 md:col-span-2"><input type="checkbox" checked={data.estado_publicacion_vidrioperfil} onChange={e=>setData({...data,estado_publicacion_vidrioperfil:e.target.checked})} className="h-4 w-4 enabled:cursor-pointer disabled:cursor-default"/>Publicado en Vidrioperfil</label>
  </fieldset>{error&&<p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="cursor-pointer rounded border px-4 py-2 hover:bg-gray-100">Cancelar</button><button disabled={busy} className="rounded bg-blue-950 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-blue-900 disabled:cursor-default disabled:opacity-50">{busy?'Guardando…':article?'Guardar cambios':'Crear artículo'}</button></div></form>
 </section></div>;
}
