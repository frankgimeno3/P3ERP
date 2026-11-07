'use client';
import {useCallback,useEffect,useState} from 'react';
import apiClient from '@/app/apiClient';
import {productionPhaseName} from '@/app/lib/productionWorkflow';
import {contentPending} from '@/app/lib/productionManagement';
import ModuleTabs from '@/app/components/ModuleTabs';
import ManagementHeader from '../ManagementHeader';
import ProductionTable from '../ProductionTable';
export default function OtherManagementPage() {
 const [rows,setRows]=useState<any[]>([]),[groups,setGroups]=useState<any[]>([]),[group,setGroup]=useState('todos'),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async(signal?:AbortSignal)=>{try{const [r,g]=await Promise.all([apiClient.get('/api/v1/produccion/repositorio',{signal,params:{tipo:'pendientes-otros'}}),apiClient.get('/api/v1/produccion/repositorio',{signal,params:{tipo:'grupos'}})]);if(!signal?.aborted){setRows(r.data||[]);setGroups(g.data||[]);setError('');}}catch(e:any){if(!signal?.aborted)setError(e.message);}finally{if(!signal?.aborted)setLoading(false);}},[]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);return()=>c.abort();},[load]);
 const pending=rows.filter(row=>!row.es_revista&&!['revista','suscripcion'].includes(row.grupo_servicio)&&contentPending(row));
 const tabs=[...groups.filter(item=>!['revista','suscripcion','otros'].includes(item.id_medio)).map(item=>({value:item.id_medio,label:`${item.id_medio==='vidrioperfil_newsletter'?'Banner news':item.nombre_medio} (${pending.filter(row=>row.grupo_servicio===item.id_medio).length})`})),{value:'todos',label:`Todo (${pending.length})`},{value:'otros',label:`Otros (${pending.filter(row=>row.grupo_servicio==='otros').length})`}];
 return <main className="min-h-screen bg-gray-100 p-6 text-slate-900 lg:p-12"><ManagementHeader magazine={false}/>{error&&<p role="alert" className="mb-4 text-red-700">{error}</p>}{loading?<p role="status">Cargando contenidos…</p>:<><ModuleTabs plain label="Grupo de servicios" value={group} onChange={setGroup} items={tabs}/><section role="tabpanel" className="rounded-b-lg bg-white p-5"><ProductionTable key={group} rows={pending.filter(row=>group==='todos'||row.grupo_servicio===group).map(row=>({...row,fase_nombre:row.fase_nombre||productionPhaseName(row)}))} columns={ [['nombre_contenido','Contenido'],['nombre_servicio','Servicio'],['nombre_cuenta','Empresa'],['nombre_completo_agente','Agente'],['fase_nombre','Fase']] } href={row=>`/dashboard/produccion/repositorio/contenidos/${encodeURIComponent(row.id_contenido)}`}/></section></>}</main>;
}
