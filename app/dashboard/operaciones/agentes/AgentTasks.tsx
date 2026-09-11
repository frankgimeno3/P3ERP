'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Field, Form, Modal, Notice, request, useResource } from '../../direccion/laboral/components/ui';
import '../../direccion/laboral/laboral.css';
const states = {pendiente:'Pendiente',en_curso:'En curso',completada:'Completada',cancelada:'Cancelada'};
const path = (agent:string,id:string) => `/dashboard/operaciones/agentes/${agent}/tareas/${id}`;
function TaskForm({agent,initial,onSaved}:{agent:string;initial?:any;onSaved:()=>void}) {
  const [form,setForm]=useState({nombre:initial?.nombre||'',descripcion:initial?.descripcion||'',estado:initial?.estado||'pendiente'});
  return <Form onSave={async()=>{await request(`tareas-agentes${initial?`/${initial.id}`:''}`,initial?'PUT':'POST',{...form,agente:agent});onSaved();}}>
    <Field label="Nombre"><input required maxLength={250} value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/></Field>
    <Field label="Estado"><select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})}>{Object.entries(states).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
    <Field label="Descripción"><textarea value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})}/></Field>
  </Form>;
}
export default function AgentTasks({agent}:{agent:string}) {
  const {data,loading,error,reload}=useResource<any[]>(`tareas-agentes?empleado=${encodeURIComponent(agent)}`);
  const [adding,setAdding]=useState(false),[filters,setFilters]=useState({id:'',nombre:'',estado:'',descripcion:''});
  const rows=(data||[]).filter(r=>Object.entries(filters).every(([k,v])=>k==='estado'?!v||r[k]===v:String(r[k]||'').toLocaleLowerCase().includes(v.toLocaleLowerCase())));
  return <section className="laboral laboral-card"><header className="mb-4 flex justify-between"><h2 className="text-lg font-semibold">Tareas del agente</h2><button className="laboral-button" onClick={()=>setAdding(true)}>Crear tarea</button></header>
    <div className="mb-4 grid gap-3 md:grid-cols-4">{(['id','nombre','descripcion'] as const).map(k=><Field key={k} label={k==='id'?'ID':k==='nombre'?'Nombre':'Descripción'}><input value={filters[k]} onChange={e=>setFilters({...filters,[k]:e.target.value})}/></Field>)}<Field label="Estado"><select value={filters.estado} onChange={e=>setFilters({...filters,estado:e.target.value})}><option value="">Todos</option>{Object.entries(states).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field></div>
    <Notice error={error}/><div className="overflow-x-auto"><table><thead><tr><th>ID</th><th>Nombre</th><th>Agente</th><th>Estado</th><th>Descripción</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} tabIndex={0} data-interactive onClick={()=>window.location.assign(path(agent,r.id))} onKeyDown={e=>{if(e.key==='Enter')window.location.assign(path(agent,r.id));}}><td><Link href={path(agent,r.id)} className="cursor-pointer hover:underline">{r.id}</Link></td><td>{r.nombre}</td><td>{r.nombre_agente}</td><td>{states[r.estado as keyof typeof states]}</td><td className="whitespace-pre-wrap">{r.descripcion}</td></tr>)}</tbody></table></div>{loading?<p>Cargando tareas…</p>:!rows.length&&!error&&<p>No hay tareas para estos filtros.</p>}
    {adding&&<Modal title="Crear tarea" onClose={()=>setAdding(false)}><TaskForm agent={agent} onSaved={()=>{setAdding(false);reload();}}/></Modal>}
  </section>;
}
export function AgentTaskDetail({agent,id}:{agent:string;id:string}) {
  const {data,loading,error,reload}=useResource<any>(`tareas-agentes/${id}?empleado=${encodeURIComponent(agent)}`);
  return <main className="laboral p-6"><Link className="cursor-pointer hover:underline" href={`/dashboard/operaciones/agentes/${agent}?tab=tareas`}>Volver al agente</Link><Notice error={error}/>{loading?<p>Cargando…</p>:data&&!error&&<section className="laboral-card mt-4"><h1 className="text-xl font-semibold">{data.nombre}</h1><p className="mb-4">{data.id} · {data.nombre_agente}</p><TaskForm key={data.updated_at} agent={agent} initial={data} onSaved={reload}/></section>}</main>;
}
