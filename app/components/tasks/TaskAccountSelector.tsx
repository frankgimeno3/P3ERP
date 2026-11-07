'use client';
import {useEffect,useState} from 'react';
import apiClient from '@/app/apiClient';
import SearchableSelect from '@/app/components/SearchableSelect';
export default function TaskAccountSelector({value,name,disabled,onChange}:{value:string;name?:string;disabled?:boolean;onChange:(id:string,name:string)=>void}){
 const [query,setQuery]=useState(''),[rows,setRows]=useState<any[]>([]),[error,setError]=useState('');
 useEffect(()=>{if(disabled)return;const c=new AbortController(),timer=setTimeout(()=>{apiClient.get('/api/v1/comercial/cuentas',{params:{limit:100,clienteFiltro:query},signal:c.signal}).then(r=>{if(!c.signal.aborted){setRows(old=>[...new Map([...old,...(Array.isArray(r.data)?r.data:r.data.rows||[])].map(row=>[row.id_cuenta,row])).values()]);setError('');}}).catch(()=>{if(!c.signal.aborted)setError('No se pudieron cargar las cuentas.');});},200);return()=>{c.abort();clearTimeout(timer);};},[query,disabled]);
 const options=rows.map(row=>({value:row.id_cuenta,label:row.nombre_empresa||row.id_cuenta}));if(value&&!options.some(row=>row.value===value))options.push({value,label:name||value});
 return <div><p className="mb-1 text-sm">Cuenta asociada</p><SearchableSelect label="Cuenta asociada" disabled={disabled} value={value||'__none__'} options={[{value:'__none__',label:'Sin cuenta'},...options]} onSearchChange={setQuery} onChange={id=>onChange(id==='__none__'?'':id,options.find(row=>row.value===id)?.label||'')}/>{error&&<p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}</div>;
}
