'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {api,button,CardEditor,CardTable,date} from './CardComponents';
export default function CardsPage(){
  const router=useRouter();
  const [cards,setCards]=useState<any[]>([]),[open,setOpen]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{api('/api/v1/admin/tarjetas').then(setCards).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
  return <main className="min-h-screen space-y-6 bg-gray-100 p-6 text-slate-900 lg:p-12"><header className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold">Tarjetas</h1><p className="mt-2 text-gray-600">Tickets, suscripciones y liquidaciones por banco.</p></div><button className={button} onClick={()=>setOpen(true)}>Nueva tarjeta</button></header>{error&&<p role="alert" className="text-red-700">{error}</p>}{loading?<p>Cargando tarjetas…</p>:<CardTable rows={cards.map(c=>({...c,proxima_liquidacion:date(c.proxima_liquidacion),periodicidad:`Cada ${c.periodicidad_meses} mes(es)`}))} columns={[{key:'codigo',label:'Código',render:c=><Link className="cursor-pointer text-blue-900 underline hover:text-blue-600" href={`/dashboard/administracion/tarjetas/${encodeURIComponent(c.id_tarjeta)}`}>{c.codigo}</Link>},{key:'nombre',label:'Nombre'},{key:'banco',label:'Banco'},{key:'ultimos_digitos',label:'Últimos dígitos'},{key:'periodicidad',label:'Periodicidad'},{key:'proxima_liquidacion',label:'Próxima liquidación'},{key:'estado',label:'Estado'}]}/>} {open&&<CardEditor close={()=>setOpen(false)} done={card=>router.push(`/dashboard/administracion/tarjetas/${encodeURIComponent(card.id_tarjeta)}`)}/>}</main>;
}
