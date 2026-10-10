import {redirect} from 'next/navigation';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams,query=new URLSearchParams();
 for(const [key,value] of Object.entries(params))if(value!==undefined)for(const v of Array.isArray(value)?value:[value])query.append(key,v);
 redirect('/dashboard/administracion/liquidaciones/tickets/anadir'+(query.size?'?'+query.toString():''));
}
