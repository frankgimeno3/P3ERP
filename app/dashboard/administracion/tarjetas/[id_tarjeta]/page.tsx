import {redirect} from 'next/navigation';
export default async function Page({params}:{params:Promise<{id_tarjeta:string}>}){redirect(`/dashboard/administracion/liquidaciones/tarjetas/${encodeURIComponent((await params).id_tarjeta)}`);}
