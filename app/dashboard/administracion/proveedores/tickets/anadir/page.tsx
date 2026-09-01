"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";

const dateValue=(d:string,m:string,y:string)=>`${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y}`;
export default function AnadirTicketPage(){
 const router=useRouter(), now=new Date();
 const [providers,setProviders]=useState<any[]>([]),[modal,setModal]=useState(false),[query,setQuery]=useState(""),[withProvider,setWithProvider]=useState(true),[provider,setProvider]=useState<any>(null),[file,setFile]=useState<File|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState("");
 const [form,setForm]=useState({day:String(now.getDate()),month:String(now.getMonth()+1),year:String(now.getFullYear()),custom:"",base:"",total:"",payment:""});
 useEffect(()=>{fetch("/api/v1/admin/proveedores").then(r=>r.json()).then(setProviders);},[]);
 useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==="Escape")setModal(false)};addEventListener("keydown",close);return()=>removeEventListener("keydown",close)},[]);
 async function submit(){
  if(!file||!form.day||!form.month||!form.year||(!provider&&withProvider)||(!withProvider&&!form.custom.trim())||form.base===""||form.total===""||!form.payment){setError("Completa todos los campos y adjunta el PDF.");return}
  setSaving(true);setError("");
  try{
   const presign=await fetch("/api/v1/mediateca/media/presign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({filename:file.name,contentType:file.type||"application/pdf",prefix:"tickets"})}).then(async r=>{if(!r.ok)throw new Error((await r.json()).message);return r.json()});
   const upload=await fetch(presign.uploadUrl,{method:"PUT",headers:{"Content-Type":file.type||"application/pdf"},body:file});if(!upload.ok)throw new Error("No se pudo subir el PDF.");
   const folderResponse=await fetch("/api/v1/mediateca/folders/by-path?path=tickets");const existingFolder=folderResponse.ok?await folderResponse.json():null;
   if(!existingFolder)await fetch("/api/v1/mediateca/folders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"tickets",path:""})});
   const mediaResponse=await fetch("/api/v1/mediateca/media",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mediaId:presign.mediaId,contentName:file.name,s3Key:presign.s3Key,cdnUrl:presign.cdnUrl,folderPath:"tickets",contentType:file.type||"application/pdf",type:"pdf"})});
   if(!mediaResponse.ok)throw new Error("El PDF se subió, pero no pudo registrarse en la mediateca.");
   const response=await fetch("/api/v1/admin/tickets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fecha_ticket:dateValue(form.day,form.month,form.year),id_proveedor:withProvider?provider?.id_proveedor:null,nombre_personalizado_proveedor:withProvider?"":form.custom,base_imponible:form.base,importe_total:form.total,forma_pago:form.payment,documento_src:presign.cdnUrl})});if(!response.ok)throw new Error((await response.json()).message);
   router.push("/dashboard/administracion/proveedores/tickets");
  }catch(e:any){setError(e.message||"No se pudo guardar.");setSaving(false)}
 }
 const filtered=providers.filter(p=>`${p.id_proveedor} ${p.nombre_proveedor}`.toLowerCase().includes(query.toLowerCase()));
 return <div className="min-h-screen bg-gray-100"><MiddleNav tituloprincipal="Añadir ticket"/><main className="mx-auto max-w-3xl p-6 lg:p-12"><section className="space-y-5 rounded-xl bg-white p-6 shadow">
  <label className="flex cursor-pointer items-center gap-3">Proveedor registrado <button type="button" role="switch" aria-checked={withProvider} onClick={()=>{setWithProvider(v=>!v);setProvider(null)}} className={`relative h-7 w-12 cursor-pointer rounded-full transition hover:ring-2 hover:ring-blue-200 ${withProvider?"bg-blue-950":"bg-gray-300"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${withProvider?"left-6":"left-1"}`}/></button>{withProvider?"Sí":"No"}</label>
  {withProvider?<button type="button" onClick={()=>setModal(true)} className="w-full cursor-pointer rounded border p-3 text-left transition hover:bg-blue-50">{provider?`${provider.nombre_proveedor} (${provider.id_proveedor})`:"Seleccionar proveedor"}</button>:<label className="block">Nombre personalizado<input value={form.custom} onChange={e=>setForm({...form,custom:e.target.value})} className="mt-1 w-full rounded border p-2"/></label>}
  <fieldset><legend>Fecha</legend><div className="mt-1 flex gap-2">{[["day","dd",2],["month","mm",2],["year","yyyy",4]].map(([key,label,max])=><input key={String(key)} aria-label={String(label)} maxLength={Number(max)} value={(form as any)[key]} onChange={e=>setForm({...form,[key]:e.target.value.replace(/\D/g,"")})} placeholder={String(label)} className="w-24 rounded border p-2"/>)}</div></fieldset>
  <div className="grid gap-4 sm:grid-cols-2"><label>Base imponible<input type="number" step="0.01" value={form.base} onChange={e=>setForm({...form,base:e.target.value})} className="mt-1 w-full rounded border p-2"/></label><label>Importe total<input type="number" step="0.01" value={form.total} onChange={e=>setForm({...form,total:e.target.value})} className="mt-1 w-full rounded border p-2"/></label></div>
  <label className="block">Forma de pago<input value={form.payment} onChange={e=>setForm({...form,payment:e.target.value})} className="mt-1 w-full rounded border p-2"/></label><label className="block">PDF<input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-1 block w-full cursor-pointer rounded border p-2 file:cursor-pointer"/></label>
  {error&&<p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}<button type="button" disabled={saving} onClick={submit} className="cursor-pointer rounded bg-blue-950 px-5 py-2 text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{saving?"Guardando...":"Guardar ticket"}</button>
 </section></main>
 {modal&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><div role="dialog" aria-modal="true" className="relative max-h-[80vh] w-full max-w-xl overflow-auto rounded-xl bg-white p-6"><button aria-label="Cerrar" type="button" onClick={()=>setModal(false)} className="absolute right-3 top-2 cursor-pointer text-3xl hover:text-blue-700">×</button><h2 className="mb-4 text-lg font-semibold text-blue-950">Seleccionar proveedor</h2><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar..." className="mb-3 w-full rounded border p-2"/><div className="space-y-2">{filtered.map(p=><button key={p.id_proveedor} type="button" onClick={()=>{setProvider(p);setModal(false)}} className="block w-full cursor-pointer rounded border p-3 text-left transition hover:bg-blue-50">{p.nombre_proveedor} · {p.id_proveedor}</button>)}</div></div></div>}
 </div>
}
