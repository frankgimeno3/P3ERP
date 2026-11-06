'use client';
import {useCallback,useEffect,useState} from 'react';
import apiClient from '@/app/apiClient';
import {contentPending} from '@/app/lib/productionManagement';
import ModuleTabs from '@/app/components/ModuleTabs';
import ManagementHeader from '../ManagementHeader';
import ProductionTable from '../ProductionTable';
export default function OtherManagementPage() {
 const [rows,setRows]=useState<any[]>([]),[groups,setGroups]=useState<any[]>([]),[group,setGroup]=useState('todos'),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async(signal?:AbortSignal)=>{try{const [r,g]=await Promise.all([apiClient.get('/api/v1/produccion/repositorio',{signal}),apiClient.get('/api/v1/produccion/repositorio',{signal,params:{tipo:'grupos'}})]);if(!signal?.aborted){setRows(r.data||[]);setGroups(g.data||[]);setError('');}}catch(e:any){if(!signal?.aborted)setError(e.message);}finally{if(!signal?.aborted)setLoading(false);}},[]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);return()=>c.abort();},[load]);
 const pending=rows.filter(row=>!row.es_revista&&row.grupo_servicio!=='revista'&&contentPending(row));
 return <main className="min-h-screen bg-gray-100 p-6 text-slate-900 lg:p-12"><ManagementHeader magazine={false}/>{error&&<p role="alert" className="mb-4 text-red-700">{error}</p>}{loading?<p role="status">Cargando contenidos…</p>:<><ModuleTabs plain label="Grupo de servicios" value={group} onChange={setGroup} items={[{value:'todos',label:`Todos (${pending.length})`},...groups.filter(item=>item.id_medio!=='revista').map(item=>({value:item.id_medio,label:`${item.nombre_medio} (${pending.filter(row=>row.grupo_servicio===item.id_medio).length})`}))]}/><section role="tabpanel" className="rounded-b-lg bg-white p-5"><ProductionTable key={group} rows={pending.filter(row=>group==='todos'||row.grupo_servicio===group)} columns={ [['nombre_contenido','Contenido'],['nombre_servicio','Servicio'],['nombre_cuenta','Empresa'],['nombre_completo_agente','Agente'],['estado_contenido','Estado']] } href={row=>`/dashboard/produccion/repositorio/contenidos/${encodeURIComponent(row.id_contenido)}`}/></section></>}</main>;
}
