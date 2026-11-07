'use client';
import {useCallback,useEffect,useState} from 'react';
export type DashboardRows={rows:any[];loading:boolean;error:string;refresh:()=>void};
export const dashboardCounter=(data:Pick<DashboardRows,'loading'|'error'>,count:number)=>data.loading?'…':data.error?'—':String(count);
export function useDashboardRows(load:()=>Promise<any>,enabled=true):DashboardRows{
 const [revision,setRevision]=useState(0),[state,setState]=useState({rows:[] as any[],loading:enabled,error:'',forLoad:null as null|(()=>Promise<any>),forRevision:-1});
 const refresh=useCallback(()=>setRevision(value=>value+1),[]);
 useEffect(()=>{if(!enabled)return;let active=true;setState(old=>({...old,loading:true,error:''}));Promise.resolve().then(load).then(rows=>{if(active)setState({rows:Array.isArray(rows)?rows:[],loading:false,error:'',forLoad:load,forRevision:revision});}).catch(error=>{if(active)setState({rows:[],loading:false,error:error.response?.data?.message||error.message||'No se pudieron cargar los datos.',forLoad:load,forRevision:revision});});return()=>{active=false;};},[load,enabled,revision]);
 useEffect(()=>{if(!enabled)return;window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[enabled,refresh]);
 return {rows:enabled?state.rows:[],error:enabled?state.error:'',loading:enabled&&(state.loading||state.forLoad!==load||state.forRevision!==revision),refresh};
}
